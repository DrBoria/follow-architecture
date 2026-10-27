"use strict";

// Glob → regex and the naming-convention placeholder machinery shared by
// every entity that matches file paths (nodes, invariants, fileSpecs).

// Directories that never contain source code. A repo may add more via `ignoreDirs`.
const DEFAULT_IGNORE_DIRS = ["node_modules", ".git", ".vscode-test", "out", "dist", "build", "coverage"];
// Source extensions the CLI scans. Hardcoded: scan scope is a tool concern,
// not architecture (the yaml must not carry it).
const DEFAULT_EXTS = [".ts", ".tsx", ".js", ".jsx"];

// Brace expansion: `{a,b,c}` → alternation of the alternatives. Nested
// braces are not supported (no architecture needs them).
const expandBraces = (s) => {
	const open = s.indexOf("{");
	if (open === -1) return [s];
	const close = s.indexOf("}", open);
	if (close === -1) return [s];
	const prefix = s.slice(0, open);
	const suffix = s.slice(close + 1);
	const parts = s
		.slice(open + 1, close)
		.split(",")
		.map((p) => p.trim());
	const out = [];
	for (const p of parts) for (const rest of expandBraces(prefix + p + suffix)) out.push(rest);
	return out;
};

const globToRegex = (glob) => {
	let out = "";
	for (let i = 0; i < glob.length; i += 1) {
		const c = glob[i];
		if (c === "{") {
			const close = glob.indexOf("}", i);
			if (close !== -1) {
				const alts = expandBraces(glob.slice(i, close + 1)).map((a) => globToRegex(a));
				out += alts.length > 1 ? `(?:${alts.join("|")})` : alts[0];
				i = close;
				continue;
			}
		}
		if (c === "*" && glob[i + 1] === "*" && glob[i + 2] === "/") {
			out += "(?:.*/)?";
			i += 2;
		} else if (c === "*" && glob[i + 1] === "*") {
			out += ".*";
			i += 1;
		} else if (c === "*") {
			out += "[^/]*";
		} else if (c === "?") {
			out += "[^/]";
		} else if ("\\.+^$|()[]".includes(c)) {
			out += `\\${c}`;
		} else {
			out += c;
		}
	}
	return out;
};

// Naming-convention placeholders: {kebab-case}, {camelCase}, {PascalCase}
// compile to enforcing regexes; any other {name} compiles to [^/]+.
const PLACEHOLDER_RES = {
	"kebab-case": "[a-z0-9]+(?:-[a-z0-9]+)*",
	camelCase: "[a-z][a-zA-Z0-9]*",
	PascalCase: "[A-Z][a-zA-Z0-9]*",
};

const placeholderRe = (n) => PLACEHOLDER_RES[n] ?? "[^/]+";

const compilePattern = (pattern) => {
	const names = [];
	// Placeholder names use the same charset as node names ({kebab-case},
	// {camelCase}, {PascalCase}, …) so a where/forbid pattern captures the same
	// way a node child does. Known placeholders compile to their enforcing
	// regex; any other {name} compiles to [^/]+.
	const glob = String(pattern).replace(/\\/g, "/").replace(/\{([A-Za-z][A-Za-z0-9_-]*)\}/g, (_, n) => {
		names.push(n);
		return `\u0000${n}\u0000`;
	});
	const body = globToRegex(glob).replace(/\u0000([A-Za-z][A-Za-z0-9_-]*)\u0000/g, (_, n) => `(${placeholderRe(n)})`);
	return { re: new RegExp(`^${body}$`), names };
};

const checkRegex = (p, where) => {
	try {
		new RegExp(p);
	} catch (err) {
		throw new Error(`${where}: invalid pattern \`${p}\` — ${err.message}`);
	}
};

module.exports = { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS, globToRegex, expandBraces, PLACEHOLDER_RES, placeholderRe, compilePattern, checkRegex };

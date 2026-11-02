"use strict";

// Glob → regex and the naming-convention placeholder machinery shared by
// every entity that matches file paths (nodes, invariants, fileSpecs).

// Directories that never contain source code. A repo may add more via `ignoreDirs`.
const DEFAULT_IGNORE_DIRS = ["node_modules", ".git", ".vscode-test", "out", "dist", "build", "coverage"];
// Source extensions the TOOL scans by default. Scan scope is a tool concern, not
// architecture (the yaml must not carry it) — and it is an option, not a fact of
// the tool's code: `--ext <ext>` / the rule's `exts` add to this list.
// How much a folder has to look like a declared entity before a rule may offer it
// as a destination (see nodes/similar.js). A rule option; this is the default.
const DEFAULT_SIMILARITY = 0.6;

const DEFAULT_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".vue", ".svelte"];

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

// A placeholder is written IN the convention it asks for, so the convention is
// read off the name itself: `{kebab-case}` is kebab because it is spelled in
// kebab, and `{feature-name}` means the same thing for the same reason. There is
// no list of known conventions to keep in sync — add `{UPPER_CASE}`,
// `{snake_case}`, `{myCase}`, `{PascalCase}` and they all compile.
const CASES = {
	// lowercase, joined by dashes: `feature-name`
	kebab: "[a-z0-9]+(?:-[a-z0-9]+)*",
	// lowercase, joined by underscores: `feature_name`
	snake: "[a-z0-9]+(?:_[a-z0-9]+)*",
	// uppercase, joined by underscores: `FEATURE_NAME`
	screaming: "[A-Z0-9]+(?:_[A-Z0-9]+)*",
	// uppercase, joined by dashes: `FEATURE-NAME`
	screamingKebab: "[A-Z0-9]+(?:-[A-Z0-9]+)*",
	// one lowercase word, then capitals: `featureName`
	camel: "[a-z][a-zA-Z0-9]*",
	// a capitalised word: `FeatureName`, and `NAME`
	pascal: "[A-Z][a-zA-Z0-9]*",
};

const allMatch = (words, re) => words.length > 0 && words.every((w) => re.test(w));

// The convention a placeholder NAME states, or null when it states none (a
// single word with mixed case, a digit-only name, anything unrecognised) — then
// the placeholder still captures, it just enforces nothing.
const conventionOf = (name) => {
	const word = /^[A-Za-z0-9]+$/;
	if (name.includes("_")) {
		const words = name.split("_");
		if (allMatch(words, /^[A-Z0-9]+$/)) return CASES.screaming;
		if (allMatch(words, /^[a-z0-9]+$/)) return CASES.snake;

		return null;
	}
	if (name.includes("-")) {
		const words = name.split("-");
		if (allMatch(words, /^[a-z0-9]+$/)) return CASES.kebab;
		if (allMatch(words, /^[A-Z0-9]+$/)) return CASES.screamingKebab;

		return null;
	}
	if (/^[A-Z0-9]+$/.test(name)) return CASES.pascal;   // `NAME`, `ID2`
	if (/^[a-z0-9]+$/.test(name)) return CASES.kebab;    // `name` — kebab, snake and camel of one word agree
	if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return CASES.camel;   // `featureName`
	if (word.test(name)) return CASES.pascal;            // `FeatureName`

	return null;
};

const placeholderRe = (n) => conventionOf(n) ?? "[^/]+";

// What a placeholder looks like inside a path template: `{kebab-case}`,
// `{camelCase}`, `{UPPER_CASE}`, `{anything-you-like}`.
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9_-]*)\}/g;

// The regex BODY a path template compiles to, plus the placeholder names it
// captured — the ONE implementation of "placeholders inside a glob", shared by
// patterns, node paths and node children. A placeholder is swapped for a sentinel
// before the glob is compiled so its own characters survive, then put back as a
// capture group of the convention it asks for.
const patternBody = (pattern) => {
	const names = [];
	const glob = String(pattern).replace(/\\/g, "/").replace(PLACEHOLDER, (_, n) => {
		names.push(n);
		return `\u0000${n}\u0000`;
	});
	const body = globToRegex(glob).replace(/\u0000([A-Za-z][A-Za-z0-9_-]*)\u0000/g, (_, n) => `(${placeholderRe(n)})`);
	return { body, names };
};

const compilePattern = (pattern) => {
	const { body, names } = patternBody(pattern);
	return { re: new RegExp(`^${body}$`), names };
};

const checkRegex = (p, where) => {
	try {
		new RegExp(p);
	} catch (err) {
		throw new Error(`${where}: invalid pattern \`${p}\` — ${err.message}`);
	}
};

module.exports = {
	DEFAULT_EXTS,
	DEFAULT_SIMILARITY,
	DEFAULT_IGNORE_DIRS,
	globToRegex,
	conventionOf,
	placeholderRe,
	compilePattern,
	patternBody,
	PLACEHOLDER,
	expandBraces,
	checkRegex,
};

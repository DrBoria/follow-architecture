"use strict";

const { pipe, map, uniqueBy } = require("remeda");

const asReport = (r) => {
	if (r == null) return null;
	if (typeof r === "string" || typeof r === "function") return r;
	const out = {};
	if (r.level != null) out.level = String(r.level);
	if (r.message != null) out.message = r.message;
	if (r.fix != null) out.fix = r.fix;
	return Object.keys(out).length ? out : null;
};

const globToRegex = (glob) => {
	let out = "";
	for (let i = 0; i < glob.length; i += 1) {
		const c = glob[i];
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

const nodePrefixRe = (template) => {
	const names = [];
	const body = String(template)
		.replace(/\{([A-Za-z-]+)\}/g, (_, n) => {
			names.push(n);
			return "\u0000";
		})
		.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`)
		.replace(/\u0000/g, "([^/]+)");
	return { re: new RegExp(`^${body}/([^/]+)(?:/(.*))?$`), names };
};

const compilePattern = (pattern) => {
	const names = [];
	const glob = String(pattern).replace(/\\/g, "/").replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, n) => {
		names.push(n);
		return `\u0000${n}\u0000`;
	});
	const body = globToRegex(glob).replace(/\u0000([A-Za-z][A-Za-z0-9_]*)\u0000/g, "([^/]+)");
	return { re: new RegExp(`^${body}$`), names };
};

const compileChild = (name) => {
	const captures = [];
	const glob = String(name).replace(/\{([A-Za-z-]+)\}/g, (_, n) => {
		captures.push(n);
		return "\u0000";
	});
	const body = globToRegex(glob).replace(/\u0000/g, "([^/]+)");
	return { re: new RegExp(`^${body}$`), captures };
};

const checkRegex = (p, where) => {
	try {
		new RegExp(p);
	} catch (err) {
		throw new Error(`${where}: invalid pattern \`${p}\` — ${err.message}`);
	}
};

const FUNCTION_FORM = /^\s*(function\b|\(?\s*ctx\s*\)?\s*=>)/;

const compileWhen = (w) => {
	if (w == null) return null;
	if (typeof w === "function") return w;
	if (typeof w === "string") {
		if (FUNCTION_FORM.test(w)) return new Function("ctx", `"use strict"; return (${w})(ctx);`);
		return new Function("ctx", `"use strict"; return (${w});`);
	}
	return null;
};

const checkFile = (filePath, text, repoRoot, arch, project, siblings = []) => {
	const { buildContext, toRel } = require("./ast");
	const { checkTree } = require("./entities/nodes");
	const { checkInvariant } = require("./entities/invariants");
	const { findingFrom } = require("./report");
	const relPath = toRel(repoRoot, filePath);
	const ctx = buildContext(project, filePath, text, repoRoot, arch.aliases, siblings);
	ctx.arch = arch;
	const out = [];
	checkTree(relPath, arch, out, findingFrom);
	for (const inv of arch.invariants) checkInvariant(inv, ctx, {}, out, findingFrom);
	return pipe(out, uniqueBy((f) => f.key), map((f) => ({ ...f, file: relPath })));
};

module.exports = { asReport, nodePrefixRe, compilePattern, compileChild, checkRegex, compileWhen, checkFile };

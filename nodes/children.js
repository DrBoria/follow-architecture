"use strict";

// Node child handling: a child is either a plain string name or a
// `{ kind, name? }` matcher. `compileChild` turns a name into a regex with
// capture groups; `nodePrefixRe` turns a node path into a prefix matcher.
// Both live here because they are node-specific, not shared machinery.

const { globToRegex, PLACEHOLDER_RES, placeholderRe } = require("../utils/pattern");

const nodePrefixRe = (template) => {
	if (template === ".") return { re: /^([^/]+)(?:\/(.*))?$/, names: [], literalLen: 0, isFile: false };
	const names = [];
	let i = 0;
	const body = String(template)
		.replace(/\{([A-Za-z-]+)\}/g, (_, n) => {
			names.push(n);
			return "\u0000";
		})
		.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`)
		.replace(/\u0000/g, () => `(${placeholderRe(names[i++])})`);
	// A node whose path ends in a file extension is a FILE node: it matches
	// exactly that file, not a folder prefix. `literalLen` is the number of
	// fixed (non-placeholder) characters in the path — the specificity used
	// to rank matches (longer literal prefix wins).
	const isFile = /\.[A-Za-z0-9]+$/.test(String(template).split("/").pop());
	const literalLen = String(template).replace(/\{[A-Za-z-]+\}/g, "").length;
	if (isFile) return { re: new RegExp(`^${body}$`), names, literalLen, isFile: true };
	return { re: new RegExp(`^${body}/([^/]+)(?:/(.*))?$`), names, literalLen, isFile: false };
};

const compileChild = (name) => {
	const captures = [];
	let i = 0;
	const glob = String(name).replace(/\{([A-Za-z-]+)\}/g, (_, n) => {
		captures.push(n);
		return "\u0000";
	});
	const body = globToRegex(glob).replace(/\u0000/g, () => `(${placeholderRe(captures[i++])})`);
	// A child whose name ends in a file extension is a FILE child; `folder`
	// drives `findChild`, which matches `folder === !isFile`.
	const folder = !/\.[A-Za-z0-9]+$/.test(String(name).split("/").pop());
	return { re: new RegExp(`^${body}$`), captures, folder };
};

module.exports = { nodePrefixRe, compileChild };

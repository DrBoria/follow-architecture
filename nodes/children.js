"use strict";

// Node child handling: a child is either a plain string name or a
// `{ kind, name? }` matcher. `compileChild` turns a name into a regex with
// capture groups; `nodePrefixRe` turns a node path into a prefix matcher.
// Both live here because they are node-specific, not shared machinery.

const { patternBody, PLACEHOLDER, compilePattern } = require("../utils/pattern");

// What is DIRECTLY inside a folder, and how that compares to what the node
// declares there. One walk of the file list; every "is this folder an instance of
// that node?" question is answered from it.
const folderContents = (owner, folder, repoFiles) => {
	const present = new Set((repoFiles ?? []).filter((f) => f.startsWith(`${folder}/`)).map((f) => f.slice(folder.length + 1).split("/")[0]));
	const declared = owner.children ?? [];
	const has = (child) => [...present].some((name) => child.re.test(name));

	return {
		present,
		declared,
		anyDeclared: declared.some(has),
		missing: declared.filter((c) => c.required).filter((c) => !has(c)),
	};
};

// The node itself plus every declared parent, nearest first. A `required` child
// is declared on the folder that owns it, which is usually an ancestor of the
// deepest node that matched the file.
const ancestorChain = (node, arch) => {
	const chain = [];
	const seen = new Set();
	for (let cur = node; cur && !seen.has(cur.slug); cur = cur.parents?.length === 1 ? arch.nodes.bySlug?.[cur.parents[0]] ?? null : null) {
		seen.add(cur.slug);
		chain.push(cur);
	}
	return chain;
};

// Is this file inside a folder that declares `required` children it does not
// have — i.e. a folder that only looks like a node (a "feature" without its
// store)? Such a folder is not part of the architecture: nothing may be
// reported as belonging somewhere inside it.
const missingRequiredChild = (node, arch, rel, repoFiles, concreteFolder) => {
	for (const owner of ancestorChain(node, arch)) {
		const required = (owner.children ?? []).filter((c) => c.required);
		if (!required.length) continue;
		const folder = concreteFolder(owner.path, rel);
		if (!folder) continue;
		if (folderContents(owner, folder, repoFiles).missing.length) return true;
	}
	return false;
};

// The regex a node's OWN path matches as a folder — `apps/backend/{kebab-case}`
// → `(?/apps/backend/([^/]+)$`. This is the question "is this folder one of the
// places this node declares?", asked about the folder itself, without inventing
// a file name to stand inside it.
const nodePathRe = (template) => (template === "." ? /^([^/]+)$/ : compilePattern(template).re);

const nodePrefixRe = (template) => {
	if (template === ".") return { re: /^([^/]+)(?:\/(.*))?$/, names: [], literalLen: 0, isFile: false };
	const { body, names } = patternBody(template);
	// A node whose path ends in a file extension is a FILE node: it matches
	// exactly that file, not a folder prefix. `literalLen` is the number of
	// fixed (non-placeholder) characters in the path — the specificity used
	// to rank matches (longer literal prefix wins).
	const isFile = /\.[A-Za-z0-9]+$/.test(String(template).split("/").pop());
	const literalLen = String(template).replace(PLACEHOLDER, "").length;
	if (isFile) return { re: new RegExp(`^${body}$`), names, literalLen, isFile: true };
	return { re: new RegExp(`^${body}/([^/]+)(?:/(.*))?$`), names, literalLen, isFile: false };
};

// A child may declare which codeRole(s) live in it: one role, several roles (a
// file holding both a model and its types), or none. The NODE says where code
// lives — the codeRole says what code is, never where it goes.
const rolesOf = (spec) => {
	const raw = spec?.role;
	if (raw == null) return [];
	return (Array.isArray(raw) ? raw : [raw]).map(String).filter(Boolean);
};

const compileChild = (name) => {
	// A child is either a bare name or a spec `{ name?, node?, role?, required?, forbidden?, query?, report? }`.
	const spec = name && typeof name === "object" ? name : null;
	// `{ node: slug }` — the child IS another declared node: its own name
	// template and its own rules apply, so the parent does not repeat them.
	if (spec?.node) return { nodeSlug: String(spec.node), name: null, re: null, captures: [], folder: true, required: Boolean(spec.required), forbidden: Boolean(spec.forbidden), query: null, report: spec.report ?? null, roles: rolesOf(spec) };
	const { body, names: captures } = patternBody(String(spec ? spec.name : name));
	// A child whose name ends in a file extension is a FILE child; `folder`
	// drives `findChild`, which matches `folder === !isFile`.
	const folder = !/\.[A-Za-z0-9]+$/.test(String(spec ? spec.name : name).split("/").pop());
	// `required` — the child that makes the node real: a folder matched by the
	// node's template but lacking it is not an instance of that node.
	return {
		name: String(spec ? spec.name : name),
		re: new RegExp(`^${body}$`),
		captures,
		folder,
		required: Boolean(spec?.required),
		forbidden: Boolean(spec?.forbidden),
		// A child may be recognised by a QUERY over the file's facts instead of
		// (only) by its name — finally.js uses it to route a file that matches
		// the child's query but sits elsewhere.
		query: spec?.query ?? null,
		report: spec?.report ?? null,
		roles: rolesOf(spec),
	};
};

module.exports = { nodePathRe, nodePrefixRe, compileChild, folderContents, missingRequiredChild, ancestorChain, rolesOf };

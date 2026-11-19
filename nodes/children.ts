"use strict";

// Node child handling: a child is either a plain string name or a
// `{ kind, name? }` matcher. `compileChild` turns a name into a regex with
// capture groups; `nodePrefixRe` turns a node path into a prefix matcher.
// Both live here because they are node-specific, not shared machinery.

import { patternBody, PLACEHOLDER, compilePattern } from "../utils/pattern";
import type { Arch, ArchChild, ArchNode, ArchVariant, RawChild, RawChildSpec, RawNode } from "../entities/architecture";

// A regex that never matches: the placeholder `re` of a `{ node }` child before
// `buildTree` gives it the referenced node's own pattern. It is always replaced
// before anything reads it, but the type stays a `RegExp`.
const DETACHED = /(?!)/;

// What is DIRECTLY inside a folder, and how that compares to what the node
// declares there. One walk of the file list; every "is this folder an instance of
// that node?" question is answered from it.
type FolderContents = { present: Set<string>; declared: ArchChild[]; anyDeclared: boolean; missing: ArchChild[] };
const folderContents = (owner: ArchNode, folder: string, repoFiles: string[] | null | undefined): FolderContents => {
	const present = new Set((repoFiles ?? []).filter((f) => f.startsWith(`${folder}/`)).map((f) => f.slice(folder.length + 1).split("/")[0]));
	const declared = owner.children ?? [];
	const has = (child: ArchChild) => [...present].some((name) => child.re.test(name));

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
const ancestorChain = (node: ArchNode, arch: Arch): ArchNode[] => {
	const chain: ArchNode[] = [];
	const seen = new Set<string>();
	for (let cur: ArchNode | null = node; cur && !seen.has(cur.slug); cur = cur.parents.length === 1 ? arch.nodes.bySlug[cur.parents[0] ?? ""] ?? null : null) {
		seen.add(cur.slug);
		chain.push(cur);
	}
	return chain;
};

// Is this file inside a folder that declares `required` children it does not
// have — i.e. a folder that only looks like a node (a "feature" without its
// store)? Such a folder is not part of the architecture: nothing may be
// reported as belonging somewhere inside it.
type ConcreteFolder = (path: string, rel: string | null) => string | null | undefined;
type RequiredContext = { repoFiles: string[] | null | undefined; concreteFolder: ConcreteFolder };
const missingRequiredChild = (node: ArchNode, arch: Arch, rel: string, ctx: RequiredContext): boolean => {
	for (const owner of ancestorChain(node, arch)) {
		const required = (owner.children ?? []).filter((c) => c.required);
		if (!required.length) continue;
		const folder = ctx.concreteFolder(owner.path, rel);
		if (!folder) continue;
		if (folderContents(owner, folder, ctx.repoFiles).missing.length) return true;
	}
	return false;
};

// The regex a node's OWN path matches as a folder — `apps/backend/{kebab-case}`
// → `(?/apps/backend/([^/]+)$`. This is the question "is this folder one of the
// places this node declares?", asked about the folder itself, without inventing
// a file name to stand inside it.
const nodePathRe = (template: string): RegExp => (template === "." ? /^([^/]+)$/ : compilePattern(template).re);

type PrefixMatcher = Pick<ArchVariant, "re" | "names" | "literalLen" | "isFile">;
const nodePrefixRe = (template: string): PrefixMatcher => {
	if (template === ".") return { re: /^([^/]+)(?:\/(.*))?$/, names: [], literalLen: 0, isFile: false };
	const { body, names } = patternBody(template);
	// A node whose path ends in a file extension is a FILE node: it matches
	// exactly that file, not a folder prefix. `literalLen` is the number of
	// fixed (non-placeholder) characters in the path — the specificity used
	// to rank matches (longer literal prefix wins).
	const isFile = /\.[A-Za-z0-9]+$/.test(String(template).split("/").pop() ?? "");
	const literalLen = String(template).replace(PLACEHOLDER, "").length;
	if (isFile) return { re: new RegExp(`^${body}$`), names, literalLen, isFile: true };
	return { re: new RegExp(`^${body}/([^/]+)(?:/(.*))?$`), names, literalLen, isFile: false };
};

// A child may declare which codeRole(s) live in it: one role, several roles (a
// file holding both a model and its types), or none. The NODE says where code
// lives — the codeRole says what code is, never where it goes.
const rolesOf = (spec: { role?: string | string[] | null } | null | undefined): string[] => {
	const raw = spec?.role;
	if (raw == null) return [];
	return (Array.isArray(raw) ? raw : [raw]).map(String).filter(Boolean);
};

// `{ node: slug }` — the child IS another declared node.
const referencedChild = (spec: RawChildSpec): ArchChild => ({ nodeSlug: String(spec.node), name: null, re: DETACHED, captures: [], folder: true, required: Boolean(spec.required), forbidden: Boolean(spec.forbidden), query: null, report: spec.report ?? null, roles: rolesOf(spec) });

// A child named by a pattern: a FILE child (extension) or a FOLDER child.
const childOf = (rawName: string, spec: RawChildSpec | null): ArchChild => {
	const { body, names: captures } = patternBody(rawName);
	const folder = !/\.[A-Za-z0-9]+$/.test(rawName.split("/").pop() ?? "");
	return {
		name: rawName,
		re: new RegExp(`^${body}$`),
		captures,
		folder,
		required: Boolean(spec?.required),
		forbidden: Boolean(spec?.forbidden),
		nodeSlug: null,
		// A child may be recognised by a QUERY over the file's facts instead of
		// (only) by its name — finally.js uses it to route a file that matches
		// the child's query but sits elsewhere.
		query: spec?.query ?? null,
		report: spec?.report ?? null,
		roles: rolesOf(spec),
	};
};

const compileChild = (name: RawChild): ArchChild => {
	// A child is either a bare name or a spec `{ name?, node?, role?, required?, forbidden?, query?, report? }`.
	const spec: RawChildSpec | null = name && typeof name === "object" ? name : null;
	if (spec?.node) return referencedChild(spec);
	return childOf(String(spec ? spec.name : name), spec);
};

export { nodePathRe, nodePrefixRe, compileChild, folderContents, missingRequiredChild, ancestorChain, rolesOf };
export type { ConcreteFolder };

// `RawNode`/`RawChild` are re-exported for callers that build raw configs.
export type { RawNode, RawChild };

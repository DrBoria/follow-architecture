"use strict";

// Nodes → path variants (one per parent) + the role homes they imply.

import { nodePrefixRe, compileChild, rolesOf } from "../../nodes/children";
import { SCHEMA } from "../schema";
import { keyedDefs } from "../../utils/keyed";
import * as configError from "../../report/configErrors";
import type { ArchChild, ArchNode, ArchNodes, ArchVariant, ArchClaim, RawNode, RawNodes, RoleHome } from "../architecture";

// A regex that never matches — the placeholder `re` of a node before its path is
// resolved. Overwritten in the same pass that computes the real one.
const NEVER = /(?!)/;

// A node's declared parent(s) as a list; the root is `[null]`.
const parentsOf = (parent: string | string[] | null | undefined): (string | null)[] => {
	if (Array.isArray(parent)) return parent;
	return parent ? [parent] : [null];
};

type PathBearing = Pick<RawNode, "parent" | "name">;
const variantsOf = (n: PathBearing, parentPaths: Record<string, string>): ArchVariant[] =>
	parentsOf(n.parent).map((p) => {
		const base = p == null ? null : parentPaths[p];
		const path = base == null || base === "." ? n.name : `${base}/${n.name}`;
		const { re, names, literalLen, isFile } = nodePrefixRe(path);
		return { path, re, names, literalLen, isFile };
	});

const NODE_KEYS = new Set(SCHEMA.node);

const make = (n: RawNode): ArchNode => {
	for (const key of Object.keys(n)) {
		if (NODE_KEYS.has(key)) continue;
		throw configError.unknownNodeKey({ node: n.slug, key, allowed: SCHEMA.node });
	}
	return {
		slug: n.slug ?? "",
		name: n.name,
		parent: n.parent,
		parents: parentsOf(n.parent),
		children: (n.children ?? []).map(compileChild),
		// `role:` on the node itself = the whole folder is that code (its `**`).
		roles: rolesOf(n),
		report: n.report,
		variants: [],
		path: "",
		re: NEVER,
		prefixRe: NEVER,
		prefixNames: [],
		literalLen: 0,
		isFile: false,
	};
};

// The list-or-map walk is the shared `keyedDefs` core; a node def is what the
// tree validates afterwards.
const listOf = (nodes: RawNodes | null | undefined): RawNode[] => keyedDefs(nodes).filter((n): n is RawNode => n != null);

const indexBySlug = (all: ArchNode[]): Record<string, ArchNode> => Object.fromEntries(all.map((n): [string, ArchNode] => [n.slug, n]));

const validateParents = (all: ArchNode[], bySlug: Record<string, ArchNode>): void => {
	for (const n of all) {
		for (const p of n.parents) {
			if (p != null && !bySlug[p]) throw configError.unknownNodeParent({ node: n.slug, parent: p });
		}
	}
};

// Resolve every node's path variants (one per declared parent).
const resolveVariants = (all: ArchNode[], bySlug: Record<string, ArchNode>): void => {
	const resolvedPath: Record<string, string> = {};
	const resolvePath = (n: ArchNode): string => {
		if (resolvedPath[n.slug] != null) return resolvedPath[n.slug];
		const parentPaths: Record<string, string> = {};
		for (const p of n.parents) if (p != null) parentPaths[p] = resolvePath(bySlug[p]);
		n.variants = variantsOf(n, parentPaths);
		resolvedPath[n.slug] = n.variants[0].path;
		return resolvedPath[n.slug];
	};
	for (const n of all) resolvePath(n);
};

// `{ node: slug }` children borrow the referenced node's own name template.
const resolveNodeChildren = (all: ArchNode[], bySlug: Record<string, ArchNode>): void => {
	for (const n of all) {
		for (const child of n.children) {
			if (!child.nodeSlug) continue;
			const target = bySlug[child.nodeSlug];
			if (!target) throw configError.unknownNodeChild({ node: n.slug, child: child.nodeSlug });
			const compiled = compileChild(target.name);
			child.re = compiled.re;
			child.captures = compiled.captures;
			child.name = target.name;
			child.folder = compiled.folder;
			if (!child.roles?.length) child.roles = target.roles ?? [];
		}
	}
};

// A node's `role:` covers any child that names no role of its own.
const propagateRoles = (all: ArchNode[]): void => {
	for (const n of all) {
		if (!n.roles?.length) continue;
		for (const c of n.children) {
			if (c.nodeSlug || c.roles?.length) continue;
			c.roles = n.roles;
		}
	}
};

// Copy each node's FIRST variant onto the node for direct access.
const assignPrimary = (all: ArchNode[]): void => {
	for (const n of all) {
		const v0 = n.variants[0];
		n.path = v0.path;
		n.re = v0.re;
		n.prefixRe = v0.re;
		n.prefixNames = v0.names;
		n.literalLen = v0.literalLen;
		n.isFile = v0.isFile;
	}
};

// The role homes: a node that declares `role:` IS that code.
const addHome = (roleHomes: Record<string, RoleHome[]>, role: string, template: string, nodeSlug: string | null): void => {
	const list = (roleHomes[role] ??= []);
	if (!list.some((h) => h.template === template)) list.push({ template, node: nodeSlug });
};

const ownHomeTemplate = (v: ArchVariant): string => (v.isFile ? v.path : `${v.path === "." ? "" : `${v.path}/`}**`);

const variantBasePath = (v: ArchVariant, child: ArchChild): string => (v.path === "." ? child.name ?? "" : `${v.path}/${child.name}`);

const childBases = (n: ArchNode, child: ArchChild, bySlug: Record<string, ArchNode>): { path: string; node: string | null }[] => {
	if (child.nodeSlug) return (bySlug[child.nodeSlug]?.variants ?? []).map((v) => ({ path: v.path, node: child.nodeSlug }));
	return n.variants.map((v) => ({ path: variantBasePath(v, child), node: n.slug }));
};

const addChildHomes = (roleHomes: Record<string, RoleHome[]>, n: ArchNode, child: ArchChild, bySlug: Record<string, ArchNode>): void => {
	for (const base of childBases(n, child, bySlug)) {
		// A folder child owns everything below it; a file child only itself.
		const template = child.folder ? `${base.path}/**` : base.path;
		for (const role of child.roles) addHome(roleHomes, role, template, base.node);
	}
};

const buildRoleHomes = (all: ArchNode[], bySlug: Record<string, ArchNode>): Record<string, RoleHome[]> => {
	const roleHomes: Record<string, RoleHome[]> = {};
	for (const n of all) {
		if (!n.roles?.length) continue;
		for (const v of n.variants) for (const role of n.roles) addHome(roleHomes, role, ownHomeTemplate(v), n.slug);
	}
	for (const n of all) {
		for (const child of n.children) {
			if (!child.roles?.length) continue;
			addChildHomes(roleHomes, n, child, bySlug);
		}
	}
	return roleHomes;
};

// The literal (fixed) folder-child names a parent declares — the values a
// `{kebab-case}` position is locked to.
const literalClaims = (parent: ArchNode): string[] => {
	const names = new Map<string, boolean>();
	for (const c of parent.children ?? []) {
		if (c.nodeSlug || !c.name || /\{[^}]+\}/.test(c.name)) continue;
		if (!c.folder) continue;
		names.set(c.name, true);
	}
	return [...names.keys()];
};

// The nearest ancestor whose name is a placeholder under a literal parent.
const findFuzzyRoot = (n: ArchNode, bySlug: Record<string, ArchNode>): ArchNode | null => {
	let cur: ArchNode | null = n;
	const seen = new Set<string>();
	while (cur && !seen.has(cur.slug)) {
		seen.add(cur.slug);
		const parent: ArchNode | null = cur.parents[0] ? bySlug[cur.parents[0]] ?? null : null;
		if (/\{[^}]+\}/.test(cur.name) && parent && !/\{[^}]+\}/.test(parent.name)) return cur;
		cur = parent;
	}
	return null;
};

// Lock every variant that sits under the fuzzy root to the parent's literal
// child names at the placeholder position.
const applyClaimsToSharers = (all: ArchNode[], fuzzyRoot: ArchNode, index: number, claims: ArchClaim[]): void => {
	for (const n2 of all) {
		const shares = n2.variants.some((v) => v.path === fuzzyRoot.path || v.path.startsWith(`${fuzzyRoot.path}/`));
		if (!shares) continue;
		for (const v of n2.variants) {
			if (!v.names[index]) continue;
			v.claims = [...(v.claims ?? []), ...claims];
		}
	}
};

const applyClaims = (all: ArchNode[], bySlug: Record<string, ArchNode>): void => {
	for (const n of all) {
		const fuzzyRoot = findFuzzyRoot(n, bySlug);
		if (!fuzzyRoot) continue;
		const parent = bySlug[fuzzyRoot.parents[0] ?? ""];
		const values = literalClaims(parent);
		if (!values.length) continue;
		const index = fuzzyRoot.name.split("/").findIndex((seg) => /^\{[^}]+\}$/.test(seg));
		if (index < 0) continue;
		applyClaimsToSharers(all, fuzzyRoot, index, values.map((value) => ({ index, value })));
	}
};

const buildTree = (nodes: RawNodes | null | undefined): ArchNodes => {
	const all = listOf(nodes).map(make);
	const bySlug = indexBySlug(all);
	validateParents(all, bySlug);
	resolveVariants(all, bySlug);
	resolveNodeChildren(all, bySlug);
	propagateRoles(all);
	assignPrimary(all);
	const roleHomes = buildRoleHomes(all, bySlug);
	applyClaims(all, bySlug);
	const roots = all.filter((n) => !n.parents[0]);
	return { all, bySlug, roots, roleHomes };
};

export { buildTree, variantsOf };

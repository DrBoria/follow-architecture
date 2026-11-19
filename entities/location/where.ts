"use strict";

// THE `where` GRAMMAR — one implementation of "here" / "by this code", shared by
// node `role:` homes, codeRole actions and invariant `where`/`except`.
//
// An entry is one of:
//   { role }        code that IS that role (its file declares it)
//   { role, same }  …and in the SAME node instance as the target
//   { node }        any file under that declared node
//   { template }    a path built from the tree (role homes)
//   "glob"          a path pattern
//   { <filter> }    any filter over the file's facts

import { compilePattern } from "../../utils/pattern";
import { matchNode, deepestMatch } from "../tree/match";
import { matches, isObj } from "../queries";
import { dirOf } from "./place";
import { toList, type FieldValue } from "../../utils/field";
import type { Arch, QueryFilter, QueryScope, WhereEntry, WhereType } from "../architecture";
import type { FileFacts } from "../facts";

// The query engine, taken through a typed view so this module never meets an
// `any` at the call site. `queries` requires the location module for `location`,
// so it is referenced lazily.
type MatchFn = (value: FieldValue, filter: QueryFilter, scope: QueryScope) => boolean;
const queryMatcher = (): MatchFn => matches;

type Caps = Record<string, string | undefined>;
type ObjEntry = { readonly [key: string]: FieldValue };

const readObjEntry = (entry: ObjEntry): WhereEntry => {
	if (entry.role != null) return { type: "role", role: String(entry.role), same: Boolean(entry.same), via: entry.via === "import" ? "import" : null };
	if (entry.node != null) return { type: "node", node: String(entry.node) };
	if (entry.template != null) return { type: "template", template: String(entry.template) };
	return { type: "query", query: entry };
};

// Normalize one entry. `roles` (a Set of declared slugs) lets a bare string that
// names a role become a role reference; without it every string is a glob.
const parseWhereEntry = (entry: FieldValue, roles: Set<string> | null = null): WhereEntry => {
	if (typeof entry === "string") return roles?.has(entry) && !entry.includes("/") && !entry.includes("*") ? { type: "role", role: entry, same: false } : { type: "glob", glob: entry };
	if (!isObj(entry)) return { type: "query", query: entry };
	return readObjEntry(entry);
};

const parseWhere = (value: FieldValue | null | undefined, roles: Set<string> | null = null): WhereEntry[] => toList(value).map((e) => parseWhereEntry(e, roles));

const patternOf = (entry: WhereEntry): string | null => {
	if (entry.type === "glob") return entry.glob ?? null;
	if (entry.type === "template") return entry.template ?? null;
	return null;
};

// Does the path match the pattern, and do its captures agree with the target's?
const capsAgree = (pattern: string, rel: string, targetCaps: Caps | null): boolean => {
	const { re, names } = compilePattern(pattern);
	const m = re.exec(rel);
	if (!m) return false;
	if (!targetCaps) return true;
	for (let i = 0; i < names.length; i += 1) {
		if (names[i] in targetCaps && m[i + 1] !== targetCaps[names[i]]) return false;
	}
	return true;
};

const sameCaps = (source: Caps, target: Caps | null): boolean => {
	for (const [name, value] of Object.entries(target ?? {})) {
		if (!(name in source) || source[name] !== value) return false;
	}
	return true;
};

// `{ role }` — the file declares that role, and (for `same`) in the SAME node.
const matchesRole = (...args: [entry: WhereEntry, rel: string, arch: Arch, facts: FileFacts | null | undefined, targetCaps: Caps | null]): boolean => {
	const [entry, rel, arch, facts, targetCaps] = args;
	if (!(facts?.roles ?? []).includes(entry.role ?? "")) return false;
	if (!entry.same) return true;
	const nodeM = deepestMatch(rel, arch);
	return sameCaps(nodeM ? matchNode(nodeM.node, rel)?.caps ?? {} : {}, targetCaps);
};

// `{ node }` — the path is inside that declared node.
const matchesNodeEntry = (entry: WhereEntry, rel: string, arch: Arch): boolean => {
	const node = arch.nodes.bySlug[entry.node ?? ""];
	if (!node) return false;
	return node.variants.some((v) => v.re.test(rel));
};

// Does this entry designate `rel` for a file with these facts?
const matchesWhere = (...args: [entry: WhereEntry | null | undefined, rel: string, arch: Arch, facts: FileFacts | null | undefined, targetCaps?: Caps | null]): boolean => {
	const [entry, rel, arch, facts, targetCaps = null] = args;
	if (!entry) return false;
	const pattern = patternOf(entry);
	if (pattern != null) return capsAgree(pattern, rel, targetCaps);
	if (entry.type === "role") return matchesRole(entry, rel, arch, facts, targetCaps);
	if (entry.type === "node") return matchesNodeEntry(entry, rel, arch);
	// The scope IS the facts (plus the file and the tree), so a `$ref` can compare
	// one fact with another.
	return queryMatcher()(facts ?? {}, entry.query, { ...(facts ?? {}), arch, fileRel: rel });
};

// `true` when NO entry allows it.
const checkWhere = (...args: [entries: WhereEntry[] | null | undefined, rel: string, arch: Arch, facts: FileFacts | null | undefined, targetCaps?: Caps | null]): boolean => {
	const [entries, rel, arch, facts, targetCaps = null] = args;
	for (const entry of entries ?? []) if (matchesWhere(entry, rel, arch, facts, targetCaps)) return false;

	return true;
};

// How code is reached through a declared accessor without an import.
const accessorLabel = (e: { scope?: string | null; segments?: string[] | null } | null | undefined): string => (e?.scope === "function" || e?.scope === "method" ? `${(e.segments ?? []).join(".")}(…)` : (e?.segments ?? []).join("."));

const kindOf = (entry: WhereEntry): WhereType | null => {
	if (entry.type) return entry.type;
	if (entry.role) return "role";
	if (entry.node) return "node";
	if (entry.glob) return "glob";
	if (entry.template) return "template";
	return null;
};

const orText = (value: string | undefined, fallback: string): string => value ?? fallback;

const roleLabel = (entry: WhereEntry): string => `role ${orText(entry.role, "")}${entry.same ? " (same instance)" : ""}`;

// How one `where` entry reads inside a sentence — the ONE place that knows the
// entry vocabulary.
const labelOf = (entry: WhereEntry | null | undefined): string => {
	if (!entry) return "—";
	const kind = kindOf(entry);
	if (kind === "role") return roleLabel(entry);
	if (kind === "node") return `node ${orText(entry.node, "")}`;
	if (kind === "glob") return orText(entry.glob, "—");
	if (kind === "template") return orText(entry.template, "—");

	return "filter";
};

const placeholderName = (seg: string): string | null => /^\{([^}]+)\}$/.exec(seg)?.[1] ?? null;
const tailOf = (seg: string): string | null => /\{[^}]+\}([^{]*)$/.exec(seg)?.[1] ?? null;
const lastOf = (relSegs: string[]): string | undefined => relSegs[relSegs.length - 1];

// A segment that is a placeholder PLUS a fixed tail (`{kebab-case}.ts`).
const resolveTail = (seg: string, relSegs: string[], tail: string): string => {
	const own = lastOf(relSegs);
	return own && own !== seg && own.endsWith(tail) ? own : seg;
};

// A glob segment (`*.d.ts`) names a FAMILY; the destination is this file's own
// name in that family.
const resolveGlob = (seg: string, relSegs: string[]): string => {
	const own = lastOf(relSegs);
	const suffix = seg.slice(seg.indexOf("*") + 1);
	const stem = own ? own.replace(/\.[^.]*$/, "") : null;
	return stem ? `${stem}${suffix}` : seg;
};

// One template segment resolved against the file's own path.
const resolveSegment = (seg: string, i: number, relSegs: string[], caps: Caps | null): string => {
	const whole = placeholderName(seg);
	if (whole != null) {
		const filled = caps?.[whole];
		if (filled != null) return filled;
		return relSegs[i] ?? seg;
	}
	const tail = tailOf(seg);
	if (tail != null) return resolveTail(seg, relSegs, tail);
	if (seg.includes("*")) return resolveGlob(seg, relSegs);
	return seg;
};

// A declared template resolved to a concrete path. ONE implementation, used by
// every caller that needs "where does this template point for THIS file".
const fillTemplate = (template: string | null | undefined, rel: string | null = null, caps: Caps | null = null): string | null => {
	if (template == null) return null;
	const segs = String(template).split("/");
	const relSegs = String(rel ?? "").split("/").filter(Boolean);
	const out: string[] = [];
	for (let i = 0; i < segs.length; i += 1) {
		const seg = segs[i];
		if (seg === "**") break;
		out.push(resolveSegment(seg, i, relSegs, caps));
	}

	return out.join("/") || dirOf(rel);
};

const templateOf = (entry: WhereEntry, arch: Arch): string | null => {
	if (entry.type === "node") return arch.nodes.bySlug[entry.node ?? ""]?.path ?? null;
	return entry.template ?? entry.glob ?? null;
};

// The concrete PLACE an entry designates for this file.
const entryKey = (entry: WhereEntry, rel: string, arch: Arch, facts: FileFacts | null | undefined): string | null => {
	if (!matchesWhere(entry, rel, arch, facts ?? null, null)) return null;
	const fileDir = dirOf(rel);
	const template = templateOf(entry, arch);
	const filled = fillTemplate(template, rel);
	if (filled == null) return fileDir;
	// A template that names a FAMILY (`…/actions/*.ts`) designates the folder the
	// family lives in.
	const star = String(template).split("/").findIndex((s) => s.includes("*"));
	if (star === -1) return filled;

	return filled.split("/").slice(0, star).join("/") || fileDir;
};

export { toList, parseWhereEntry, parseWhere, matchesWhere, checkWhere, accessorLabel, labelOf, fillTemplate, entryKey };
export type { Caps };

"use strict";

// WHERE a piece of code is, and WHERE a rule points — one vocabulary, one
// implementation, used by both sides:
//
//   • `matchesLocation(value, entry, { arch }, asFilter)` — the `location:`
//     FILTER: "is this candidate / file / edge at that place?" (`"glob"`,
//     `{ node }`, `{ role }`, or a query over the location itself).
//   • `resolveLocation(arch, location, rel)` — the `fix.location` of a REPAIR:
//     the place AND the box it is, for this file, asked of the tree.
//
// This module owns the filter and the repair resolution; the three halves of the
// "where" vocabulary live in sibling modules and are re-exported here, so every
// consumer keeps importing `entities/location`:
//   • `./location/place` — ONE PATH, cut into its parts;
//   • `./location/where` — the `where` grammar (roles / nodes / globs / filters);
//   • `./location/homes` — the role → place answer.

import { compilePattern } from "../utils/pattern";
import { folderOwner } from "./tree";
import { isObj } from "./queries";
import { dirOf } from "./location/place";
import { homeForRole, placeFor } from "./location/homes";
import type { FieldValue } from "../utils/field";
import type { Arch, QueryScope, ScopeValue, WhereEntry } from "./architecture";

// The place a value names: a candidate's `location`, a file fact, or a bare path.
const locationOf = (value: FieldValue): FieldValue => (isObj(value) && value.location != null ? value.location : value);

const pathOf = (loc: FieldValue): string | null => {
	if (typeof loc === "string") return loc;
	if (isObj(loc) && typeof loc.path === "string") return loc.path;
	return null;
};

// The `arch` carried in a scope: a plain-data record may hold anything readable,
// but `arch` is the built model (compiled regexes), so it is recognised apart.
const isArch = (v: ScopeValue): v is Arch => v != null && typeof v === "object" && "nodes" in v && "codeRoles" in v;
const isScopeRecord = (scope: QueryScope): scope is { readonly [key: string]: ScopeValue } => scope !== null && scope !== undefined && typeof scope === "object" && !Array.isArray(scope);
const archOf = (scope: QueryScope): Arch | null => {
	if (!isScopeRecord(scope)) return null;
	const a = scope.arch;
	return isArch(a) ? a : null;
};

type AsFilter = (loc: FieldValue, entry: FieldValue) => boolean;

const pathInNode = (arch: Arch | null, nodeSlug: string, itemPath: string): boolean => {
	const node = arch?.nodes.bySlug[nodeSlug];
	if (!node) return false;
	return node.variants.some((v) => v.re.test(itemPath));
};

const pathInRole = (arch: Arch | null, role: string, itemPath: string): boolean => (arch?.nodes.roleHomes[role] ?? []).some((h) => compilePattern(h.template).re.test(itemPath));

// The `location:` filter. `value` is a candidate, a file fact, an edge or a bare
// path — they all answer the same question.
const matchesLocation = (value: FieldValue, entry: FieldValue, scope: QueryScope = {}, asFilter: AsFilter | null = null): boolean => {
	const arch = archOf(scope);
	const loc = locationOf(value);
	const itemPath = pathOf(loc);
	if (itemPath == null) return false;
	// A glob: the plainest statement of a place.
	if (typeof entry === "string") return compilePattern(entry).re.test(itemPath);
	// `{ node: "slug" }` — the path is inside that node.
	if (isObj(entry) && typeof entry.node === "string") return pathInNode(arch, entry.node, itemPath);
	// `{ role }` — the path is one of the places that role is declared to live in.
	if (isObj(entry) && typeof entry.role === "string") return pathInRole(arch, entry.role, itemPath);
	// A query over the location itself: `{ piece: { isNull: true } }`.
	return asFilter ? asFilter(loc, entry) : true;
};

// A resolved place: the box (node slug) and the concrete path.
type Resolved = { node: string | null; path: string };

const resolveRole = (arch: Arch, role: string, rel: string): Resolved | null => {
	const hit = homeForRole(arch, role, rel);
	return hit?.node ? { node: hit.node, path: hit.path } : null;
};

const resolveNode = (arch: Arch, nodeSlug: string, rel: string): Resolved | null => {
	const home = placeFor(arch, nodeSlug, rel);
	if (home?.path) return { node: folderOwner(arch, home.folder ? home.path : dirOf(home.path))?.slug ?? nodeSlug, path: home.path };
	const own = arch.nodes.bySlug[nodeSlug]?.path;
	return own ? { node: nodeSlug, path: own } : null;
};

// A location entry of a REPAIR → the place and the box, or null.
const resolveOne = (arch: Arch, entry: WhereEntry | string | null | undefined, rel: string): Resolved | null => {
	if (!entry) return null;
	if (typeof entry === "string") return { path: entry, node: folderOwner(arch, dirOf(entry))?.slug ?? null };
	if (entry.role) return resolveRole(arch, entry.role, rel);
	if (entry.node) return resolveNode(arch, entry.node, rel);
	return null;
};

// A location may be ONE entry or a list of alternatives: the first the tree can
// answer for THIS file wins.
const resolveLocation = (arch: Arch, location: WhereEntry | string | (WhereEntry | string)[] | null | undefined, rel: string): Resolved | null => {
	const list = Array.isArray(location) ? location : [location];
	for (const entry of list) {
		const hit = resolveOne(arch, entry, rel);
		if (hit?.node) return hit;
	}
	return null;
};

// The box that HOLDS a place: `a/b/c.ts` → the node that owns `a/b`.
const boxOfPlace = (arch: Arch, path: string | null | undefined): string | null => {
	if (!path) return null;
	return folderOwner(arch, dirOf(path))?.slug ?? null;
};

export { matchesLocation, resolveLocation, boxOfPlace };
export { wordsIn, nameOnly, segmentsOf, parentOf, leafOf, placeOf, placeholdersOf, dirOf } from "./location/place";
export { toList, parseWhereEntry, parseWhere, matchesWhere, checkWhere, accessorLabel, labelOf, fillTemplate, entryKey } from "./location/where";
export { homesOf, sharedPrefix, destinationsIn, destinationOf, placeFor, roleFitsAt, rolesAtPath, homeForRole } from "./location/homes";
export type { Resolved };
export type { Caps } from "./location/where";

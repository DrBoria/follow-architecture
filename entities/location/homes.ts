"use strict";

// THE ROLE → PLACE ANSWER. "Where does code of this role live" is the SAME
// question as "what does this place entry resolve to", so this module owns both
// the declared homes and the concrete place-for-this-file answer.
//
//   homesOf(arch, role)            — the path templates that role may occupy
//   placeFor(arch, role, rel)      — where this role's code belongs FOR THIS FILE
//   destinationOf(arch, role, rel) — the concrete, hostable place, or null
//
// Nothing here is stored on the codeRole: a role knows what code IS, never which
// folder it is in. Anything that needs a location asks the tree.

import { folderOwner, instanceAt, ancestorsAreReal } from "../tree/match";
import { fillTemplate, matchesWhere } from "./where";
import { dirOf } from "./place";
import { rankedOffers } from "../../utils/rank";
import type { Arch, RoleHome } from "../architecture";

// Every path the tree gives this role, in the order the config declares them.
const homesOf = (arch: Arch, role: string): RoleHome[] => arch.nodes.roleHomes[role] ?? [];

// A home as a `{ node, path }` destination.
type Destination = { slug: string | null; path: string | null; folder: boolean; template: string };
// The concrete place a role's code belongs, for one file.
type Place = { path: string; concrete: boolean; folder: boolean };

// How much of the template's start this file shares. Used only to pick which
// branch of a repeating node the file belongs to — never to allow or deny.
const sharedPrefix = (template: string, rel: string | null): number => {
	const ts = String(template).split("/");
	const rs = String(rel ?? "").split("/");
	let n = 0;
	for (let i = 0; i < ts.length; i += 1) {
		const seg = ts[i];
		if (seg === "**" || /^\{[^}]+\}$/.test(seg)) {
			n += 1;
			continue;
		}
		if (seg !== rs[i]) break;
		n += 1;
	}
	return n;
};

// The directory a home names: a file child contributes its parent folder.
const homeDir = (template: string): string[] => {
	const segs = String(template).split("/").filter((s) => s !== "**");
	return /\.[A-Za-z0-9]+$/.test(segs[segs.length - 1] ?? "") ? segs.slice(0, -1) : segs;
};

// The folder OF A FILE as segments.
const fileDir = (rel: string): string[] => dirOf(rel).split("/").filter(Boolean);

const isPlaceholder = (seg: string): boolean => /^\{[^}]+\}$/.test(seg);

// Is the file in the SAME BRANCH as this home? One directory is a prefix of the
// other. `{kebab-case}` matches any single segment, so a feature's instance
// always answers for its own files.
const sameBranch = (home: string[], dir: string[]): boolean => {
	const [short, long] = home.length <= dir.length ? [home, dir] : [dir, home];
	return short.every((seg, i) => isPlaceholder(seg) || isPlaceholder(long[i] ?? "") || seg === long[i]);
};

// Whether this home is in the file's branch. A home that names ONE FILE only
// answers for files of exactly that folder; a FOLDER home may sit in a general
// branch (`packages/utils`) that still applies.
const branchFor = (fileHome: boolean, home: string[], dir: string[]): boolean => (fileHome ? home.length === dir.length && sameBranch(home, dir) : sameBranch(home, dir));

type Scored = { entry: RoleHome; i: number; keep: boolean; branch: boolean; score: number };
const scoreEntry = (entry: RoleHome, i: number, dir: string[], rel: string): Scored => {
	const home = homeDir(entry.template);
	const last = String(entry.template).split("/").filter((seg) => seg !== "**").pop() ?? "";
	const fileHome = /\.[A-Za-z0-9]+$/.test(last);
	const branch = branchFor(fileHome, home, dir);
	return { entry, i, keep: branch || !fileHome, branch, score: sharedPrefix(entry.template, rel) };
};

// The concrete places a role's code may go FOR THIS FILE, best first. The
// score-keep-rank walk is the shared `rankedOffers` core — the same one the
// folder lookalikes use; the scoring policy (branch, prefix, declared order)
// is this module's own.
const destinationsIn = (arch: Arch, role: string, rel: string): Destination[] => {
	const entries = homesOf(arch, role);
	if (!entries.length) return [];
	// A role with ONE declared place has no branch question to answer.
	if (entries.length === 1 && !/\*\*\s*$/.test(entries[0].template)) {
		return [{ slug: entries[0].node, path: fillTemplate(entries[0].template, rel), folder: false, template: entries[0].template }];
	}
	const dir = fileDir(rel);
	const destinationOfEntry = (entry: RoleHome): Destination => ({ slug: entry.node, path: fillTemplate(entry.template, rel), folder: /\*\*\s*$/.test(entry.template), template: entry.template });
	const kept = rankedOffers(
		entries.map((entry, i) => ({ entry, i })),
		({ entry, i }) => {
			const scored = scoreEntry(entry, i, dir, rel);

			return scored.keep ? { ...destinationOfEntry(entry), branch: scored.branch, score: scored.score, i } : null;
		},
		(a, b) => Number(b.branch) - Number(a.branch) || b.score - a.score || a.i - b.i,
	);

	return kept.map(({ slug, path, folder, template }) => ({ slug, path, folder, template }));
};

// The place a role's code belongs FOR THIS FILE, and only when that place can
// exist: the FOLDER has to be a real node instance, while a home that names a
// FILE may still be created — its parent being an instance is enough.
// Does the node that owns the folder own it for THIS destination (the node
// itself, or its declared parent)?
const ownsDest = (arch: Arch, hit: { slug: string }, dest: Destination): boolean => {
	const parent = arch.nodes.bySlug[dest.slug ?? ""]?.parents[0] ?? null;
	return hit.slug === dest.slug || (parent != null && hit.slug === parent);
};

const hostFolder = (dest: Destination): string => (dest.folder ? dest.path ?? "" : dirOf(dest.path ?? ""));

const nodeOk = (arch: Arch, dest: Destination): boolean => {
	const destNode = arch.nodes.bySlug[dest.slug ?? ""];
	return !destNode || ancestorsAreReal(destNode, dest.path ?? "", arch);
};

const destinationOf = (arch: Arch, role: string, rel: string): Destination | null => {
	for (const dest of destinationsIn(arch, role, rel)) {
		if (!dest?.slug || !dest.path) continue;
		if (!nodeOk(arch, dest)) continue;
		const folder = hostFolder(dest);
		const hit = folderOwner(arch, folder);
		if (!hit || !instanceAt(arch, hit.slug, folder)) continue;
		if (ownsDest(arch, hit, dest)) return dest;
	}
	return null;
};

// WHERE a role's code belongs FOR THIS FILE — the ONE answer every caller uses.
const placeFor = (arch: Arch, role: string, rel: string): Place | null => {
	const dest = destinationOf(arch, role, rel);
	if (dest?.path) return { path: dest.path, concrete: true, folder: Boolean(dest.folder) };
	const homes = homesOf(arch, role).map((h) => h.template);
	// A role with SEVERAL homes and none of them hostable here has no answer for
	// this file: picking one would be a guess dressed as advice.
	if (homes.length !== 1) {
		const nearest = destinationsIn(arch, role, rel)[0];
		if (!nearest?.template) return null;
		const last = nearest.template.split("/").filter((seg) => seg !== "**").pop() ?? "";
		const folder = /\*\*\s*$/.test(nearest.template) || !/\.[A-Za-z0-9]+$/.test(last);

		return { path: nearest.template.replace(/\/\*\*$/, ""), concrete: false, folder };
	}
	const only = homes[0];
	if (!/[*{]/.test(only)) return { path: only, concrete: true, folder: false };

	return { path: only.replace(/\/\*\*$/, ""), concrete: false, folder: true };
};

// Does this file sit inside one of the role's homes, asked THROUGH the tree?
const roleFitsAt = (arch: Arch, role: string, rel: string | null | undefined): boolean => {
	if (!rel) return false;
	return (arch.nodes.roleHomes[role] ?? []).some((h) => matchesWhere({ type: "template", template: h.template }, rel, arch, null, null));
};

// The roles whose declared home covers this path — MOST SPECIFIC FIRST.
const rolesAtPath = (arch: Arch, path: string | null | undefined): string[] => {
	if (!path) return [];
	return Object.keys(arch.nodes.roleHomes)
		.filter((role) => roleFitsAt(arch, role, path))
		.map((role, i) => ({
			role,
			i,
			depth: Math.max(0, ...homesOf(arch, role).map((h) => sharedPrefix(h.template, path))),
		}))
		.sort((a, b) => b.depth - a.depth || a.i - b.i)
		.map((x) => x.role);
};

// Where a role's code belongs FOR THIS FILE, as the BOX and the PATH together.
const homeForRole = (arch: Arch, role: string, rel: string): { role: string; path: string; folder: boolean; concrete: boolean; node: string | null } | null => {
	const place = placeFor(arch, role, rel);
	if (!place?.path) return null;
	const folder = place.folder ? place.path : dirOf(place.path);
	return { role, path: place.path, folder: place.folder, concrete: Boolean(place.concrete), node: folderOwner(arch, folder)?.slug ?? null };
};

export { homesOf, sharedPrefix, destinationsIn, destinationOf, placeFor, roleFitsAt, rolesAtPath, homeForRole };
export type { Destination, Place };

"use strict";

// HOW MUCH a folder LOOKS LIKE a declared entity — measured in ROLES, not in
// file names.
//
// A folder is a feature when the code inside it IS the code a feature holds: a
// store model, actions, a controller. Whether the file is called `store.ts` or
// `whatever.ts` says nothing — the ROLE of the code does. So each declared
// entity contributes the roles its children declare, the folder contributes the
// roles its files actually have (classified exactly like everything else), and
// the score is the share of the entity's roles that are already there.
//
// Only entities at or above the threshold are offered, and ALL of them are: a
// folder can be 80% a feature and 66% a type home, and both are true answers.
// Shapes come from the tree, the threshold from the rule option (`similarity`,
// default 60%).

import * as fs from "node:fs";
import * as path from "node:path";
import { notice } from "../report/notices";

import { DEFAULT_SIMILARITY, compilePattern } from "../utils/pattern";
import { loadSourceFile, importNameModules, collectCandidates } from "../entities/ast";
import { classifyRoles } from "../code-roles/classify";
import { segmentsOf } from "../entities/location";
import { readOrFallback } from "../utils/try-read";
import { reasonOf } from "../utils/reason";
import { distinctFlat } from "../utils/distinct";
import { rankedOffers } from "../utils/rank";
import { rolesOfChild } from "./child-roles";
import type { Arch, ArchNode } from "../entities/architecture";
import type { ScanContext } from "../entities/context";

// The roles an entity is MADE OF — one criterion per role, not per file.
// The distinct-collect walk is the shared `distinctFlat` core; the child's
// roles are the shared `rolesOfChild` reading.
const criteriaOf = (arch: Arch, node: ArchNode): string[] => {
	const children = node.children ?? [];

	return distinctFlat(children, (c) => rolesOfChild(arch, c));
};

// The files that belong to this folder: the entity's children live at the top of
// it and one level down (`actions/x.ts`).
const filesIn = (folder: string, repoFiles: readonly string[] | null | undefined): string[] => {
	const depth = segmentsOf(folder).length;

	return (repoFiles ?? []).filter((file) => file.startsWith(`${folder}/`) && segmentsOf(file).length - depth <= 2);
};

// The per-run cache: the roles each file's code was classified into. DERIVED
// from the walk's own map so the cache and the walk cannot disagree.
type SimilarCache = { files: Map<string, string[]> };

// The scan view plus the run's per-file role cache and the architecture the
// files are classified against.
type SimilarScan = ScanContext & { arch?: Arch; cache?: SimilarCache };

// The roles one file's code has, parsed and classified exactly like everything
// else. A file outside the project contributes no roles — and says why,
// because "no roles" and "could not look" are different answers.
const rolesOfFile = (rel: string, ctx: SimilarScan): string[] =>
	readOrFallback(
		rel,
		(file) => {
			const abs = path.join(ctx.repoRoot, file);
			const sf = loadSourceFile(ctx.project, abs, fs.readFileSync(abs, "utf8"));
			const importMap = importNameModules(sf, ctx.repoRoot, ctx.aliases ?? {}, ctx.repoFiles);
			const candidates = collectCandidates(sf, importMap, file, ctx.repoRoot);

			return classifyRoles(candidates, ctx.arch?.codeRoles ?? {}, ctx.arch).present;
		},
		[],
		(e) => notice(`the roles in ${rel} could not be read`, reasonOf(e)),
	);

// The roles the folder's code actually has. Parsed and classified once per file
// per run — the folder is judged by the same facts its own findings come from.
const rolesInFolder = (ctx: SimilarScan, folder: string): Set<string> => {
	const roles = new Set<string>();
	const cache: SimilarCache = (ctx.cache ??= { files: new Map<string, string[]>() });
	for (const rel of filesIn(folder, ctx.repoFiles)) {
		if (!cache.files.has(rel)) cache.files.set(rel, rolesOfFile(rel, ctx));
		for (const role of cache.files.get(rel) ?? []) roles.add(role);
	}

	return roles;
};

// Whether this folder IS this entity — the node's path as a template, matched
// against the concrete folder (`apps/backend/{kebab-case}` ← `apps/backend/document`).
const isOwnPath = (node: ArchNode, folder: string): boolean =>
	(node.variants ?? [])
		.map((v) => v.path)
		.concat(node.path ? [node.path] : [])
		.some((template) => compilePattern(template).re.test(folder));

// Lookalikes answer ONE question: "this folder is declared nowhere — what does it
// look like?" A folder the architecture already places gets a precise answer from
// the role homes (`placeFor`), and offering it a sibling entity made of the same
// roles only says "move an action out of `actions/`", which is not its problem:
// its problem is that a piece inside it fits no declared role.
const isDeclaredPath = (arch: Arch, folder: string): boolean => (arch.nodes.all ?? []).some((n) => isOwnPath(n, folder));

// One lookalike: the entity, its path, and how much of its shape the folder holds.
type Lookalike = { slug: string; path: string | null; score: number; hit: number; total: number; roles: string[] };

// TWO SIDES OF ONE COMPARISON. The entity must cover most of its OWN shape
// (`commands` declares two roles and every folder holding both is 2/2 —
// "looks like a command folder" was true of a whole feature), AND the entity
// must account for most of what the folder actually holds, or it explains
// only a corner of it and is not a shape this folder has.
const resembles = (criteria: readonly string[], present: ReadonlySet<string>, threshold: number): string[] | null => {
	// A shape needs at least two roles to be a shape: an entity declaring one
	// role would match half the folders in any repo.
	if (criteria.length < 2) return null;
	const hit = criteria.filter((role) => present.has(role));
	const score = hit.length / criteria.length;
	if (score < threshold || hit.length / present.size < threshold) return null;

	return hit;
};

// The offer one entity makes: its shape, measured against what the folder
// holds. The entity the folder ALREADY is is never a destination: `document`
// is an instance of `apps/backend/{kebab-case}`, and the variant's own path is
// a template — comparing it as text never matched, so the offer read "move
// this feature's controller into this feature".
// The offer a measured hit earns: the entity's own path, its score, its roles.
const offerOf = (node: ArchNode, hit: string[], total: number): Lookalike => ({
	slug: node.slug,
	path: node.variants?.[0]?.path ?? node.path ?? null,
	score: hit.length / total,
	hit: hit.length,
	total,
	roles: hit,
});

const lookalikeOf = (node: ArchNode, folder: string, match: { arch: Arch; present: ReadonlySet<string>; threshold: number }): Lookalike | null => {
	const criteria = criteriaOf(match.arch, node);
	const hit = isOwnPath(node, folder) ? null : resembles(criteria, match.present, match.threshold);
	return hit ? offerOf(node, hit, criteria.length) : null;
};

// The folder's own role set, when there is anything to compare: a folder the
// architecture already declares (or that holds no classifiable code) has no
// lookalike question to answer.
const folderRoles = (arch: Arch, folder: string, ctx: SimilarScan | null | undefined): Set<string> | null => {
	if (!ctx?.project || isDeclaredPath(arch, folder)) return null;
	const present = rolesInFolder({ ...ctx, arch }, folder);

	return present.size ? present : null;
};

// The declared entities this folder resembles, best first. `score` is the share
// of the entity's roles the folder already holds. The score-keep-rank walk is
// the shared `rankedOffers` core.
const similarNodes = (arch: Arch, folder: string, ctx: SimilarScan | null | undefined, threshold: number = arch.similarity ?? DEFAULT_SIMILARITY): Lookalike[] => {
	const present = folderRoles(arch, folder, ctx);
	if (!present) return [];
	const match = { arch, present, threshold };

	return rankedOffers(
		arch.nodes.all ?? [],
		(node) => lookalikeOf(node, folder, match),
		(a, b) => b.score - a.score || a.slug.localeCompare(b.slug),
	);
};

export { similarNodes, criteriaOf };
export type { SimilarCache, Lookalike };

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

const fs = require("node:fs");
const path = require("node:path");

const { DEFAULT_SIMILARITY, compilePattern } = require("../utils/pattern");
const { loadSourceFile, importNameModules, collectCandidates } = require("../ast");
const { classifyRoles } = require("../code-roles/classify");

// The roles a node's children declare: a child carries them, or names another
// node that does.
const rolesOfChild = (arch, child) => {
	if (child.roles?.length) return child.roles;
	const target = child.nodeSlug ? arch?.nodes?.bySlug?.[child.nodeSlug] : null;

	return target?.roles ?? [];
};

// The roles an entity is MADE OF — one criterion per role, not per file.
const criteriaOf = (arch, node) => [...new Set((node.children ?? []).flatMap((c) => rolesOfChild(arch, c)))];

// The files that belong to this folder: the entity's children live at the top of
// it and one level down (`actions/x.ts`).
const filesIn = (folder, repoFiles) =>
	(repoFiles ?? []).filter((file) => {
		if (!file.startsWith(`${folder}/`)) return false;

		return file.slice(folder.length + 1).split("/").length <= 2;
	});

// The roles the folder's code actually has. Parsed and classified once per file
// per run — the folder is judged by the same facts its own findings come from.
const rolesInFolder = (ctx, folder) => {
	const roles = new Set();
	const cache = (ctx.cache ??= { files: new Map() });
	for (const rel of filesIn(folder, ctx.repoFiles)) {
		if (!cache.files.has(rel)) {
			let found = [];
			try {
				const abs = path.join(ctx.repoRoot, rel);
				const sf = loadSourceFile(ctx.project, abs, fs.readFileSync(abs, "utf8"));
				const importMap = importNameModules(sf, ctx.repoRoot, ctx.aliases ?? {}, ctx.repoFiles);
				const candidates = collectCandidates(sf, importMap, rel, ctx.repoRoot);
				found = classifyRoles(candidates, ctx.arch?.codeRoles ?? {}, ctx.arch).present;
			} catch {
				found = [];
			}
			cache.files.set(rel, found);
		}
		for (const role of cache.files.get(rel)) roles.add(role);
	}

	return roles;
};

// Whether this folder IS this entity — the node's path as a template, matched
// against the concrete folder (`apps/backend/{kebab-case}` ← `apps/backend/document`).
const isOwnPath = (node, folder) =>
	(node.variants ?? [])
		.map((v) => v.path)
		.concat(node.path ? [node.path] : [])
		.some((template) => compilePattern(template).re.test(folder));

// The declared entities this folder resembles, best first. `score` is the share
// of the entity's roles the folder already holds.
// Lookalikes answer ONE question: "this folder is declared nowhere — what does it
// look like?" A folder the architecture already places gets a precise answer from
// the role homes (`placeFor`), and offering it a sibling entity made of the same
// roles only says "move an action out of `actions/`", which is not its problem:
// its problem is that a piece inside it fits no declared role.
const isDeclaredPath = (arch, folder) => (arch?.nodes?.all ?? []).some((n) => isOwnPath(n, folder));

const similarNodes = (arch, folder, ctx, threshold = arch?.similarity ?? DEFAULT_SIMILARITY) => {
	if (!ctx?.project || isDeclaredPath(arch, folder)) return [];
	const present = rolesInFolder({ ...ctx, arch }, folder);
	if (!present.size) return [];
	const out = [];
	for (const node of arch?.nodes?.all ?? []) {
		// The entity the folder ALREADY is is never a destination: `document` is an
		// instance of `apps/backend/{kebab-case}`, and the variant's own path is a
		// template — comparing it as text never matched, so the offer read "move
		// this feature's controller into this feature".
		if (isOwnPath(node, folder)) continue;
		const criteria = criteriaOf(arch, node);
		// A shape needs at least two roles to be a shape: an entity declaring one
		// role would match half the folders in any repo.
		if (criteria.length < 2) continue;
		const hit = criteria.filter((role) => present.has(role));
		const score = hit.length / criteria.length;
		// TWO SIDES OF ONE COMPARISON. The entity must cover most of its OWN shape
		// (`commands` declares two roles and every folder holding both is 2/2 —
		// "looks like a command folder" was true of a whole feature), AND the entity
		// must account for most of what the folder actually holds, or it explains
		// only a corner of it and is not a shape this folder has.
		if (score < threshold || hit.length / present.size < threshold) continue;
		out.push({ slug: node.slug, path: node.variants?.[0]?.path ?? node.path ?? null, score, hit: hit.length, total: criteria.length, roles: hit });
	}

	return out.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
};

module.exports = { similarNodes, criteriaOf };

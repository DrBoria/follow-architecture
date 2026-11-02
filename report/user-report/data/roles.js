"use strict";

// Code-role summaries plus real examples: the overview re-walks the sources
// and classifies candidates with the same engines the rule uses, so every
// role card shows actual matches from this repository with a code snippet.

const path = require("node:path");
const { loadSourceFile, collectCandidates, collectFileFacts, importNameModules } = require("../../../ast");
const { labelOf } = require("../../../utils/where");
const { classifyRoles } = require("../../../code-roles/classify");
const { snippet, readText } = require("./scan");

const MAX_EXAMPLES_PER_ROLE = 8;

const rawRoles = (raw) => {
	if (!raw) return new Map();
	if (Array.isArray(raw)) return new Map(raw.map((r) => [r.slug, r]));
	return new Map(Object.entries(raw).map(([k, v]) => [v.slug ?? k, v]));
};

const collectExamples = ({ arch, files, repoRoot, repoFiles, project }) => {
	const byRole = new Map();
	for (const rel of files) {
		let sf;
		let candidates;
		try {
			const abs = path.join(repoRoot, rel);
			sf = loadSourceFile(project, abs, readText(abs));
			const importMap = importNameModules(sf, repoRoot, arch.aliases ?? {}, repoFiles);
			candidates = collectCandidates(sf, importMap, rel, repoRoot);
		} catch {
			continue;
		}
		let withRoles;
		try {
			// Same order as the engine: the file's facts first (a role may be
			// recognised by what the file depends on), then the classification.
			const fileFacts = collectFileFacts(sf, { rel, repoFiles, aliases: arch.aliases ?? {}, repoRoot, candidates: [] });
			for (const c of candidates) c.file = fileFacts;
			withRoles = classifyRoles(candidates, arch.codeRoles ?? {}, arch).candidates;
		} catch {
			continue;
		}
		for (const c of withRoles) {
			if (!c.role) continue;
			if (!byRole.has(c.role)) byRole.set(c.role, []);
			const list = byRole.get(c.role);
			if (list.length >= MAX_EXAMPLES_PER_ROLE) {
				list.overflow = (list.overflow ?? 0) + 1;
				continue;
			}
			list.push({
				file: rel,
				line: c.lines?.[0] ?? 1,
				name: c.name ?? "(anonymous)",
				code: snippet(path.join(repoRoot, rel), c.lines?.[0] ?? 1),
			});
		}
	}
	return byRole;
};

const buildRoles = ({ arch, files, repoRoot, repoFiles, project, nodes }) => {
	const raw = rawRoles(arch.raw?.codeRoles);
	const examples = collectExamples({ arch, files, repoRoot, repoFiles, project });
	const nodeList = nodes ?? [];
	const nodeBySlug = new Map(nodeList.map((n) => [n.slug, n]));

	return Object.entries(arch.codeRoles ?? {}).map(([slug, def]) => {
		const rawDef = raw.get(slug) ?? {};
		const found = examples.get(slug) ?? [];
		// Where code of this role may be declared — read from the NODES whose
		// children name this role, with the concrete paths they resolve to.
		const homes = (arch.nodes?.roleHomes?.[slug] ?? []).map((h) => {
			const node = nodeBySlug.get(h.node);
			return { slug: h.node, paths: node?.paths ?? [], label: h.template };
		});
		return {
			slug,
			name: def.name ?? slug,
			infer: rawDef.infer ?? def.infer ?? null,
			report: {
				message: rawDef.report?.message ?? (typeof rawDef.report === "string" ? rawDef.report : null),
				fix: rawDef.report?.fix ?? null,
			},
			// What may be DONE with code of this role, and by whom.
			actions: Object.entries(def.actions ?? {}).map(([kind, action]) => ({
				kind,
				// A custom action name (`emit: { of: call }`) says which fact
				// class it is checked against — the card states it, so nothing
				// in the report silently means something else.
				of: action.of ?? null,
				from: (action.where ?? []).map(labelOf),
				scopeAccess: action.scopeAccess ?? [],
			})),
			homes,
			examples: found,
			exampleCount: found.length + (found.overflow ?? 0),
		};
	});
};


module.exports = { buildRoles };

"use strict";

// Code-role summaries plus real examples: the overview re-walks the sources
// and classifies candidates with the same engines the rule uses, so every
// role card shows actual matches from this repository with a code snippet.

const path = require("node:path");
const { loadSourceFile, collectCandidates, collectFileFacts, importNameModules } = require("../../../entities/ast");
const { labelOf } = require("../../../entities/location");
const { classifyRoles } = require("../../../code-roles/classify");
const { snippet, readText } = require("./scan");
const { fieldOf } = require("../../../utils/field");

const MAX_EXAMPLES_PER_ROLE = 8;

const rawRoles = (raw) => {
	if (!raw) return new Map();
	if (Array.isArray(raw)) return new Map(raw.map((r) => [r.slug, r]));
	return new Map(Object.entries(raw).map(([k, v]) => [v.slug ?? k, v]));
};

// WHERE the role's infer actually matched, as line ranges RELATIVE to the
// snippet's first line — so the reader sees WHICH declarations make this piece
// a `cssVariable` / `styleInversion` / … instead of three identical-looking
// windows. The ranges are derived from the ROLE'S OWN infer filters run against
// the candidate's facts (the same `hitOf` the engine uses), so the mark can
// never disagree with the classification: `styledBlock` marks the whole block,
// `cssVariable` marks the declarations that read a variable, `styleInversion`
// marks the state declarations that swap the pair. Template-relative CSS lines
// are shifted by the template's own start line, because the facet numbers them
// inside the template text.
const { hitOf, innerFilterOf, KNOWN_OPS } = require("../../../entities/queries");

// The list filters the role's infer addresses, collected with their field path
// (`css.templates`, `css.templates.declarations`, `css.classes`). Composition
// (`or`/`and`/…) is looked through, quantifiers unwrapped — the same reading
// the invariant report uses. Operator operands (`in: [...]`, `gt: 0`) are
// demands on a value, not roads to a deeper list, so they are never walked.
// The operator vocabulary is the engine's own (`KNOWN_OPS`), never a copy.
const listFiltersOf = (filter, prefix, out) => {
	if (!filter || typeof filter !== "object") return out;
	if (Array.isArray(filter)) {
		for (const f of filter) listFiltersOf(f, prefix, out);
		return out;
	}
	for (const [key, sub] of Object.entries(filter)) {
		if (key === "or" || key === "and" || key === "xor") {
			for (const f of Array.isArray(sub) ? sub : [sub]) listFiltersOf(f, prefix, out);
			continue;
		}
		if (key === "not") {
			listFiltersOf(sub, prefix, out);
			continue;
		}
		// An operator other than composition/quantifier is a demand on the
		// current value — it names no deeper field.
		if (KNOWN_OPS.has(key)) continue;
		if (!sub || typeof sub !== "object") continue;
		const path = prefix ? `${prefix}.${key}` : key;
		const inner = innerFilterOf(sub);
		const quantified = sub.any !== undefined || sub.every !== undefined || sub.none !== undefined || sub.where !== undefined;
		if (quantified) {
			out.push({ path, sub });
			if (inner && typeof inner === "object") listFiltersOf(inner, path, out);
		} else if (sub.length !== undefined && Object.keys(sub).length === 1) {
			// `length` ALONE asks about the list's size ("at least one template").
			// Recorded as a LEAF: it marks the whole list, but only when no
			// deeper demand on the same branch names specific items.
			out.push({ path, sub: {}, leaf: true });
		} else {
			listFiltersOf(sub, path, out);
		}
	}
	return out;
};

// A field path off a fact — `utils/field.js#fieldOf` is the single reader of
// `a.b.c`, list-aware the same way a `$ref` is (a segment on a list yields that
// field in every element). Kept as a named alias because this module reads it
// for the same reason the engine does.
const valueAt = (obj, path) => fieldOf(obj, path);

const matchedRanges = (c, infer) => {
	const start = c.lines?.[0] ?? 1;
	const out = [];
	const seen = new Set();
	const push = (from, to, why) => {
		if (from < 0 || to < from) return;
		const key = `${from}:${to}:${why}`;
		if (seen.has(key)) return;
		seen.add(key);
		out.push({ from, to, why });
	};
	const filters = listFiltersOf(Array.isArray(infer) ? infer : [infer], "", []);
	// A `length` leaf whose items are SCALARS (a `vars` list of names) is not a
	// place — drop it before choosing the mark, so the enclosing declaration
	// demand becomes the deepest on its branch.
	const placeFilters = filters.filter((f) => {
		if (!f.leaf) return true;
		const list = valueAt(c, f.path);
		return Array.isArray(list) && list.length > 0 && list.every((item) => item != null && typeof item === "object");
	});
	// The DEEPEST demand on each branch decides the mark: a role that names
	// declarations marks those declarations, not the whole template. A `length`
	// leaf over OBJECTS ("has at least one template") marks the whole list when
	// nothing deeper names specific items — `styledBlock` has just the leaf, so
	// it marks the block; `styleSurface` also names declarations, so those win.
	const deepest = placeFilters.filter((f) => !placeFilters.some((g) => g !== f && g.path.startsWith(`${f.path}.`)));
	for (const { path, sub } of deepest) {
		const list = valueAt(c, path);
		if (!Array.isArray(list)) continue;
		const hits = hitOf(list, sub, { arch: c.file?.arch });
		for (const item of hits) {
			if (item == null || typeof item !== "object") continue;
			// A declaration: its line is template-relative when it sits in a
			// template, file-relative when it is a class on an attribute.
			if (path.endsWith(".declarations")) {
				const template = (c.css?.templates ?? []).find((t) => (t.declarations ?? []).includes(item));
				const base = template ? (template.startLine ?? template.line ?? start) - start - 1 : 0;
				const at = base + (item.line ?? 1);
				push(at, at, `${item.prop ?? "declaration"}${item.rule ? ` in ${item.rule}` : ""}`);
			} else if (path.endsWith(".templates")) {
				const base = (item.startLine ?? item.line ?? start) - start;
				const lastDecl = item.declarations?.length ? Math.max(...item.declarations.map((d) => d.line ?? 1)) : 0;
				push(base, base + lastDecl, "css template");
			} else if (path.endsWith(".classes")) {
				if (item.line != null) push(item.line - start, item.line - start, `class ${item.raw ?? ""}`);
			} else if (item.line != null) {
				push(item.line - start, item.line - start, path);
			}
		}
	}
	// A function-shaped match (helper, component, …): the piece's own span.
	if (!out.length && Array.isArray(c.lines) && c.lines.length) {
		push(0, c.lines[c.lines.length - 1] - start, c.framework?.component ? "renders JSX" : "function-shaped piece");
	}
	return out;
};

// A NAMED piece beats an anonymous one as the face of a role: the first match
// for `pureFunction` used to be a one-line `${({theme}) => …}` interpolation
// inside a styled template — formally a helper, but the card showed a window of
// CSS with no declaration in sight. Anonymous matches are kept (they are real
// matches) but sorted after the named ones.
const exampleRank = (c) => (c.name ? 0 : 1);

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
			// Same order as the engine: the FACETS first — a role may be defined on
			// `css.*` or `framework.*`, which is how a styled block and a component
			// become roles at all. No separate section: the facts travel with the
			// candidates the roles are built from.
			const { attachToCandidates: attachCssFacts } = require("../../../css");
						const { enrich: attachFrameworkFacts } = require("../../../frameworks");
			attachFrameworkFacts(candidates, { rel, sf, text: readText(path.join(repoRoot, rel)), repoRoot });
			attachCssFacts(candidates, { sf });
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
			list.push({
				file: rel,
				line: c.lines?.[0] ?? 1,
				name: c.name ?? "(anonymous)",
				rank: exampleRank(c),
				code: snippet(path.join(repoRoot, rel), c.lines?.[0] ?? 1),
				matched: matchedRanges(c, arch.codeRoles?.[c.role]?.infer),
			});
		}
	}
	// Named first, document order within each group; then cap. The overflow
	// count stays honest: every match beyond the cap is counted, not dropped.
	for (const [role, list] of byRole) {
		list.sort((a, b) => a.rank - b.rank);
		if (list.length > MAX_EXAMPLES_PER_ROLE) {
			const kept = list.slice(0, MAX_EXAMPLES_PER_ROLE);
			kept.overflow = list.length - MAX_EXAMPLES_PER_ROLE;
			byRole.set(role, kept);
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
		// ONE row per node: a folder that declares the role twice (once by its own
		// `role:` and once through a child pattern) is still one place, and listing
		// it twice made the panel read like two different homes.
		const homes = [];
		for (const h of arch.nodes?.roleHomes?.[slug] ?? []) {
			const node = nodeBySlug.get(h.node);
			const seen = homes.find((x) => x.slug === h.node);
			if (seen) {
				if (h.template && !seen.labels.includes(h.template)) seen.labels.push(h.template);
				continue;
			}
			homes.push({ slug: h.node, paths: node?.paths ?? [], label: h.template, labels: h.template ? [h.template] : [] });
		}
		return {
			slug,
			name: def.name ?? slug,
			infer: rawDef.infer ?? def.infer ?? null,
			report: {
				message: rawDef.report?.description ?? rawDef.report?.message ?? (typeof rawDef.report === "string" ? rawDef.report : null),
				fix: typeof rawDef.report?.fix === "string" ? rawDef.report.fix : rawDef.report?.fix?.message ?? null,
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

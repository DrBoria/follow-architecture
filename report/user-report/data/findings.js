"use strict";


// Findings for the overview: resolve facts, ask errorTypes once, sort.

const { deepestMatch } = require("../../../entities/tree");
const { declaredActions } = require("../../../entities/kinds");

const categoryOf = (rule) => (rule === "invariant" ? "invariant" : rule === "codeRoles" ? "codeRole" : "structure");

const humanize = (id) =>
	String(id ?? "")
		.replace(/[-_]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/^./, (c) => c.toUpperCase());

const firstSentence = (text, max = 72) => {
	const s = String(text ?? "").trim();
	if (!s) return "";
	const cut = /^(.+?[.!?])(\s|$)/.exec(s)?.[1] ?? s;
	return cut.length > max ? `${cut.slice(0, max - 1).trim()}…` : cut;
};

const titleFor = ({ invariant, role, node, rule, message }) => {
	const sentence = firstSentence(message);
	if (sentence) return sentence;
	if (invariant) return humanize(invariant);
	if (role) return humanize(role);
	return humanize(node ?? rule);
};

// The boundary panel: WHO may reach the node the relation touched. The list is
// NOT recomputed here — it is the engine's own verdict (`token.why.roles`), the
// same array the sentence and the repairs print. One evaluation, three readers.
const boundaryDetail = ({ ownerNode, targetNode, roles }) => {
	if (!targetNode) return null;
	const where = targetNode.paths.join(" | ");
	const list = (roles ?? []).filter(Boolean);
	const ownerPath = ownerNode ? ownerNode.path ?? ownerNode.paths?.[0] ?? "" : "";
	const ownerText = ownerNode ? `\`${ownerNode.slug}\` (${ownerPath})` : "no declared node";
	return {
		targetNode: targetNode.slug,
		targetPaths: targetNode.paths,
		ownerNode: ownerNode?.slug ?? null,
		ownerPaths: ownerNode ? [ownerNode.path ?? ownerNode.paths?.[0]].filter(Boolean) : [],
		summary: `\`${targetNode.slug}\` (${where}) may be reached only from: ${list.length ? list.join(", ") : "—"}. This file belongs to ${ownerText}, which is not on that list.`,
		allowed: list,
	};
};

// An action's `from` list, as labels the UI can show.
const splitImporters = (entries) => {
	const roles = [];
	const nodes = [];
	for (const e of entries ?? []) {
		if (e.type === "role") roles.push(e.role);
		else if (e.type === "node") nodes.push(e.node);
		else if (e.type === "glob") nodes.push(e.glob);
	}
	return { nodeSlugs: [...new Set(nodes)], globs: [], roles: [...new Set(roles)] };
};

const buildPlan = ({ role, ownerNode, destination, targetNode, nodes, arch }) => {
	const ownerPaths = ownerNode ? [ownerNode.path ?? ownerNode.paths?.[0]].filter(Boolean) : [];
	// Who may import the target's ROLE — the action lives on the role now.
	const action = role ? (declaredActions(arch).get("import")?.get(role) ?? null) : null;
	const importers = splitImporters(action?.where ?? []);
	return {
		role,
		before: { node: ownerNode?.slug ?? null, paths: ownerPaths },
		after: destination ? { node: destination.slug, paths: destination.paths } : null,
		target: targetNode ? { node: targetNode.slug, paths: targetNode.paths } : null,
		allowedImporters: importers.nodeSlugs,
		allowedGlobs: importers.globs,
	};
};

const { describe } = require("../../errorTypes");

const enrichFindings = ({ findings, arch, nodes }) => {
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));
	const byPath = (rel) => deepestMatch(rel, arch)?.node ?? null;

	const list = findings.map((f) => {
		const ownerNode = byPath(f.file);
		const dedupeKey = f.dedupeKey ?? f.key ?? "";
		const role = /^role:([^:]+)/.exec(dedupeKey)?.[1] ?? null;
		const invariant = /^invariant:([^:]+)/.exec(dedupeKey)?.[1] ?? null;
		const violations = f.data?.violations ?? [];
		const violation = violations.find((v) => v.kind && v.targetPath) ?? violations[0] ?? null;
		const relation = violation?.kind ? violation : null;
		const targetNode = !relation && violation?.targetNode ? bySlug.get(violation.targetNode) ?? null : null;
		const plan = buildPlan({
			role,
			ownerNode,
			destination: relation ? null : violation?.destination ? byPath(violation.destination) : null,
			targetNode,
			nodes,
			arch,
		});
		if (relation) {
			plan.relation = {
				kind: relation.kind,
				node: relation.targetNode ?? null,
				paths: [relation.targetPath].filter(Boolean),
				line: relation.line ?? null,
			};
		}
		const boundaryTarget = targetNode ?? (relation?.targetNode ? bySlug.get(relation.targetNode) ?? null : null);
		const meta = describe({ finding: f, file: f.file, key: dedupeKey, violation, ownerNode, plan, nodes, arch, invariant });
		const story = meta.story;
		if (plan.relation) plan.relation.paths = story.target?.paths ?? [];
		// The before/after card sits next to the picture: both must say the same
		// thing. The card is read from the SAME repair the arrows are drawn from —
		// no type is special-cased, so a new kind of repair cannot forget the card.
		// A repair may name a PLACE with no box (a home spelled as a template,
		// `apps/backend/{kebab-case}/store.ts`): the card still names it, the
		// picture draws nothing, because there is no box to draw.
		const destination = (meta.options ?? []).find((o) => o.path || o.to?.length);
		if (!plan.after && destination) {
			const slug = destination.to?.[0] ?? null;
			plan.after = { node: slug, paths: [destination.path ?? nodes.find((n) => n.slug === slug)?.paths?.[0]].filter(Boolean) };
		}
		// The card says what the REPAIR says. "Delete it" and "nothing moves" are
		// not two views of one finding — they are two different claims, and the
		// reader is the one who notices.
		const repair = destination ?? (meta.options ?? [])[0] ?? null;
		if (repair) plan.repair = repair;
		if (!plan.after && repair?.code === "remove") plan.remove = true;
		const message = meta.message ?? f.message;
		// The SAME options the picture draws: `{ code, text, to }`.
		const fixOptions = meta.options;
		// A finding about ONE declaration is about the FILE it sits in: the card's
		// "now" is that file, not the folder the node stands for. The graph draws
		// the same box, and the two used to disagree — a single unused helper
		// crossed out all 32 files of `packages/utils`.
		if (f.what && plan.before) plan.before = { ...plan.before, paths: [f.file] };

		return {
			file: f.file,
			line: f.pos?.line ?? 1,
			// WHICH piece the finding is about, when it is about one — the picture draws
			// the file it sits in, not the whole folder around it.
			what: f.what ?? null,
			rule: f.rule,
			key: f.key,
			dedupeKey,
			category: categoryOf(f.rule),
				title: titleFor({ invariant, role, node: ownerNode?.slug, rule: f.rule, message }),
				message,
				engineMessage: f.message,
				// A LIST of repairs, cheapest first. Never a single sentence.
				fixOptions,
				errorType: meta.type,

			ownerNode: ownerNode?.slug ?? null,
			// What this folder DECLARES — answers "what is this file for?" without
			// making the reader open the architecture.
			nodeRoles: ownerNode?.roles ?? [],
			ownerPaths: ownerNode ? [ownerNode.path ?? ownerNode.paths?.[0]].filter(Boolean) : [],
			role,
			invariant,
			violation,
							boundary: boundaryTarget ? boundaryDetail({ ownerNode, targetNode: boundaryTarget, roles: story.actors ?? [] }) : null,
			plan,
			story,
		};
	});
	const rank = (f) => (f.category === "invariant" ? 0 : f.category === "codeRole" ? 1 : 2);

	return list.sort((a, b) => rank(a) - rank(b) || a.file.localeCompare(b.file) || a.line - b.line);
};

module.exports = { enrichFindings };

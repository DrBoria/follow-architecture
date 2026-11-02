"use strict";

// Findings enrichment: the raw finding carries a message and a fix. The
// overview adds the missing context — which node owns the file, which node
// the message points at, and (for boundary violations) the exact list of
// nodes/globs allowed to import it. This is what turns
// "`settings.ts` imports from `grammar/store.ts` — not allowed"
// into something a human can act on.

const { deepestMatch } = require("../../../nodes/tree");
const { declaredActions } = require("../../../entities/kinds");
const { homesOf } = require("../../../nodes/homes");
const { labelOf } = require("../../../utils/where");

const categoryOf = (rule) => (rule === "invariant" ? "invariant" : rule === "codeRoles" ? "codeRole" : "structure");

// A short label, derived only from what the finding itself carries: the
// configured step id / role slug / rule name, or the first sentence of the
// configured report message. No project vocabulary lives here.
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

// Build the "why this fired" paragraph for boundary violations.
const boundaryDetail = ({ ownerNode, targetNode, allowed }) => {
	if (!targetNode) return null;
	const where = targetNode.paths.join(" | ");
	const list = (allowed ?? []).map(labelOf);
	const ownerPath = ownerNode ? ownerNode.path ?? ownerNode.paths?.[0] ?? "" : "";
	const ownerText = ownerNode ? `\`${ownerNode.slug}\` (${ownerPath})` : "no declared node";
	return {
		targetNode: targetNode.slug,
		targetPaths: targetNode.paths,
		ownerNode: ownerNode?.slug ?? null,
		ownerPaths: ownerNode ? [ownerNode.path ?? ownerNode.paths?.[0]].filter(Boolean) : [],
		summary: `\`${targetNode.slug}\` (${where}) may be imported only from: ${list.length ? list.join(", ") : "—"}. This file belongs to ${ownerText}, which is not on that list.`,
		allowed,
	};
};

// The `from` list of the IMPORT action of whichever role owns the target path —
// found by what the action does (`of:`), never by the key it is written under.
const boundaryAllowed = (arch, targetNode) => {
	const byFact = declaredActions(arch);
	for (const slug of Object.keys(arch?.codeRoles ?? {})) {
		// The role's homes, asked of the one module that owns them.
		if (homesOf(arch, slug).some((h) => h.node === targetNode.slug)) return byFact.get("import")?.get(slug)?.where ?? [];
	}

	return [];
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

// A concrete "before → after" for the UI: where the code sits now, where the
// architecture says it belongs, and (for boundary hits) the nodes that are
// actually allowed to import the target.
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

const enrichFindings = ({ findings, arch, nodes }) => {
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));
	const byPath = (rel) => deepestMatch(rel, arch)?.node ?? null;

	const list = findings.map((f) => {
		const ownerNode = byPath(f.file);
		const dedupeKey = f.dedupeKey ?? f.key ?? "";
		const role = /^role:([^:]+)/.exec(dedupeKey)?.[1] ?? null;
		const invariant = /^invariant:([^:]+)/.exec(dedupeKey)?.[1] ?? null;
		// The engine reports which node was hit and where the code belongs; the first
		// one is the finding's subject. Never parsed out of the message.
		const violations = f.data?.violations ?? [];
		const violation = violations[0] ?? null;
		const targetNode = violation?.targetNode ? bySlug.get(violation.targetNode) ?? null : null;

		return {
			file: f.file,
			line: f.pos?.line ?? 1,
			rule: f.rule,
			key: f.key,
			dedupeKey,
			category: categoryOf(f.rule),
			title: titleFor({ invariant, role, node: ownerNode?.slug, rule: f.rule, message: f.message }),
			message: f.message,
			fix: f.fix,
			ownerNode: ownerNode?.slug ?? null,
			ownerPaths: ownerNode ? [ownerNode.path ?? ownerNode.paths?.[0]].filter(Boolean) : [],
			role,
			invariant,
			violation,
			boundary: targetNode ? boundaryDetail({ ownerNode, targetNode, allowed: boundaryAllowed(arch, targetNode), nodes }) : null,
			plan: buildPlan({ role, ownerNode, destination: violation?.destination ? byPath(violation.destination) : null, targetNode, nodes, arch }),
		};
	});
	// INVARIANTS FIRST. They describe the shape of the whole tree (a chain nobody
	// can follow, a re-export that hides an edge); a role or node finding is about
	// one piece inside it. Reading a hundred "belongs in packages/utils" before the
	// invariant that says "this tree is unreadable" is the wrong way round.
	const rank = (f) => (f.category === "invariant" ? 0 : f.category === "codeRole" ? 1 : 2);

	return list.sort((a, b) => rank(a) - rank(b) || a.file.localeCompare(b.file) || a.line - b.line);
};

module.exports = { enrichFindings };

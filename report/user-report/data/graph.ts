"use strict";

// The access graph the Graph screen draws: folder→folder edges per declared
// action (with mirrored pairs drawn once), the violations that break them,
// per-folder adjacency, and the role-level graph beside it.
//
// Data in, data out — no DOM, no React. Every number is computed here from the
// architecture and the findings, so the picture never invents a rule.

import { deepestMatch } from "../../../entities/tree";
import { distinctFlat } from "../../../utils/distinct";
import { actionKinds, homesOf, rolesAtNode } from "./graph-helpers";
import { actionEdges, withoutMirrored } from "./graph-edges";
import { roleNodes, roleEdges } from "./graph-roles";
import type { Arch } from "../../../entities/architecture";
import type { NodeSummary } from "../../../entities/overview-summaries";
import type { EnrichedFinding } from "../../../entities/enriched-finding";
import type { AccessGraph, AccessEdge, Unplaceable, Mention, GraphViolation, Adjacency } from "../../../entities/access-graph";

// What is actually broken: a finding that names both the folder the file sits
// in and the folder it reached. A refused relation's target is a ROLE, resolved
// to the node its path lands in.
const slugOfPath = (path: string | null | undefined, arch: Arch): string | null =>
	path ? deepestMatch(String(path), arch)?.node?.slug ?? null : null;

const violationOf = (f: EnrichedFinding, arch: Arch): GraphViolation => ({
	kind: f.violation?.kind ?? "",
	from: f.ownerNode ?? "",
	to: slugOfPath(f.violation?.targetPath, arch) ?? f.violation?.targetNode ?? "",
	role: f.violation?.targetNode ?? "",
	file: f.file,
	line: f.line,
	title: f.title,
});

const graphViolations = (findings: readonly EnrichedFinding[], arch: Arch): GraphViolation[] =>
	findings.filter((f) => f.violation && f.ownerNode && f.violation.targetNode).map((f) => violationOf(f, arch));

// The arrows that ARE the finding: same pair, same action.
const markBroken = (edges: readonly AccessEdge[], violations: readonly GraphViolation[]): AccessEdge[] => {
	const brokenBy = new Map<string, GraphViolation[]>();
	for (const v of violations) {
		const key = `${v.kind}|${v.from}|${v.to}`;
		brokenBy.set(key, [...(brokenBy.get(key) ?? []), v]);
	}
	return edges.map((e) => {
		const broken = brokenBy.get(`${e.kind}|${e.from}|${e.to}`) ?? null;
		return { ...e, kinds: [e.kind], scope: [...(e.scope ?? [])], ...(broken ? { broken: true, brokenCount: broken.length } : {}) };
	});
};

// Per-folder adjacency, keyed by slug. A plain object, not a Map: the payload
// is JSON inlined into the HTML, where a Map would serialize to nothing.
const adjacencyOf = (nodes: readonly NodeSummary[], edges: readonly AccessEdge[]): Record<string, Adjacency> => {
	const byNode: Record<string, Adjacency> = Object.fromEntries(nodes.map((n) => [n.slug, { in: [], out: [] }]));
	for (const e of edges) {
		byNode[e.from]?.out.push(e);
		byNode[e.to]?.in.push(e);
	}
	return byNode;
};

// The roles that actually produce an arrow — the chooser on the Graph screen.
const roleKinds = (edges: readonly AccessEdge[]): string[] => distinctFlat(edges, (e) => [e.target]);

type GraphAsk = { arch: Arch; nodes: NodeSummary[]; findings: EnrichedFinding[] };

// Every declared action, walked role by role into folder→folder edges.
const collectEdges = (ask: GraphAsk, rolesAt: Map<string, string[]>, bySlug: Map<string, NodeSummary>): { edges: AccessEdge[]; unplaceable: Unplaceable[]; mentions: Record<string, Mention[]> } => {
	const { arch } = ask;
	const unplaceable: Unplaceable[] = [];
	const mentions: Record<string, Mention[]> = {};
	const seen = new Set<string>();
	const edges: AccessEdge[] = [];
	for (const [targetSlug, def] of Object.entries(arch.codeRoles)) {
		const targets = homesOf(targetSlug, arch, bySlug);
		for (const [kind, action] of Object.entries(def.actions ?? {})) {
			edges.push(...actionEdges({ kind, action, targetSlug, targets, arch, bySlug, rolesAt, seen, unplaceable, mentions }));
		}
	}
	return { edges, unplaceable, mentions };
};

const buildAccessGraph = (input: GraphAsk): AccessGraph => {
	const { arch, nodes, findings } = input;
	const roles = arch.codeRoles;
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));
	const rolesAt = rolesAtNode(roles, arch, nodes, bySlug);

	const kinds = actionKinds(roles);
	const { edges, unplaceable, mentions } = collectEdges(input, rolesAt, bySlug);
	const drawn = withoutMirrored(edges, bySlug);
	const violations = graphViolations(findings ?? [], arch);
	const merged = markBroken(drawn, violations);

	return {
		kinds,
		roles: roleKinds(merged),
		edges: merged,
		violations,
		unplaceable,
		mentions,
		byNode: adjacencyOf(nodes, merged),
		roleNodes: roleNodes(roles, arch),
		roleEdges: roleEdges(roles, violations),
	};
};

export { buildAccessGraph };

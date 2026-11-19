"use strict";

// The tree screen's reads: the children index, the roots, the per-folder kind
// flags and finding counts, the search matches, and the ancestor chain a URL
// selection must open. Split from the screen so each is a named decision.

import { groupBy } from "../../../../../utils/group";
import { countBy } from "../../../../../utils/count";
import { matchesText } from "../../utils/format";
import type { NodeSummary } from "../../../../../entities/overview-summaries";
import type { EnrichedFinding } from "../../../../../entities/enriched-finding";
import type { AccessEdge } from "../../../../../entities/access-graph";

// Which kinds each folder takes part in — the same colours the arrows use.
const kindFlagsOf = (edges: readonly AccessEdge[]): Record<string, string[]> => {
	const pairs = edges.flatMap((e) => [e.from, e.to].map((slug) => ({ slug, kind: e.kind })));
	const grouped: [string, string[]][] = groupBy(pairs, (p) => p.slug).map(([slug, items]) => [slug, [...new Set(items.map((p) => p.kind))]]);
	return Object.fromEntries(grouped);
};

// The children of each parent (a node may have several parents).
const childrenOf = (nodes: readonly NodeSummary[]): Map<string, NodeSummary[]> => {
	const pairs = nodes.flatMap((n) => n.parents.map((p) => ({ p, n })));
	return new Map(groupBy(pairs, (x) => x.p).map(([p, items]) => [p, items.map((x) => x.n)]));
};

// Findings per folder, so a row says how much is wrong with it before it opens.
const findingCountsOf = (findings: readonly EnrichedFinding[]): Record<string, number> => {
	const owned = findings.filter((f) => f.ownerNode);
	return Object.fromEntries(countBy(owned, (f) => f.ownerNode ?? "").map((c) => [c.key, c.count]));
};

// The search matches: a node whose slug or any path contains the query.
const matchesOf = (nodes: readonly NodeSummary[], query: string): NodeSummary[] | null => {
	if (!query.trim()) return null;
	return nodes.filter((n) => matchesText(n.slug, query) || n.paths.some((p) => matchesText(p, query)));
};

// The ancestor chain of a node (bounded, so a cyclic parent list cannot loop).
const chainOf = (selected: string, nodes: readonly NodeSummary[]): string[] => {
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));
	const chain: string[] = [];
	let cur = bySlug.get(selected);
	while (cur && chain.length <= 32) {
		chain.push(cur.slug);
		cur = cur.parents?.[0] ? bySlug.get(cur.parents[0]) : undefined;
	}
	return chain;
};

// The folder's own corner of the graph: every arrow that touches it, and the
// boxes those arrows name.
const localGraphOf = (node: NodeSummary | null, nodes: readonly NodeSummary[], edges: readonly AccessEdge[]): { localEdges: AccessEdge[]; localNodes: NodeSummary[] } => {
	if (!node) return { localEdges: [], localNodes: [] };
	const localEdges = edges.filter((e) => e.from === node.slug || e.to === node.slug);
	const seen = new Set([node.slug, ...localEdges.flatMap((e) => [e.from, e.to])]);
	return { localEdges, localNodes: nodes.filter((n) => seen.has(n.slug)) };
};

export { kindFlagsOf, childrenOf, findingCountsOf, matchesOf, chainOf, localGraphOf };

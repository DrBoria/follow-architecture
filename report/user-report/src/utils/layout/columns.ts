"use strict";

// WHICH COLUMN a box sits in. Layers are derived from the EDGES, not from the
// declared tree depth: a node sits at `max(predecessor rank) + 1`, so every
// arrow spans exactly one column. Isolated nodes fall back to the tree depth so
// they still land somewhere sensible. A barycenter pass then puts each node
// near the average row of its predecessors.

import type { LayoutNode, LayoutEdge } from "./types";

// The declared tree depth of every node (parents that are drawn count).
export const computeDepths = (nodes: readonly LayoutNode[]): { depth: Map<string, number>; bySlug: Map<string, LayoutNode> } => {
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));
	const depth = new Map<string, number>();
	const visiting = new Set<string>();

	const resolve = (slug: string): number => {
		const known = depth.get(slug);
		if (known != null) return known;
		if (visiting.has(slug)) return 0;
		visiting.add(slug);
		const node = bySlug.get(slug);
		const parents = (node?.parents ?? []).filter((p) => bySlug.has(p));
		const d = parents.length ? Math.max(...parents.map(resolve)) + 1 : 0;
		visiting.delete(slug);
		depth.set(slug, d);
		return d;
	};

	for (const n of nodes) resolve(n.slug);
	return { depth, bySlug };
};

// Rank by longest path over the drawn edges.
const ranksFromEdges = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): Map<string, number> => {
	const incoming = new Map<string, string[]>(nodes.map((n) => [n.slug, []]));
	for (const e of edges) {
		if (e.from && e.to && e.from !== e.to && incoming.has(e.to)) incoming.get(e.to)?.push(e.from);
	}
	const { depth } = computeDepths(nodes);
	const rank = new Map<string, number>();
	const visiting = new Set<string>();

	const resolve = (slug: string): number => {
		const known = rank.get(slug);
		if (known != null) return known;
		if (visiting.has(slug)) return 0;
		visiting.add(slug);
		const preds = incoming.get(slug) ?? [];
		const value = preds.length ? Math.max(...preds.map(resolve)) + 1 : depth.get(slug) ?? 0;
		visiting.delete(slug);
		rank.set(slug, value);
		return value;
	};

	for (const n of nodes) resolve(n.slug);

	const min = Math.min(...rank.values());
	if (min > 0) for (const [k, v] of rank) rank.set(k, v - min);
	return rank;
};

// The predecessors of each node, for the barycenter pass.
const neighboursOf = (edges: readonly LayoutEdge[]): Map<string, string[]> => {
	const neighbours = new Map<string, string[]>();
	for (const { from, to } of edges) {
		if (!from || !to || from === to) continue;
		if (!neighbours.has(to)) neighbours.set(to, []);
		neighbours.get(to)?.push(from);
	}
	return neighbours;
};

// One barycenter pass over one column: sort by the average row of predecessors.
const orderColumn = (list: LayoutNode[], neighbours: Map<string, string[]>): void => {
	const indexOf = new Map(list.map((n, i) => [n.slug, i]));
	const bary = (n: LayoutNode): number => {
		const rows = (neighbours.get(n.slug) ?? []).map((p) => indexOf.get(p)).filter((v): v is number => v != null);
		return rows.length ? rows.reduce((s, v) => s + v, 0) / rows.length : indexOf.get(n.slug) ?? 0;
	};
	list.sort((a, b) => bary(a) - bary(b));
};

// Barycenter passes: put each node near the average row of its predecessors.
const orderColumns = (columns: Map<number, LayoutNode[]>, edges: readonly LayoutEdge[]): Map<number, LayoutNode[]> => {
	const neighbours = neighboursOf(edges);
	for (let pass = 0; pass < 3; pass += 1) {
		for (const [, list] of [...columns].sort((a, b) => a[0] - b[0])) orderColumn(list, neighbours);
	}
	return columns;
};

// The columns of boxes, ranked by the edges and ordered by barycenter.
export const columnsOf = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): { columns: Map<number, LayoutNode[]>; rank: Map<string, number> } => {
	const rank = ranksFromEdges(nodes, edges);
	const columns = new Map<number, LayoutNode[]>();
	for (const n of nodes) {
		const r = rank.get(n.slug) ?? 0;
		if (!columns.has(r)) columns.set(r, []);
		columns.get(r)?.push(n);
	}
	for (const list of columns.values()) list.sort((a, b) => a.slug.localeCompare(b.slug));
	orderColumns(columns, edges);
	return { columns, rank };
};

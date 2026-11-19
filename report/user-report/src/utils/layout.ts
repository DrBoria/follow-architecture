// THE GRAPH LAYOUT: columns from the edges, boxes sized for their text and
// ports, arrows routed through lanes, labels placed off everything. The pieces
// live in `layout/`; this module is the assembly only, and the public answer
// (`positions`, `width`, `height`, `links`) is what the canvas draws.

import { COL } from "./layout/text-flow";
import { columnsOf } from "./layout/columns";
import { pillSize } from "./layout/edge-lines";
import { plansOf, assignLanes, linkOf, PAD } from "./layout/routing";
import { heightMaker, bandSpace, positionsOf, portsOf } from "./layout/geometry";
import { lanesOf } from "./layout/lanes";
import { occupancyOf } from "./layout/occupancy";
import { placeLabel } from "./layout/label-search";
import type { LayoutNode, LayoutEdge, Box, Link } from "./layout/types";

// The routed links: one per plan, through its ports and lanes.
type RouteCtx = { positions: Map<string, Box>; ports: ReturnType<typeof portsOf>; laneAt: ReturnType<typeof lanesOf>; bottomLaneY: number };

// The x where an arrow leaves/enters its box, and the y of its ports.
const endsOf = (p: ReturnType<typeof plansOf>[number], ctx: RouteCtx): { exitX: number; entryX: number; y1: number; y2: number } => {
	const { positions, ports } = ctx;
	const a = positions.get(p.edge.from) ?? { x: 0, y: 0, w: 0, h: 0 };
	const b = positions.get(p.edge.to) ?? { x: 0, y: 0, w: 0, h: 0 };
	const exitX = p.forward ? a.x + a.w : a.x;
	const entryX = p.forward ? b.x : b.x + b.w;
	const y1 = ports.portY(p.edge.from, p.forward ? "right" : "left", p.edge, p.edge.to);
	const y2 = ports.portY(p.edge.to, p.forward ? "left" : "right", p.edge, p.edge.from);
	return { exitX, entryX, y1, y2 };
};

// One plan's geometry: its ends, its lane positions, and its channel height.
const geoOf = (p: ReturnType<typeof plansOf>[number], ctx: RouteCtx): { exitX: number; entryX: number; y1: number; y2: number; vOut: number; vIn: number; laneY: number } => {
	const { laneAt, bottomLaneY } = ctx;
	const { exitX, entryX, y1, y2 } = endsOf(p, ctx);
	const vOut = laneAt(exitX, p.forward ? 1 : -1, `out|${Math.round(exitX)}`);
	const vIn = laneAt(entryX, p.forward ? -1 : 1, `in|${Math.round(entryX)}`);
	const laneY = p.side === "above" ? p.lane ?? 0 : bottomLaneY + (p.lane ?? 0);
	return { exitX, entryX, y1, y2, vOut, vIn, laneY };
};

const linksOf = (plans: ReturnType<typeof plansOf>, ctx: RouteCtx): Link[] => plans.map((p) => linkOf(p, geoOf(p, ctx)));

// The laid-out graph: boxes, links (with labels), and the canvas size.
type Graph = { positions: Map<string, Box>; width: number; height: number; columns: Map<number, LayoutNode[]>; links: Link[]; loops: never[]; rank: Map<string, number> };

// Every label placed off boxes, arrows and other labels (the grid remembers).
const placeLabels = (links: readonly Link[], width: number, height: number, positions: Map<string, Box>): void => {
	const grid = occupancyOf([...positions.values()]);
	for (const l of links) placeLabel({ link: l, width, height, links, grid });
};

// The strip between two columns must fit the widest label that lives in it.
const stripGap = (plans: ReturnType<typeof plansOf>): number => Math.max(COL.gapX, ...plans.map((p) => pillSize(p.edge).w + 26));

// The placed boxes and routed links for one set of columns and plans.
const routeAll = (scene: { nodes: readonly LayoutNode[]; columns: Map<number, LayoutNode[]>; plans: ReturnType<typeof plansOf>; loopsOf: (slug: string) => number }): { positions: Map<string, Box>; links: Link[]; band: number; top: number; gap: number; bottomSpace: number } => {
	const { nodes, columns, plans, loopsOf } = scene;
	const { above, below } = assignLanes(plans);
	const gap = stripGap(plans);
	const { topSpace, bottomSpace } = bandSpace(plans, above, below);
	const heightOf = heightMaker(nodes, plans, loopsOf);
	const { positions, band, top } = positionsOf(columns, heightOf, gap, topSpace);
	const ports = portsOf(plans, positions);
	const laneAt = lanesOf(plans, positions, gap);
	const links = linksOf(plans, { positions, ports, laneAt, bottomLaneY: top + band + PAD });
	return { positions, links, band, top, gap, bottomSpace };
};

const buildGraph = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[], options: { loopsOf?: (slug: string) => number } = {}): Graph => {
	const { columns, rank } = columnsOf(nodes, edges);
	const plans = plansOf(nodes, edges, rank);
	const { positions, links, band, top, gap, bottomSpace } = routeAll({ nodes, columns, plans, loopsOf: options.loopsOf ?? (() => 0) });

	const width = (Math.max(...[...columns.keys()], 0) + 1) * (COL.width + gap) - gap;
	const height = top + band + bottomSpace;
	placeLabels(links, width, height, positions);

	return { positions, width, height, columns, links, loops: [], rank };
};

// Nodes worth drawing: everything touched by an edge, plus the focus and its
// neighbours (so selecting a node never leaves it stranded), plus the boxes the
// PICTURE asked for (`keep`) — a finding about one declaration draws that file
// with no arrow at all, and an edge-only rule left the canvas empty.
// The focus and its neighbours: selecting a node never leaves it stranded.
const withNeighbours = (keep: Set<string>, focus: string, edges: readonly LayoutEdge[]): Set<string> => {
	keep.add(focus);
	for (const e of edges) {
		if (e.from === focus) keep.add(e.to);
		if (e.to === focus) keep.add(e.from);
	}
	return keep;
};

const visibleSlugs = (ask: { edges: readonly LayoutEdge[]; focus: string | null; showAll: boolean; nodes: readonly LayoutNode[]; keep?: string[] }): Set<string> => {
	const { edges, focus, showAll, nodes, keep: wanted = [] } = ask;
	if (showAll) return new Set(nodes.map((n) => n.slug));
	const keep = new Set(wanted ?? []);
	for (const e of edges) {
		if (!e.from || !e.to) continue;
		keep.add(e.from);
		keep.add(e.to);
	}
	return focus ? withNeighbours(keep, focus, edges) : keep;
};

export { buildGraph, visibleSlugs };
export { COL, LINE, textFlow } from "./layout/text-flow";
export { computeDepths } from "./layout/columns";
export { edgeLines } from "./layout/edge-lines";
export type { LayoutNode, LayoutEdge, Box, Link } from "./layout/types";

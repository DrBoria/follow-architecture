"use strict";

// WHERE THE BOXES GO and how tall each is. A box must fit ITS OWN text (name,
// places, self-rule badges) AND the ports of the arrows leaving it — a label
// sits above its arrow, so ports must be a label apart. Columns are centred in
// the band; every arrow gets its own port, ordered by where it is heading.

import { COL, textFlow } from "./text-flow";
import { pillSize } from "./edge-lines";
import { PAD, LANE, type Plan } from "./routing";
import type { LayoutNode, LayoutEdge, Box } from "./types";

// How many plans touch each slug (a self-loop counts once).
const touchingOf = (plans: readonly Plan[]): Map<string, number> => {
	const touching = new Map<string, number>();
	for (const p of plans) {
		for (const slug of [p.edge.from, p.edge.to]) if (!touching.has(slug)) touching.set(slug, 0);
		touching.set(p.edge.from, (touching.get(p.edge.from) ?? 0) + 1);
		if (p.edge.to !== p.edge.from) touching.set(p.edge.to, (touching.get(p.edge.to) ?? 0) + 1);
	}
	return touching;
};

// The height of one box: its text block, its ports, and the column minimum.
const heightMaker = (nodes: readonly LayoutNode[], plans: readonly Plan[], loopsOf: (slug: string) => number): ((slug: string) => number) => {
	const touching = touchingOf(plans);
	const labelH = plans.length ? Math.max(...plans.map((p) => pillSize(p.edge).h)) : 12;
	const nodeBySlug = new Map(nodes.map((n) => [n.slug, n]));
	const textHeightOf = (slug: string): number => textFlow(nodeBySlug.get(slug), loopsOf(slug)).height;
	return (slug) => {
		const n = touching.get(slug) ?? 0;
		const needed = (n + 1) * (labelH + 12) - 12;
		return Math.max(COL.row, Math.min(needed, 420), textHeightOf(slug));
	};
};

// The band's geometry: the free space above and below (lanes + label room).
const bandSpace = (plans: readonly Plan[], above: readonly Plan[], below: readonly Plan[]): { topSpace: number; bottomSpace: number } => {
	const labelPad = plans.length ? Math.max(...plans.map((p) => pillSize(p.edge).h)) + 14 : 0;
	const topSpace = Math.max(above.length ? PAD * 2 + (above.length - 1) * LANE : PAD, labelPad);
	const bottomSpace = Math.max(below.length ? PAD * 2 + (below.length - 1) * LANE : PAD, labelPad);
	return { topSpace, bottomSpace };
};

// Place every box: columns centred in the band, rows stacked with the gap.
export const positionsOf = (columns: Map<number, LayoutNode[]>, heightOf: (slug: string) => number, gap: number, topSpace: number): { positions: Map<string, Box>; band: number; top: number } => {
	const columnHeights = new Map<number, number>();
	for (const [r, list] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
		const totalH = list.reduce((sum, n) => sum + heightOf(n.slug), 0) + (list.length - 1) * COL.gapY;
		columnHeights.set(r, totalH);
	}
	const band = Math.max(...columnHeights.values(), COL.row);
	const top = topSpace;
	const positions = new Map<string, Box>();
	for (const [r, list] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
		const startY = top + (band - (columnHeights.get(r) ?? 0)) / 2;
		let cursor = startY;
		for (const n of list) {
			const h = heightOf(n.slug);
			positions.set(n.slug, { x: r * (COL.width + gap), y: cursor, w: COL.width, h });
			cursor += h + COL.gapY;
		}
	}
	return { positions, band, top };
};

// Ports: every arrow gets its own pixel on the box side it uses, ordered by
// where it is heading, so two arrows never leave from the same point.
type PortIndex = { portY: (slug: string, side: string, edge: LayoutEdge, other: string) => number };

export const portsOf = (plans: readonly Plan[], positions: Map<string, Box>): PortIndex => {
	const portGroups = new Map<string, LayoutEdge[]>();
	const groupOf = (slug: string, side: string, edge: LayoutEdge): LayoutEdge[] => {
		const key = `${slug}|${side}`;
		if (!portGroups.has(key)) portGroups.set(key, []);
		const list = portGroups.get(key) ?? [];
		if (!list.includes(edge)) list.push(edge);
		return list;
	};
	for (const p of plans) {
		groupOf(p.edge.from, p.forward ? "right" : "left", p.edge);
		groupOf(p.edge.to, p.forward ? "left" : "right", p.edge);
	}
	const portY = (slug: string, side: string, edge: LayoutEdge, other: string): number => {
		const box = positions.get(slug) ?? { x: 0, y: 0, w: 0, h: 0 };
		const otherSlug = (e: LayoutEdge): string => {
			if (e === edge) return other;
			return e.from === slug ? e.to : e.from;
		};
		const list = [...(portGroups.get(`${slug}|${side}`) ?? [])].sort((a, b) => {
			const oa = positions.get(otherSlug(a))?.y ?? 0;
			const ob = positions.get(otherSlug(b))?.y ?? 0;
			return oa - ob;
		});
		const i = Math.max(list.indexOf(edge), 0);
		return box.y + (box.h * (i + 1)) / (list.length + 1);
	};
	return { portY };
};

export { heightMaker, bandSpace };

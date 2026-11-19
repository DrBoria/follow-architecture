"use strict";

// HOW AN ARROW RUNS. Route is decided BEFORE anything is positioned, because
// the number of lanes needed above and below the band depends on it:
//
//   gap     — next column over: the arrow lives entirely in the empty strip
//             between the two columns.
//   channel — anything else: it runs outside the band, in a lane of its own.
//             A backward edge is lifted over the top; a long forward jump
//             drops under the bottom. Both enter and leave their boxes
//             horizontally, so the vertical run always happens in a column
//             strip, where no box can be in the way.
//
// A path through the given corners, with the corners rounded so an arrow reads
// as a curve instead of a wire diagram. Points are kept on the link so a test
// (or a reader) can verify that no segment crosses a box.

import type { LayoutEdge, Point, Link } from "./types";

// Room for one arrow lane outside the band of boxes, plus breathing space.
export const LANE = 18;
export const PAD = 14;

// One arrow's route plan: its columns, its direction, its side, and (for a
// channel) its lane offset.
type Plan = { edge: LayoutEdge; ca: number; cb: number; forward: boolean; side: string; lane?: number };

const sideOf = (ca: number, cb: number): string => {
	if (cb === ca + 1) return "gap";
	if (cb === ca - 1) return "gap-back";
	return cb > ca ? "below" : "above";
};

// The route plans for the drawable edges (both ends present, not a self-loop).
export const plansOf = (nodes: readonly { slug: string }[], edges: readonly LayoutEdge[], rank: Map<string, number>): Plan[] => {
	const slugs = new Set(nodes.map((n) => n.slug));
	const drawable = edges.filter((e) => e.from && e.to && e.from !== e.to && slugs.has(e.from) && slugs.has(e.to));
	return drawable.map((edge) => {
		const ca = rank.get(edge.from) ?? 0;
		const cb = rank.get(edge.to) ?? 0;
		return { edge, ca, cb, forward: cb > ca, side: sideOf(ca, cb) };
	});
};

// Longest edges get the outermost lane: they have the farthest to travel and
// are the ones that would otherwise cut across a short arrow's lane.
export const assignLanes = (plans: Plan[]): { above: Plan[]; below: Plan[] } => {
	const bySpan = (a: Plan, b: Plan): number => Math.abs(b.cb - b.ca) - Math.abs(a.cb - a.ca);
	const above = plans.filter((p) => p.side === "above").sort(bySpan);
	const below = plans.filter((p) => p.side === "below").sort(bySpan);
	above.forEach((p, i) => {
		p.lane = PAD + i * LANE;
	});
	below.forEach((p, i) => {
		p.lane = i * LANE;
	});
	return { above, below };
};

// A path through the corners, rounded so an arrow reads as a curve.
export const rounded = (points: Point[], r = 11): string => {
	let d = `M${points[0][0]},${points[0][1]}`;
	for (let i = 1; i < points.length - 1; i += 1) {
		const [px, py] = points[i - 1];
		const [cx, cy] = points[i];
		const [nx, ny] = points[i + 1];
		const inLen = Math.hypot(cx - px, cy - py);
		const outLen = Math.hypot(nx - cx, ny - cy);
		const rr = Math.min(r, inLen / 2, outLen / 2);
		if (rr < 0.5) {
			d += ` L${cx},${cy}`;
			continue;
		}
		const ax = cx - ((cx - px) / (inLen || 1)) * rr;
		const ay = cy - ((cy - py) / (inLen || 1)) * rr;
		const bx = cx + ((nx - cx) / (outLen || 1)) * rr;
		const by = cy + ((ny - cy) / (outLen || 1)) * rr;
		d += ` L${ax},${ay} Q${cx},${cy} ${bx},${by}`;
	}
	const last = points[points.length - 1];
	return `${d} L${last[0]},${last[1]}`;
};

// The corners of one plan: a gap arrow turns in the strip; a channel arrow
// runs out to its lane, across, and back in.
export const pointsOf = (p: Plan, geo: { exitX: number; entryX: number; y1: number; y2: number; vOut: number; vIn: number; laneY: number }): Point[] => {
	if (p.side === "gap" || p.side === "gap-back") {
		return [
			[geo.exitX, geo.y1],
			[geo.vOut, geo.y1],
			[geo.vOut, geo.y2],
			[geo.entryX, geo.y2],
		];
	}
	return [
		[geo.exitX, geo.y1],
		[geo.vOut, geo.y1],
		[geo.vOut, geo.laneY],
		[geo.vIn, geo.laneY],
		[geo.vIn, geo.y2],
		[geo.entryX, geo.y2],
	];
};

// One routed link from a plan and its geometry.
export const linkOf = (p: Plan, geo: { exitX: number; entryX: number; y1: number; y2: number; vOut: number; vIn: number; laneY: number }): Link => {
	const points = pointsOf(p, geo);
	return { edge: p.edge, kind: p.side, points, path: rounded(points) };
};

export type { Plan };

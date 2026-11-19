"use strict";

// WHERE A LABEL GOES. A label is a pill ON its own arrow, so it is placed, not
// guessed: near one of its horizontal runs, at a spot where the pill touches no
// box, no other arrow and no other label. When the obvious spots are taken (two
// arrows leaving the same box share a strip), the search widens to the arrow's
// whole span — a floating label is better than a missing one, and it is never
// on top of anything.
//
// Occupancy GRID, not a list to scan: a cell lookup makes "is this rectangle
// free" cost the handful of rects in its own cells, and the search visits a
// bounded number of candidates (an unbounded 4px canvas search took 13 seconds
// on a big graph).

import { admitsWhenNoneReject } from "../../../../../utils/gate";
import type { Link, Rect, Point } from "./types";

const CELL = 48;

// The occupancy grid: boxes and placed labels, indexed by the cells they cover.
type Occupancy = { occupy: (r: Rect) => void; freeRect: (r: Rect) => boolean };

const cellsOf = (r: Rect): string[] => {
	const out: string[] = [];
	const x0 = Math.floor(r.x / CELL);
	const x1 = Math.floor((r.x + r.w) / CELL);
	const y0 = Math.floor(r.y / CELL);
	const y1 = Math.floor((r.y + r.h) / CELL);
	for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) out.push(`${x}|${y}`);
	return out;
};

const overlaps = (a: Rect, b: Rect): boolean => a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;

const occupancyOf = (boxes: readonly Rect[]): Occupancy => {
	const occupied = new Map<string, Rect[]>();
	const occupy = (r: Rect): void => {
		for (const key of cellsOf(r)) {
			const list = occupied.get(key);
			if (list) list.push(r);
			else occupied.set(key, [r]);
		}
	};
	const freeRect = (r: Rect): boolean => {
		for (const key of cellsOf(r)) {
			for (const o of occupied.get(key) ?? []) if (overlaps(r, o)) return false;
		}
		return true;
	};
	for (const b of boxes) occupy(b);
	return { occupy, freeRect };
};

// Does a segment (with a 1.5px grace) touch a rectangle?
const hitsRect = (seg: [Point, Point], r: Rect): boolean => {
	const xm = Math.min(seg[0][0], seg[1][0]) - 1.5;
	const xM = Math.max(seg[0][0], seg[1][0]) + 1.5;
	const ym = Math.min(seg[0][1], seg[1][1]) - 1.5;
	const yM = Math.max(seg[0][1], seg[1][1]) + 1.5;
	return xM > r.x && xm < r.x + r.w && yM > r.y && ym < r.y + r.h;
};

// The segments of a link (every corner pair).
const segmentsOf = (l: Link): [Point, Point][] => l.points.slice(0, -1).map((pt, i) => [pt, l.points[i + 1]]);

// A spot is legal when it is inside the canvas, off every box, off every other
// arrow, and off its OWN line (the label belongs above or below, never struck
// through).
type SpotAsk = { cx: number; top: number; pill: number; tall: number; width: number; height: number; others: [Point, Point][]; self: [Point, Point][]; grid: Occupancy };
const spotFree = (ask: SpotAsk): boolean => {
	const { cx, top, pill, tall, width, height, others, self, grid } = ask;
	const rect: Rect = { x: cx - pill / 2, y: top, w: pill, h: tall };
	const refusals = [
		() => cx < pill / 2 + 2 || cx > width - pill / 2 - 2,
		() => rect.y < 3 || rect.y + rect.h > height - 2,
		() => !grid.freeRect(rect),
		() => others.some((seg) => hitsRect(seg, rect)),
		() => self.some((seg) => hitsRect(seg, rect)),
	];
	return admitsWhenNoneReject(ask, refusals);
};

// The candidate y-rows: the arrow's own horizontal runs, else its mid-height.
const runsOf = (l: Link): number[] => {
	const ys = l.points.map((pt) => pt[1]);
	const runs = l.points.filter((pt, i) => i < l.points.length - 1 && Math.abs(l.points[i + 1][1] - pt[1]) < 0.5).map((pt) => pt[1]);
	return runs.length ? runs : [(Math.min(...ys) + Math.max(...ys)) / 2];
};

export { occupancyOf, hitsRect, segmentsOf, spotFree, runsOf, CELL };
export type { Occupancy, SpotAsk };

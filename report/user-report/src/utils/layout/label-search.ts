// The label search: three bounded passes, from the arrow's own runs outward.
// Each pass tries a bounded number of spots and stops at the first legal one;
// a label a little further away is fine, an unbounded canvas search is not.

import { pillSize } from "./edge-lines";
import { spotFree, runsOf, segmentsOf, type Occupancy, type SpotAsk } from "./occupancy";
import type { Link, Rect } from "./types";

// The first legal spot at (cx, top), or null.
type Found = { cx: number; rect: Rect } | null;

// What one link's search reads: the spot context minus the candidate position
// (the search supplies that per attempt), with the link instead of its segments.
type SearchAsk = Omit<SpotAsk, "cx" | "top" | "pill" | "tall" | "self"> & { link: Link };

// One spot attempt: the search context plus the candidate position and pill.
type TryAsk = Pick<SpotAsk, "cx" | "top" | "pill" | "tall"> & { ask: SearchAsk };

const trySpot = ({ ask, cx, top, pill, tall }: TryAsk): Found => {
	const { link, width, height, others, grid } = ask;
	const spot: SpotAsk = { cx, top, pill, tall, width, height, others, self: segmentsOf(link), grid };
	if (!spotFree(spot)) return null;
	return { cx, rect: { x: cx - pill / 2, y: top, w: pill, h: tall } };
};

// Pass 1: hugging one of its own horizontal runs, above it first, as close to
// the arrow's midpoint as possible. Few candidates, exact segment checks.
// One run's attempts: both sides of the midpoint, above and below the run.
const atRun = (scene: { ask: SearchAsk; pill: number; tall: number; midX: number; d: number; y: number }): Found => {
	const { ask, pill, tall, midX, d, y } = scene;
	for (const cx of d === 0 ? [midX] : [midX - d, midX + d]) {
		for (const top of [y - 4 - tall, y + 4]) {
			const found = trySpot({ ask, cx, top, pill, tall });
			if (found) return found;
		}
	}
	return null;
};

// One shift's attempts: every horizontal run, at this distance from the midpoint.
const atShift = (scene: { ask: SearchAsk; pill: number; tall: number; midX: number; d: number; candidates: readonly number[] }): Found => {
	const { ask, pill, tall, midX, d, candidates } = scene;
	for (const y of candidates) {
		const found = atRun({ ask, pill, tall, midX, d, y });
		if (found) return found;
	}
	return null;
};

const nearRuns = (ask: SearchAsk, pill: number, tall: number): Found => {
	const xs = ask.link.points.map((pt) => pt[0]);
	const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
	const candidates = runsOf(ask.link);
	const step = Math.max(4, tall / 2);
	const maxShift = Math.min(700, Math.max(240, (Math.max(...xs) - Math.min(...xs)) / 2 + pill));
	for (let d = 0; d <= maxShift; d += step) {
		const found = atShift({ ask, pill, tall, midX, d, candidates });
		if (found) return found;
	}
	return null;
};

// Pass 2: bounded sweep of the arrow's own neighbourhood.
const nearSpan = (ask: SearchAsk, pill: number, tall: number): Found => {
	const xs = ask.link.points.map((pt) => pt[0]);
	const ys = ask.link.points.map((pt) => pt[1]);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const y0 = Math.max(3, minY - tall - 12);
	const y1 = Math.min(ask.height - tall - 2, maxY + 12);
	const x0 = Math.max(pill / 2 + 2, Math.min(...xs) - pill);
	const x1 = Math.min(ask.width - pill / 2 - 2, Math.max(...xs) + pill);
	for (let top = y0; top <= y1; top += Math.max(6, tall)) {
		for (let cx = x0; cx <= x1; cx += Math.max(8, pill)) {
			const found = trySpot({ ask, cx, top, pill, tall });
			if (found) return found;
		}
	}
	return null;
};

// Pass 3: a coarse row-major pass from the arrow outwards. Coarse steps keep it
// a few thousand candidates at most.
const coarseSweep = (ask: SearchAsk, pill: number, tall: number): Found => {
	const xs = ask.link.points.map((pt) => pt[0]);
	const ys = ask.link.points.map((pt) => pt[1]);
	const minY = Math.min(...ys);
	const midY = (minY + Math.max(...ys)) / 2;
	const stepX = Math.max(16, pill * 0.5);
	const stepY = Math.max(10, tall * 0.75);
	const startY = Math.max(3, Math.min(minY - tall, midY - tall));
	const startX = Math.max(pill / 2 + 2, Math.min(...xs) - pill);
	let tries = 0;
	for (let top = startY; top + tall <= ask.height - 2 && tries < 4000; top += stepY) {
		for (let cx = startX; cx <= ask.width - pill / 2 - 2; cx += stepX) {
			tries += 1;
			if (tries > 4000) break;
			const found = trySpot({ ask, cx, top, pill, tall });
			if (found) return found;
		}
	}
	return null;
};

// Place one link's label: the first legal spot of the three passes, remembered
// in the grid so the next label keeps clear of it.
export const placeLabel = (scene: { link: Link; width: number; height: number; links: readonly Link[]; grid: Occupancy }): void => {
	const { link, width, height, links, grid } = scene;
	const { w: pill, h: tall } = pillSize(link.edge);
	const others = links.filter((o) => o !== link).flatMap(segmentsOf);
	const ask: SearchAsk = { link, width, height, others, grid };
	const found = nearRuns(ask, pill, tall) ?? nearSpan(ask, pill, tall) ?? coarseSweep(ask, pill, tall);
	if (found) {
		link.lx = found.cx;
		link.ly = found.rect.y + 8.5;
		grid.occupy(found.rect);
	}
};

export type { SearchAsk, Found };

"use strict";

// THE VERTICAL LANES. One counter for EVERY vertical run, keyed by the strip it
// stands in: two arrows — of the same action or of different ones — never share
// a vertical line, so a green `call` and a blue `import` can never look like one
// arrow. A lane lives in the EMPTY STRIP between two columns and nowhere else;
// lanes are spread EVENLY across the usable part, never past the strip.

import type { Plan } from "./routing";
import type { Box } from "./types";

// Count the lanes each strip needs before placing any: every lane of a strip
// gets its own x inside the strip, however many there are.
const laneCountsOf = (plans: readonly Plan[], positions: Map<string, Box>): Map<string, number> => {
	const counts = new Map<string, number>();
	for (const p of plans) {
		const a = positions.get(p.edge.from);
		const b = positions.get(p.edge.to);
		if (!a || !b) continue;
		const exitX = p.forward ? a.x + a.w : a.x;
		const entryX = p.forward ? b.x : b.x + b.w;
		const outKey = `out|${Math.round(exitX)}`;
		counts.set(outKey, (counts.get(outKey) ?? 0) + 1);
		if (p.side !== "gap" && p.side !== "gap-back") {
			const inKey = `in|${Math.round(entryX)}`;
			counts.set(inKey, (counts.get(inKey) ?? 0) + 1);
		}
	}
	return counts;
};

// The lane allocator: each call takes the next lane of its strip, evenly spread
// across the usable width (a margin off both box edges keeps wires off plates).
type LaneAt = (base: number, dir: number, key: string) => number;

const lanesOf = (plans: readonly Plan[], positions: Map<string, Box>, gap: number): LaneAt => {
	const counts = laneCountsOf(plans, positions);
	const margin = Math.min(14, gap * 0.15);
	const used = new Map<string, number>();
	return (base, dir, key) => {
		const n = used.get(key) ?? 0;
		used.set(key, n + 1);
		const total = counts.get(key) ?? 1;
		const usable = gap - margin * 2;
		// Evenly spread, never past the strip: with one lane it sits at the near
		// third, with many they fill the strip but stay inside it.
		const step = usable / (total + 1);
		return base + dir * (margin + step * (n + 1));
	};
};

export { lanesOf };
export type { LaneAt };

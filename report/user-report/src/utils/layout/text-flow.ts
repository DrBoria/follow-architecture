"use strict";

// WHERE the text of a box goes and how tall the block is — ONE arithmetic,
// shared by the layout (which sizes the box) and the renderer (which draws the
// lines), and ONE rhythm: every line is 12px below the one above it, whatever it
// is — the name, a place, `+N more`, a `↻` badge. Two copies of this arithmetic
// is how a badge ended up printed on the place line above it; several different
// steps is why the box read as ragged.

import type { LayoutNode } from "./types";

// Sized so four columns fit a normal side panel; the canvas scales to the
// panel width, so nothing is ever cut in half at the edge.
export const COL = { width: 200, gapX: 92, row: 70, gapY: 46 };

export const LINE = 12;

// The text block's line positions and total height.
type TextFlow = { nameY: number; placeYs: number[]; overflowY: number | null; labelY: number | null; badgeYs: number[]; height: number };

const lineY = (i: number): number => 16 + i * LINE;

// The place lines and the `+N more` line (on the NEXT line of the same rhythm).
const placeLines = (places: number): { placeYs: number[]; overflowY: number | null; shown: number } => {
	const shown = Math.min(places, 3);
	const placeYs: number[] = [];
	for (let i = 0; i < shown; i += 1) placeYs.push(lineY(1 + i));
	const overflowY = places > 3 ? lineY(1 + shown) : null;
	return { placeYs, overflowY, shown };
};

// How many text lines the block has: the places (plus overflow), or the one
// description line, or none.
const textLineCount = (places: number, shown: number, labelY: number | null): number => {
	if (places) return shown + (places > 3 ? 1 : 0);
	return labelY != null ? 1 : 0;
};

// The self-rule badge lines, one per loop, below the text block.
const badgeLines = (loops: number, textLines: number): number[] =>
	Array.from({ length: loops }, (_, i) => lineY(1 + textLines + i));

// The description line a placeless box may carry (a `label` or its own `note`).
const sublineOf = (node: LayoutNode | null | undefined, places: number, label: string | null): number | null => {
	const subline = label ?? node?.note ?? null;
	return !places && subline ? lineY(1) : null;
};

export const textFlow = (node: LayoutNode | null | undefined, loops = 0, label: string | null = null): TextFlow => {
	const places = node?.places?.length ?? 0;
	const { placeYs, overflowY, shown } = placeLines(places);
	const labelY = sublineOf(node, places, label);
	const badgeYs = badgeLines(loops, textLineCount(places, shown, labelY));
	const last = badgeYs.length ? badgeYs[badgeYs.length - 1] : lineY(textLineCount(places, shown, labelY));
	return { nameY: lineY(0), placeYs, overflowY, labelY, badgeYs, height: last + 8 };
};

"use strict";

// WHAT IS WRITTEN ON AN ARROW, line by line: one action per line (a merged pair
// carries several), then HOW the same code may be reached without an import —
// `getRoot(…)`, `getParent(…)` and the rest of the role's `scopeAccess`. The
// prefix is part of the TEXT, not of the renderer: the pill's width is measured
// from these strings, and a label the layout thinks is narrower than it is
// drawn is exactly how a pill ends up on top of an arrow.

import type { LayoutEdge } from "./types";

export const edgeLines = (edge: LayoutEdge): { kinds: string[]; via: string[] } => {
	const kinds = (edge.kinds ?? [edge.kind]).map(String);
	const scope = edge.scope ?? [];
	if (!scope.length) return { kinds, via: [] };
	const via: string[] = [];
	for (let i = 0; i < scope.length; i += 3) {
		const chunk = scope.slice(i, i + 3).join(", ");
		via.push(i === 0 ? `via ${chunk}` : chunk);
	}
	return { kinds, via };
};

const CHAR_W = 5.4;
const LINE_H = 11;
const labelWidth = (text: string): number => String(text ?? "").length * CHAR_W + 10;

// The widest line decides the pill's width; the number of lines its height.
export const pillSize = (edge: LayoutEdge): { w: number; h: number; count: number } => {
	const { kinds, via } = edgeLines(edge);
	const lines = [...kinds, ...via];
	return { w: Math.max(...lines.map(labelWidth)), h: lines.length * LINE_H + 2, count: lines.length };
};

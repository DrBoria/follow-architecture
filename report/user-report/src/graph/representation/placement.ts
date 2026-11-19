"use strict";

// THE shared picture core for "the code may not stay as it is": one source box
// crossed out, one arrow per destination, each landing point ticked. A refused
// RELATION (wrongAction) and a wrong PLACE (wrongPlacement) are the same drawing
// — the boxes are fine or wrong, the arrows say where the code goes — so the
// walk lives here once; each representation names its own arrows and caption.

import type { ProblemEdge, Mark, Built } from "./contract";

// One arrow per destination, all broken (the finding IS these arrows).
const brokenEdges = (from: string, to: readonly string[], kind: string): ProblemEdge[] =>
	to.map((dest) => ({ from, to: dest, kind, broken: true }));

// The source crossed, every destination ticked.
const placementMarks = (from: string, to: readonly string[]): Record<string, Mark> => {
	const marks: Record<string, Mark> = { [from]: "wrong" };
	for (const dest of to) marks[dest] = "right";
	return marks;
};

// The placement picture: crossed source, ticked destinations, broken arrows.
const placementView = (from: string, to: readonly string[], kind: string): Built => ({
	edges: brokenEdges(from, to, kind),
	marks: placementMarks(from, to),
});

export { brokenEdges, placementMarks, placementView };

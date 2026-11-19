"use strict";

// A CLIMB is one mechanism: start at a node and walk up until the holder the
// caller names is found. Some climbs pass only through wrappers that carry
// nothing of their own (the doc reader climbs from a template to the statement
// holding its comment, `css/template`); some consider every ancestor (the JSX
// reader climbs to its nearest function-like owner, `frameworks/react`). The
// walk is the same — only the holder test and the pass-through test differ —
// so it lives here once, and each reader supplies its own verdicts.

import type { Node } from "ts-morph";

// The caller's verdicts, asked of each node on the way up.
interface ClimbVerdicts {
	// Is this node the holder the climb is looking for?
	isHolder: (node: Node) => boolean;
	// May the climb pass THROUGH this node — a wrapper that carries nothing of
	// its own? Absent means every ancestor is considered.
	passesThrough?: (node: Node) => boolean;
}

// Where the climb stopped: the holder when one was found, otherwise the last
// node reached (a caller that documents a wrapper reads the wrapper's own
// comments; a caller that needs an owner reads `found` and takes null).
type ClimbStop = { node: Node; found: boolean };

const climbFrom = (start: Node, { isHolder, passesThrough }: ClimbVerdicts): ClimbStop => {
	let current: Node = start;
	for (;;) {
		if (isHolder(current)) return { node: current, found: true };
		if (passesThrough && !passesThrough(current)) return { node: current, found: false };
		const parent = current.getParent();
		if (!parent) return { node: current, found: false };
		current = parent;
	}
};

export { climbFrom };
export type { ClimbVerdicts, ClimbStop };

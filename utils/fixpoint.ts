"use strict";

// A FIXPOINT is one mechanism: a step changes state and reports whether it did,
// and the walk repeats until a step changes nothing (or a stated pass limit is
// reached). Role assignment and call-target resolution feed each other — a
// role may be inferred from the roles of the callees, while a callee's role is
// what classification resolves — so the passes repeat until nothing moves.
// The walk is the same for any mutually-feeding enrichment; what a step DOES
// is the caller's own.

// Run `step` until it reports no change, at most `maxPasses` times. The first
// pass always runs; the step's own verdict decides every next one.
const untilStable = (step: () => boolean, maxPasses: number): void => {
	for (let pass = 0; pass < maxPasses; pass += 1) {
		if (!step()) return;
	}
};

export { untilStable };
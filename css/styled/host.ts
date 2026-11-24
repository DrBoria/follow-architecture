"use strict";

// The piece a fact belongs to: the candidate whose line span contains the
// fact's line, the tightest one when several do. A decorated wrapper must not
// swallow its inner declaration, and when a one-line file makes two spans
// identical (`const X = () => …` yields the declaration AND the arrow), the CODE
// one wins — the class list belongs to the function, not to the binding.
// When two candidates share a span, the code one is the one emitted LATER by
// the AST module — its own candidate comes after the declaration it is
// initialised in. No list of kinds: the order is the fact.
//
// This question is syntax- and framework-agnostic: a template, a class
// attribute, anything located by a line asks it the same way.

import type { Candidate } from "../../entities/facts";

const spansLine = (candidate: Candidate, line: number): boolean =>
	Array.isArray(candidate.lines) && candidate.lines.length > 0 && candidate.lines[0] <= line && line <= candidate.lines[candidate.lines.length - 1];

const isLater = (a: Candidate, b: Candidate, list: readonly Candidate[]): number => list.indexOf(b) - list.indexOf(a);

const hostOf = (candidates: readonly Candidate[], line: number | null): Candidate | undefined => {
	if (line === null) return undefined;

	return [...candidates]
		.filter((candidate) => spansLine(candidate, line))
		.sort((a, b) => (a.lines?.length ?? 0) - (b.lines?.length ?? 0) || isLater(a, b, candidates))[0];
};

export { hostOf };

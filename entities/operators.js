"use strict";

// The operator vocabulary AS THE REPORT READS IT: which keys stand for a list,
// which of them say "one of them", and how a scalar operator is spelled for a
// human. Two readers share it — the Node-side summarizer (`data/invariants.js`)
// and the browser describer (`src/utils/describe.js`) — because they used to
// carry the same three tables twice and printed two different truths.
//
// The ENGINE's own operator sets stay in `entities/queries.js`: the matcher
// knows more than it can print, and printing is not matching.

// A key that walks INTO a list rather than addressing a field.
const CONTAINERS = new Set(["some", "every", "none", "length", "where", "filter", "by"]);

// …of those, the ones that say "one of them": they read as `[*]` in a path.
const QUANTIFIERS = new Set(["some", "every", "none", "any"]);

// A scalar operator, spelled the way a reader expects to see it.
const SCALAR_OPS = {
	gt: ">",
	gte: "≥",
	lt: "<",
	lte: "≤",
	equals: "=",
	in: "in",
	not: "≠",
	isSet: "is set",
	matches: "matches",
};

module.exports = { CONTAINERS, QUANTIFIERS, SCALAR_OPS };

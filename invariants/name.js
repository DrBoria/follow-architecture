"use strict";

// Name and variable helpers for the invariant gates: the capture variables a
// file contributes to reports.

const fileVars = (ctx) => {
	// The file's `location` is the one place fact (it is what `location:` filters
	// and `{fileName}`/`{files}` read), so the report takes its path and folder
	// from there — not from a second copy of the same two strings.
	const loc = ctx.facts?.location ?? {};

	return { path: loc.path ?? ctx.rel, dir: loc.dir ?? ctx.dir, basename: ctx.basename };
};

module.exports = { fileVars };

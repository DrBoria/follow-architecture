"use strict";

// Name and variable helpers for the invariant gates: the capture variables a
// file contributes to reports.

const { dirOf } = require("../entities/location");

const fileVars = (ctx) => {
	// The file's `location` is the one place fact (it is what `location:` filters
	// and `{fileName}`/`{files}` read), so the report takes its path and folder
	// from there — not from a second copy of the same two strings.
	const loc = ctx.facts?.location ?? {};
	const path = loc.path ?? ctx.rel;

	// The folder is the path minus its last segment — derived here, not stored on
	// the place: `location` keeps `path` and `segments`, and a `dir` field beside
	// them would be the same string twice.
		return { path, dir: dirOf(path), basename: ctx.basename };
};

module.exports = { fileVars };

"use strict";

// Name and variable helpers for the invariant gates: the capture variables a
// file contributes to reports.

import { dirOf } from "../entities/location";

// What a capture variable is built from: the file's own facts (its `location`),
// the file path, and the bare file name.
type FileVarsCtx = { facts?: { location?: { path?: string } | null } | null; rel?: string | null; basename?: string };
type FileVars = { path: string | undefined; dir: string; basename: string | undefined };

const fileVars = (ctx: FileVarsCtx): FileVars => {
	// The file's `location` is the one place fact (it is what `location:` filters
	// and `{fileName}`/`{files}` read), so the report takes its path and folder
	// from there — not from a second copy of the same two strings.
	const loc = ctx.facts?.location ?? {};
	const path = loc.path ?? ctx.rel ?? undefined;

	// The folder is the path minus its last segment — derived here, not stored on
	// the place: `location` keeps `path` and `segments`, and a `dir` field beside
	// them would be the same string twice.
	return { path, dir: dirOf(path), basename: ctx.basename };
};

export { fileVars };

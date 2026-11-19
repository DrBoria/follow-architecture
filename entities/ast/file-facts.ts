"use strict";

// WHAT IS IN THE FILE — every way code enters and leaves the module, the files
// around it, and every meaningful node below it. The imports/exports readers
// live in `file-imports` / `file-exports`; this module puts the file's facts
// together. Loading lives in `project`, declaration-following in `resolve`.

import { type SourceFile } from "ts-morph";
import { linesOf, descriptor, descendantsOf } from "./tree";
import { readsFact } from "./properties";
import { importNameModules } from "./resolve";
import { importsOf } from "./file-imports";
import { exportsOf } from "./file-exports";
import { placeOf } from "../location";
import type { AliasMap } from "./project";
import type { FileFacts, Candidate } from "../facts";

// Raw facts about a whole file. `repoFiles` is the repo-relative file list used
// to compute the folder facts.
interface CollectOptions {
	rel: string;
	repoFiles?: string[];
	aliases?: AliasMap;
	repoRoot: string;
	candidates?: Candidate[];
}

const collectFileFacts = (sf: SourceFile, options: CollectOptions): FileFacts => {
	const { rel, repoFiles, aliases, repoRoot, candidates } = options;
	// The import map is rebuilt here because reads are a FILE fact, not a
	// per-candidate one: a read is a property of the file's surface.
	const importMap = importNameModules(sf, repoRoot, aliases, repoFiles);
	const exports = exportsOf(sf, importMap, options);
	const imports = importsOf(sf, options);
	const reads = readsFact(sf, importMap);

	return {
		// The whole file, as one array of lines: `lines[0]` is the first,
		// `lines.length` the count.
		lines: linesOf(sf),
		imports,
		exports,
		// WHERE this file is — one fact, built by `entities/location.placeOf`: the
		// names it is made of, its parts, its folder, its parent, its neighbours and
		// its position among them. Nothing about the place is computed here.
		location: placeOf(rel, repoFiles),
		reads,
		// What is in the file: its own node, and every node below it.
		kind: { own: descriptor(sf), descendants: descendantsOf(sf) },
		candidates: candidates ?? [],
		roles: [...new Set((candidates ?? []).map((c) => c.role).filter((r): r is string => Boolean(r)))],
	};
};

export { collectFileFacts };
export type { CollectOptions };
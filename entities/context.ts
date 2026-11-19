"use strict";

// THE run context — what every check layer is handed about the file being
// checked. The pipeline builds it once; the node checks, the invariant runtime
// and the report read it through this ONE shape. `facts` and `roles` are filled
// as the pipeline progresses, so they are optional here — a layer runs only
// after the phase that fills what it reads.

import type { Project, SourceFile } from "ts-morph";
import type { Arch } from "./architecture";
import type { FileFacts } from "./facts";
import type { Facts } from "./kinds";
import type { ResolveContext } from "../utils/imports";

// The file's facts plus the repo file list — the invariants' filter target.
type RunFacts = Facts;

type FileContext = {
	abs?: string;
	rel: string;
	dir?: string;
	basename?: string;
	sf?: SourceFile;
	repoRoot?: string;
	aliases?: Record<string, string>;
	// The built architecture — present in a full run; the invariant runtime
	// also serves plain fact sets (a test, a facet probe) without one.
	arch?: Arch;
	roles?: string[];
	roleCtx?: { present: string[]; candidates: FileFacts["candidates"] } | null;
	facts?: RunFacts | null;
	repoFiles?: string[];
	// Shared across the run: lets node-level checks report once per folder
	// instead of once per file inside it.
	dedupe?: Map<string, Set<string>>;
};

// What a per-file scan needs from the run: the resolver's own view of the repo
// (root, aliases, file list — ONE description, `utils/imports`) plus the parsed
// project. Depth and similarity walks take this view.
type ScanContext = ResolveContext & { project: Project };

export type { FileContext, RunFacts, ScanContext };
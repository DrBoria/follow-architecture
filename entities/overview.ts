"use strict";

// THE overview payload contract — the ONE description of what the Node-side
// builders produce and the browser app renders. The payload is plain JSON
// inlined into the HTML, so every shape here is plain data (no Map, no RegExp).
//
// Two layers:
//   • the BUILD inputs (`OverviewInput`) — what a run hands the collector;
//   • the PAYLOAD (`OverviewData` and its sections) — DERIVED from the one
//     producer (`collectOverviewData`), so the browser and the builder can
//     never disagree about a field. The browser imports these types only
//     (`import type`), which esbuild erases — no Node code enters the bundle.

import type { Project } from "ts-morph";
import type { Arch } from "./architecture";
import type { Finding } from "./findings";

// Everything the overview is built from. `architecturePath` may be absent (the
// config that was loaded is then its own label).
type OverviewInput = {
	arch: Arch;
	findings: Finding[];
	orphans: string[];
	files: string[];
	repoFiles: string[];
	repoRoot: string;
	architecturePath: string | null;
	project: Project;
	generatedAt?: string;
};

export type { OverviewInput };

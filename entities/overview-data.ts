"use strict";

// THE overview payload — the single JSON object the browser app renders.
// DERIVED from the one producer (`collectOverviewData`): every section type is
// the return type of its builder, so the browser and the Node builders can
// never disagree about a field. The browser imports these types only
// (`import type`), which esbuild erases — no Node code enters the bundle.
//
// The section shapes live in their own modules (named beside their producers'
// contracts); this module assembles them into the whole payload.

import type { AccessGraph } from "./access-graph";
import type { EnrichedFinding } from "./enriched-finding";
import type { FileTreeEntry } from "./file-tree";
import type { InvariantSummary, NodeSummary, RoleSummary } from "./overview-summaries";

// One counted group: a key and how many findings carry it.
type CountGroup = { key: string; count: number };

type OverviewMeta = {
	repoRoot: string;
	repoName: string;
	architecturePath: string;
	generatedAt: string;
	filesScanned: number;
	orphans: string[];
};

type OverviewStats = {
	nodes: number;
	folders: number;
	fileNodes: number;
	roles: number;
	invariants: number;
	findings: number;
	filesWithFindings: number;
	edges: number;
	orphans: number;
};

type OverviewData = {
	meta: OverviewMeta;
	stats: OverviewStats;
	nodes: NodeSummary[];
	access: AccessGraph;
	roles: RoleSummary[];
	invariants: InvariantSummary[];
	findings: EnrichedFinding[];
	fileTree: FileTreeEntry;
	groups: { byCategory: CountGroup[]; byInvariant: CountGroup[]; byNode: CountGroup[] };
};

export type { CountGroup, OverviewMeta, OverviewStats, OverviewData };

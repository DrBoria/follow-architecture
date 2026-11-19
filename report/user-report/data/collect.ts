"use strict";

// Assemble the single JSON payload the overview UI renders. Everything the
// browser needs is computed here, so the React bundle stays dumb and the HTML
// file is fully self-contained (openable from disk, no server, no network).

import * as path from "node:path";
import { buildNodes } from "./nodes";
import { buildRoles } from "./roles";
import { buildInvariants } from "./invariants";
import { enrichFindings } from "./findings";
import { buildFileTree } from "./file-tree";
import { buildAccessGraph } from "./graph";
import { countBy } from "../../../utils/count";
import type { OverviewInput } from "../../../entities/overview";
import type { OverviewData } from "../../../entities/overview-data";

const collectOverviewData = (input: OverviewInput): OverviewData => {
	const { arch, findings, orphans, files, repoFiles, repoRoot, architecturePath, project, generatedAt } = input;
	const { nodes } = buildNodes({ arch, files, repoRoot });
	const enriched = enrichFindings({ findings, arch, nodes });
	const roles = buildRoles({ arch, files, repoRoot, repoFiles, project, nodes });
	const invariants = buildInvariants(arch, findings);
	// Folder→folder arrows, derived from the role actions. This is what the
	// Graph screen draws and what the tree highlights.
	const access = buildAccessGraph({ arch, nodes, findings: enriched });

	return {
		meta: {
			repoRoot,
			repoName: path.basename(repoRoot),
			architecturePath: architecturePath ? path.relative(repoRoot, architecturePath) : "the architecture config",
			generatedAt: generatedAt ?? new Date().toISOString(),
			filesScanned: files.length,
			orphans: orphans ?? [],
		},
		stats: {
			nodes: nodes.length,
			folders: nodes.filter((n) => !n.isFile).length,
			fileNodes: nodes.filter((n) => n.isFile).length,
			roles: roles.length,
			invariants: invariants.length,
			findings: enriched.length,
			filesWithFindings: new Set(enriched.map((f) => f.file)).size,
			edges: access.edges.length,
			orphans: (orphans ?? []).length,
		},
		nodes,
		access,
		roles,
		invariants,
		findings: enriched,
		fileTree: buildFileTree({ files, arch, findings: enriched }),
		groups: {
			byCategory: countBy(enriched, (f) => f.category),
			byInvariant: countBy(enriched, (f) => f.invariant ?? "structure"),
			byNode: countBy(enriched, (f) => f.ownerNode ?? "—"),
		},
	};
};

export { collectOverviewData };

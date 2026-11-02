"use strict";

// Assemble the single JSON payload the overview UI renders. Everything the
// browser needs is computed here, so the React bundle stays dumb and the HTML
// file is fully self-contained (openable from disk, no server, no network).

const path = require("node:path");
const { buildNodes } = require("./nodes");
const { buildRoles } = require("./roles");
const { buildInvariants } = require("./invariants");
const { enrichFindings } = require("./findings");
const { buildFileTree } = require("./file-tree");
const { buildAccessGraph } = require("./graph");

const countBy = (list, keyFn) => {
	const map = new Map();
	for (const item of list) {
		const key = keyFn(item);
		map.set(key, (map.get(key) ?? 0) + 1);
	}
	return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
};

const collectOverviewData = ({ arch, findings, orphans, files, repoFiles, repoRoot, architecturePath, project, generatedAt }) => {
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
			// The overview shows the path it was generated from; when the caller gave none,
			// the config that was loaded is its own label.
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

module.exports = { collectOverviewData };

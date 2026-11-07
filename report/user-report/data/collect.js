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
const { buildCss } = require("./css");
const { buildFrameworks } = require("./frameworks");
const { buildFrameworkFolder } = require("./framework-folder");

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
	// Two FACET readings of the same files. They are computed here, next to the
	// nodes, because the folder screen needs both the framework rows and the
	// engine's own node resolution.
	const css = buildCss({ files });
	const frameworks = buildFrameworks({ files });
	const frameworkFolder = buildFrameworkFolder({ components: frameworks.components, arch });

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
			cssFiles: css.totals.files,
			cssLiterals: css.totals.literals,
			components: frameworks.totals.components,
			drilled: frameworks.totals.drilled,
		},
		nodes,
		access,
		roles,
		invariants,
		findings: enriched,
		fileTree: buildFileTree({ files, arch, findings: enriched }),
		css,
		frameworks,
		frameworkFolder,
		groups: {
			byCategory: countBy(enriched, (f) => f.category),
			byInvariant: countBy(enriched, (f) => f.invariant ?? "structure"),
			byNode: countBy(enriched, (f) => f.ownerNode ?? "—"),
		},
	};
};

module.exports = { collectOverviewData };

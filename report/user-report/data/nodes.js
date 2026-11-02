"use strict";

// Node summaries for the overview: every declared folder/file node with its
// resolved paths, allowed children, and the real files that land in it.
//
// A node is STRUCTURE only: a folder, and the children it allows. Its `role:`
// children are what give a codeRole a home, so they are shown here.

const path = require("node:path");
const { deepestMatch } = require("../../../nodes/tree");
const { missingRequiredChild } = require("../../../nodes/finally");
const { lineCount, snippet } = require("./scan");

const rawList = (raw) => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	return Object.entries(raw).map(([slug, v]) => ({ slug: v.slug ?? slug, ...v }));
};

const childName = (c) => {
	if (typeof c === "string") return c;
	const base = c.node ? `→ ${c.node}` : c.name ?? JSON.stringify(c);
	const roles = Array.isArray(c.role) ? c.role : c.role ? [c.role] : [];
	return roles.length ? `${base} → ${roles.join(", ")}` : base;
};

// Files that land in a folder which failed its node's `required` children are
// NOT in the tree: that folder is not a node of the architecture (the structure
// rule reports it), so counting its files under the node would claim they live
// somewhere legal.
const fileLanding = (files, arch) => {
	const byNode = new Map();
	for (const rel of files) {
		const hit = deepestMatch(rel, arch);
		if (!hit) continue;
		if (missingRequiredChild(hit.node, arch, rel, files)) continue;
		const slug = hit.node.slug;
		if (!byNode.has(slug)) byNode.set(slug, []);
		byNode.get(slug).push(rel);
	}
	return byNode;
};

const buildNodes = ({ arch, files, repoRoot }) => {
	const rawBySlug = new Map(rawList(arch.raw?.nodes).map((n) => [n.slug, n]));
	const landings = fileLanding(files, arch);

	const nodes = arch.nodes.all.map((n) => {
		const raw = rawBySlug.get(n.slug) ?? {};
		const owned = (landings.get(n.slug) ?? []).sort();
		return {
			slug: n.slug,
			name: n.name,
			paths: n.variants.map((v) => v.path),
			isFile: Boolean(n.isFile),
			parents: n.parents.filter(Boolean),
			children: (raw.children ?? []).map(childName),
			report: typeof raw.report === "string" ? raw.report : raw.report?.message ?? null,
			files: owned.slice(0, 40),
			fileCount: owned.length,
			lineCount: owned.reduce((sum, rel) => sum + lineCount(path.join(repoRoot, rel)), 0),
			exampleFile: owned[0] ?? null,
			sample: owned[0] ? { file: owned[0], ...snippet(path.join(repoRoot, owned[0]), 1, { max: 12 }) } : null,
		};
	});

	// Which code roles this node gives a home to: its own `role:` children.
	// The declaration lives on the child; this is the reverse view.
	for (const node of nodes) {
		node.roles = Object.keys(arch.nodes?.roleHomes ?? {}).filter((role) =>
			arch.nodes.roleHomes[role].some((h) => h.node === node.slug),
		);
	}

	return { nodes };
};

module.exports = { buildNodes, rawList };

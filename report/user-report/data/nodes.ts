"use strict";

// Node summaries for the overview: every declared folder/file node with its
// resolved paths, allowed children, and the real files that land in it.
//
// A node is STRUCTURE only: a folder, and the children it allows. Its `role:`
// children are what give a codeRole a home, so they are shown here.

import * as path from "node:path";
import { deepestMatch } from "../../../entities/tree";
import { missingRequiredChild } from "../../../nodes/finally";
import { lineCount, snippet } from "./scan";
import { keyedDefs } from "../../../utils/keyed";
import { isObj, toList } from "../../../utils/field";
import { stringField } from "../../../utils/read-field";
import type { Arch, ArchNode, RawChild, RawNode } from "../../../entities/architecture";
import type { NodeSummary } from "../../../entities/overview-summaries";

// The nodes section as a list — the shared list-or-map walk, the same one the
// tree builder reads. A map value that is not a record is dropped (null).
const rawList = (raw: Arch["raw"]["nodes"]): RawNode[] => keyedDefs(raw).filter((n): n is RawNode => n != null);

const childName = (c: RawChild): string => {
	if (typeof c === "string") return c;
	const base = c.node ? `→ ${c.node}` : c.name ?? JSON.stringify(c);
	const roles = toList(c.role).filter((r): r is string => typeof r === "string");
	return roles.length ? `${base} → ${roles.join(", ")}` : base;
};

// Files that land in a folder which failed its node's `required` children are
// NOT in the tree: that folder is not a node of the architecture, so counting
// its files under the node would claim they live somewhere legal.
const fileLanding = (files: readonly string[], arch: Arch): Map<string, string[]> => {
	const byNode = new Map<string, string[]>();
	for (const rel of files) {
		const hit = deepestMatch(rel, arch);
		if (!hit) continue;
		if (missingRequiredChild(hit.node, arch, rel, [...files])) continue;
		const slug = hit.node.slug;
		const list = byNode.get(slug);
		if (list) list.push(rel);
		else byNode.set(slug, [rel]);
	}
	return byNode;
};

const reportText = (raw: RawNode): string | null => {
	const report = raw.report;
	if (typeof report === "string") return report;
	return isObj(report) ? stringField(report, "description") || stringField(report, "message") || null : null;
};

const nodeSummary = (n: ArchNode, raw: RawNode, owned: string[], repoRoot: string): NodeSummary => ({
	slug: n.slug,
	name: n.name,
	paths: n.variants.map((v) => v.path),
	isFile: Boolean(n.isFile),
	parents: n.parents.filter((p): p is string => Boolean(p)),
	children: (raw.children ?? []).map(childName),
	report: reportText(raw),
	files: owned.slice(0, 40),
	fileCount: owned.length,
	lineCount: owned.reduce((sum, rel) => sum + lineCount(path.join(repoRoot, rel)), 0),
	exampleFile: owned[0] ?? null,
	sample: owned[0] ? { file: owned[0], ...snippet(path.join(repoRoot, owned[0]), 1, { max: 12 }) } : null,
	roles: [],
});

// Which code roles this node gives a home to: its own `role:` children.
const rolesOfNode = (slug: string, arch: Arch): string[] =>
	Object.keys(arch.nodes.roleHomes).filter((role) => arch.nodes.roleHomes[role].some((h) => h.node === slug));

const buildNodes = (args: { arch: Arch; files: readonly string[]; repoRoot: string }): { nodes: NodeSummary[] } => {
	const { arch, files, repoRoot } = args;
	const rawBySlug = new Map(rawList(arch.raw.nodes).map((n) => [n.slug, n]));
	const landings = fileLanding(files, arch);

	const nodes = arch.nodes.all.map((n) => {
		const raw = rawBySlug.get(n.slug) ?? { name: n.name };
		const owned = (landings.get(n.slug) ?? []).sort();
		const summary = nodeSummary(n, raw, owned, repoRoot);
		summary.roles = rolesOfNode(n.slug, arch);
		return summary;
	});

	return { nodes };
};

export { buildNodes, rawList };

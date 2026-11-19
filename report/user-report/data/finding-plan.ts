"use strict";

// The before/after PLAN for one finding: where the code is, where it belongs,
// and who may import the target. The plan is read from the engine's own answers
// (the owner node, the destination, the declared import action) — never invented.

import { declaredActions } from "../../../entities/kinds";
import type { Arch, ArchNode, WhereEntry } from "../../../entities/architecture";
import type { NodeSummary } from "../../../entities/overview-summaries";
import type { Plan, PlanPlace } from "../../../entities/enriched-finding";

// An action's `from` list, as the boxes the UI can show. A role names no box; a
// node or glob names one.
const splitImporters = (entries: readonly WhereEntry[]): { nodeSlugs: string[]; globs: string[]; roles: string[] } => {
	const roles: string[] = [];
	const nodes: string[] = [];
	for (const e of entries) {
		if (e.type === "role" && e.role) roles.push(e.role);
		else if (e.type === "node" && e.node) nodes.push(e.node);
		else if (e.type === "glob" && e.glob) nodes.push(e.glob);
	}
	return { nodeSlugs: [...new Set(nodes)], globs: [], roles: [...new Set(roles)] };
};

const placeOf = (node: { slug: string; paths?: string[]; path?: string } | null | undefined): PlanPlace | null => {
	if (!node) return null;
	const paths = node.paths ?? (node.path ? [node.path] : []);
	return { node: node.slug, paths };
};

const buildPlan = (args: { role: string | null; ownerNode: ArchNode | null; destination: ArchNode | null; targetNode: NodeSummary | null; arch: Arch }): Plan => {
	const { role, ownerNode, destination, targetNode, arch } = args;
	const ownerPaths = ownerNode ? [ownerNode.path] : [];
	// Who may import the target's ROLE — the action lives on the role now.
	const action = role ? (declaredActions(arch).get("import")?.get(role) ?? null) : null;
	const importers = splitImporters(action?.where ?? []);
	return {
		role,
		before: { node: ownerNode?.slug ?? null, paths: ownerPaths },
		after: placeOf(destination),
		target: placeOf(targetNode),
		allowedImporters: importers.nodeSlugs,
		allowedGlobs: importers.globs,
	};
};

export { buildPlan, splitImporters };

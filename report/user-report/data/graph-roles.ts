"use strict";

// The role-level graph: one box per codeRole (with the places it may be met at
// listed inside), and one arrow per declared role→role permission. The folder
// graph is a projection onto paths; this graph is the rule itself.

import { speakOnce } from "../../../utils/speak";
import { scopeOf } from "./graph-edges";
import type { Arch, CodeRoles, WhereEntry } from "../../../entities/architecture";
import type { AccessEdge, RoleNode, GraphViolation } from "../../../entities/access-graph";

// One role box: titled by the role's NAME always; the places are listed inside
// when the tree names them, else a note says so on its own line.
const roleNode = (slug: string, name: string, arch: Arch): RoleNode => {
	const places = [...new Set((arch.nodes.roleHomes[slug] ?? []).map((h) => h.template))];
	return {
		slug,
		name,
		paths: places,
		places,
		note: places.length ? null : "no home — lives beside its caller",
		fileCount: 0,
	};
};

const roleNodes = (roles: CodeRoles, arch: Arch): RoleNode[] =>
	Object.entries(roles).map(([slug, def]) => roleNode(slug, def.name ?? slug, arch));

// One role→role arrow. The arrow follows the dependency: the actor USES the
// target. A broken rule marks the arrow.
const roleEdge = (args: { kind: string; entry: WhereEntry; scope: string[]; targetSlug: string; broken: boolean }): AccessEdge => {
	const { kind, entry, scope, targetSlug, broken } = args;
	const role = entry.role ?? "";
	return {
		kind,
		kinds: [kind],
		scope,
		...(broken ? { broken: true } : {}),
		from: role,
		to: targetSlug,
		fromPath: role,
		toPath: targetSlug,
		actor: role,
		actorRole: role,
		subject: targetSlug,
		same: Boolean(entry.same),
		via: `role ${role}`,
		target: targetSlug,
	};
};

const actionRoleEdges = (ask: { kind: string; action: { where?: WhereEntry[]; scopeAccess?: { scope: string; segments: string[] }[] | null }; targetSlug: string; violations: readonly GraphViolation[]; seen: Set<string> }): AccessEdge[] => {
	const { kind, action, targetSlug, violations, seen } = ask;
	const out: AccessEdge[] = [];
	for (const entry of action.where ?? []) {
		if (entry.type !== "role") continue;
		const key = `${kind}:${entry.role}->${targetSlug}`;
		if (!speakOnce(seen, key)) continue;
		const scope = scopeOf(entry, action);
		const broken = violations.some((v) => v.kind === kind && v.role === targetSlug);
		out.push(roleEdge({ kind, entry, scope, targetSlug, broken }));
	}
	return out;
};

const roleEdges = (roles: CodeRoles, violations: readonly GraphViolation[]): AccessEdge[] => {
	const out: AccessEdge[] = [];
	const seen = new Set<string>();
	for (const [targetSlug, def] of Object.entries(roles)) {
		for (const [kind, action] of Object.entries(def.actions ?? {})) {
			out.push(...actionRoleEdges({ kind, action, targetSlug, violations, seen }));
		}
	}
	return out;
};

export { roleNodes, roleEdges };

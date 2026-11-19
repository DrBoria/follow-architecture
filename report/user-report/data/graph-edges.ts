"use strict";

// The folder→folder edges of the access graph: one arrow per declared action,
// pointing along the dependency (from the code that is imported/used INTO the
// code that imports/uses it). Mirrored pairs are drawn once, into the container.

import { accessorLabel, labelOf } from "../../../entities/location";
import { speakOnce } from "../../../utils/speak";
import { sameInstance, homesOf } from "./graph-helpers";
import type { Arch, ActionDef, WhereEntry } from "../../../entities/architecture";
import type { NodeSummary } from "../../../entities/overview-summaries";
import type { AccessEdge, Unplaceable, Mention } from "../../../entities/access-graph";

// The scope chains carried on an edge: how the code is reached WITHOUT an
// import. An import edge carries none (the import IS the way in).
const scopeOf = (entry: WhereEntry, action: ActionDef): string[] =>
	(entry.via === "import" ? [] : action.scopeAccess ?? []).map(accessorLabel);

// The sources an entry names: a role's homes, or one node. A glob/filter names
// no folder.
const sourcesOf = (entry: WhereEntry, arch: Arch, bySlug: Map<string, NodeSummary>): NodeSummary[] => {
	if (entry.type === "role") return homesOf(entry.role ?? "", arch, bySlug);
	if (entry.type === "node") {
		const node = entry.node ? bySlug.get(entry.node) : undefined;
		return node ? [node] : [];
	}
	return [];
};

// One edge, built from the actor/subject pair the rule names.
const edgeOf = (args: { kind: string; entry: WhereEntry; action: ActionDef; actor: NodeSummary; subject: NodeSummary; targetSlug: string; rolesAt: Map<string, string[]> }): AccessEdge => {
	const { kind, entry, action, actor, subject, targetSlug, rolesAt } = args;
	return {
		kind,
		kinds: [kind],
		scope: scopeOf(entry, action),
		from: subject.slug,
		to: actor.slug,
		fromPath: subject.paths[0],
		toPath: actor.paths[0],
		actor: actor.slug,
		actorPath: actor.paths[0],
		actorRoles: rolesAt.get(actor.slug) ?? [],
		actorRole: entry.type === "role" ? entry.role ?? null : null,
		subject: subject.slug,
		subjectPath: subject.paths[0],
		fromRoles: rolesAt.get(subject.slug) ?? [],
		same: Boolean(entry.same),
		via: entry.type === "role" ? `role ${entry.role}` : `node ${entry.node}`,
		target: targetSlug,
	};
};

// The edges one action declares, plus the rules it cannot place.
type ActionAsk = { kind: string; action: ActionDef; targetSlug: string; targets: NodeSummary[]; arch: Arch; bySlug: Map<string, NodeSummary>; rolesAt: Map<string, string[]>; seen: Set<string>; unplaceable: Unplaceable[]; mentions: Record<string, Mention[]> };

// A rule that names no folder: say so, and remember the role it names as actor.
const noteUnplaceable = (entry: WhereEntry, ask: ActionAsk): void => {
	const { kind, targetSlug, targets, unplaceable, mentions } = ask;
	unplaceable.push({ kind, targetRole: targetSlug, who: labelOf(entry) });
	if (entry.type === "role" && entry.role) {
		mentions[entry.role] = mentions[entry.role] ?? [];
		mentions[entry.role].push({ kind, targetRole: targetSlug, targetPaths: targets.map((t) => t.paths[0]) });
	}
};

// The edges one actor/subject pair earns, once per (kind, pair).
const pairEdges = (entry: WhereEntry, sources: NodeSummary[], ask: ActionAsk): AccessEdge[] => {
	const { kind, action, targetSlug, targets, rolesAt, seen } = ask;
	const out: AccessEdge[] = [];
	for (const actor of sources) {
		for (const subject of targets) {
			if (entry.same && !sameInstance(actor, subject)) continue;
			const key = `${kind}:${subject.slug}->${actor.slug}`;
			if (!speakOnce(seen, key)) continue;
			out.push(edgeOf({ kind, entry, action, actor, subject, targetSlug, rolesAt }));
		}
	}
	return out;
};

const actionEdges = (ask: ActionAsk): AccessEdge[] => {
	const { action, arch, bySlug } = ask;
	const out: AccessEdge[] = [];
	for (const entry of action.where ?? []) {
		const sources = sourcesOf(entry, arch, bySlug);
		if (!sources.length) {
			noteUnplaceable(entry, ask);
			continue;
		}
		out.push(...pairEdges(entry, sources, ask));
	}
	return out;
};

// A mirrored pair (a role that may live in a container AND its children) is
// drawn ONCE, pointing into the container: every child goes in, never out.
const withoutMirrored = (edges: readonly AccessEdge[], bySlug: Map<string, NodeSummary>): AccessEdge[] => {
	const depthOf = (slug: string): number => (bySlug.get(slug)?.paths[0] ?? "").split("/").length;
	const pairs = new Map<string, AccessEdge[]>();
	for (const e of edges) {
		if (e.same || e.from === e.to) continue;
		const key = `${e.via}|${e.kind}|${[e.from, e.to].sort().join("|")}`;
		pairs.set(key, [...(pairs.get(key) ?? []), e]);
	}
	const mirrored = new Set<AccessEdge>();
	for (const list of pairs.values()) {
		if (list.length < 2) continue;
		const into = [...list].sort((a, b) => depthOf(b.from) - depthOf(a.from))[0];
		for (const e of list) if (e !== into) mirrored.add(e);
	}
	return edges.filter((e) => !mirrored.has(e));
};

export { actionEdges, withoutMirrored, scopeOf };

"use strict";

// The self-relation badges: a self-loop is a property of the folder, not a
// place on the canvas, so it is written ON the box — WITH the role that may do
// it. One badge per action, the actors merged across the edges that carry it.

import type { LayoutEdge } from "../../utils/layout";
import type { Loop } from "./NodeBox";

// One action's badge: the actors merged into the existing one, or a new badge.
const addKind = (list: Loop[], kind: string, who: readonly string[]): void => {
	const existing = list.find((l) => l.kind === kind);
	if (!existing) {
		list.push({ kind, who: [...who] });
		return;
	}
	for (const r of who) if (!existing.who.includes(r)) existing.who.push(r);
};

// One self-loop edge's badges: the named role, or the folder's roles.
const edgeLoops = (e: LayoutEdge, list: Loop[]): void => {
	const who = e.actorRole ? [e.actorRole] : e.actorRoles ?? [];
	for (const kind of e.kinds ?? [e.kind]) addKind(list, kind, who);
};

// The badges per slug: each action once, its actors deduped.
const loopKindsOf = (edges: readonly LayoutEdge[]): Map<string, Loop[]> => {
	const map = new Map<string, Loop[]>();
	for (const e of edges) {
		if (e.from !== e.to) continue;
		if (!map.has(e.from)) map.set(e.from, []);
		edgeLoops(e, map.get(e.from) ?? []);
	}
	return map;
};

export { loopKindsOf };

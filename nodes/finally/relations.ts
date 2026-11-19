"use strict";

// Relations: every file→file edge, judged by the role that owns the target.
// Collect (group the refusals), then describe (one token per group). The
// judgment of ONE edge lives in `relations-edge`; the accessor-import check
// in `relations-access`; the group's sentence in `relations-group`.

import { FACT_KINDS, EDGE_FACTS, declaredActions, type Edge } from "../../entities/kinds";
import { admitsWhenNoneReject } from "../../utils/gate";
import { judgedItems } from "../../utils/judged";
import { accumulateByKey } from "../../utils/accumulate";
import type { Arch, ActionDef } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { Violation } from "./violation";
import { judgeEdge, joinGroup } from "./relations-edge";
import { checkAccessorImports } from "./relations-access";
import { describeGroups, type RelationGroup } from "./relations-group";

// The edges of one fact kind, each once (a call and its declare are one line).
const uniqueEdges = (kind: string, edges: Edge[]): Edge[] => {
	const seen = new Set<string>();
	const out: Edge[] = [];
	for (const edge of edges) {
		const key = `${kind}:${edge.path}:${edge.line}:${edge.what}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(edge);
	}

	return out;
};

// Is this edge the closed-world rule's business? A LIBRARY is not a place the
// tree declares: `react`, `@apollo/client`, `fs` have no node and no role home,
// so there is no folder-level rule to judge them by. What a piece may do with a
// library is the CANDIDATE's own business — `infer` reads `calls.module` /
// `imports.source` directly. Skipping here keeps the closed-world rule about
// REPO code; a library edge judged against an empty home list would report
// every `styled.div` and every `useState` as a forbidden relation. The verdicts
// are the shared gate: an edge is judged when none of the skips fires.
const judgedEdge = (edge: Edge, fileRoles: readonly string[]): boolean =>
	admitsWhenNoneReject(edge, [(e) => e.external, (e) => Boolean(e.piece) && !e.role, (e) => !e.piece && !fileRoles.length]);

// The edges of one fact kind that the closed-world rule owns (not a library's,
// not an unroled piece's, not a roleless file's) — the ones it judges.
const ownedEdges = (kind: string, ctx: FileContext): Edge[] => {
	const facts = ctx.facts;
	if (!facts) return [];
	const fileRoles = facts.roles ?? [];

	return uniqueEdges(kind, EDGE_FACTS[kind](facts)).filter((e) => judgedEdge(e, fileRoles));
};

// One kind's refusals → groups. The judge-and-keep walk is the shared
// `judgedItems` core; the keyed merge is the shared `accumulateByKey` core.
// Returns whether any edge of this kind was owned (passed the skips).
const collectKind = (kind: string, actionDecls: Map<string, ActionDef>, jctx: { ctx: FileContext; arch: Arch; groups: Map<string, RelationGroup> }): boolean => {
	const { ctx, arch, groups } = jctx;
	const fileRoles = ctx.facts?.roles ?? [];
	const edges = ownedEdges(kind, ctx);
	const judgments = judgedItems(edges, (e) => judgeEdge(e, { ctx, arch, kind, actionDecls, fileRoles }));
	accumulateByKey(judgments.map(({ item, verdict }) => ({ key: verdict.key, item, bucket: verdict.group })), groups, joinGroup);

	return edges.length > 0;
};

// The refusals of every fact kind, grouped. The accessor-import check is the
// run's own question about the file's imports: the original asked it once per
// owned edge (the emitter keeps one finding per decision, so the repeated
// identical violations collapsed to one) — so it is asked once, and only when
// some edge was owned, exactly the original's condition.
const collectRefusals = (ctx: FileContext, arch: Arch, declared: Map<string, Map<string, ActionDef>>, violations: Violation[]): Map<string, RelationGroup> => {
	const groups = new Map<string, RelationGroup>();
	let anyOwned = false;
	for (const kind of FACT_KINDS) {
		if (collectKind(kind, declared.get(kind) ?? new Map<string, ActionDef>(), { ctx, arch, groups })) anyOwned = true;
	}
	if (anyOwned) checkAccessorImports(ctx, arch, declared, violations);

	return groups;
};

const checkRelations = (ctx: FileContext, arch: Arch, violations: Violation[]): void => {
	if (!ctx.facts) return;
	// 1. COLLECT — every edge judged, the refusals grouped.
	const groups = collectRefusals(ctx, arch, declaredActions(arch), violations);
	// 2. DESCRIBE — one verdict per group, built from facts and nothing else.
	describeGroups(groups, ctx, arch, violations);
};

export { checkRelations };

"use strict";

// ONE edge, judged by the role that owns its target: which target roles could
// allow it, what each declares, and whether every one of them refuses. The
// ranking picks the refusal that explains the rule best; only when EVERY
// target refuses is there a finding to group.

import { checkWhere, rolesAtPath, dirOf, accessorLabel } from "../../entities/location";
import { targetCapsFor } from "../../entities/tree";
import { RELATION, type Edge, type Facts } from "../../entities/kinds";
import { worstWhenAllRefuse } from "../../utils/verdicts";
import { permissionOf } from "../../utils/permission";
import { allowedPlaces, type AllowedPlace } from "./roles";
import type { Arch, ActionDef } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { Caps } from "../../entities/location/where";
import type { RelationGroup } from "./relations-group";

// One target role's verdict on the edge.
type Pair = { targetSlug: string; action: ActionDef & { missing?: boolean }; caps: Caps; violation: boolean; outward?: boolean };

// The judgment of one edge: the group it belongs to, keyed by kind + target +
// what was done.
type EdgeJudgment = { key: string; group: RelationGroup };

// What judging one edge needs.
type JudgeCtx = { ctx: FileContext; arch: Arch; kind: string; actionDecls: Map<string, ActionDef>; fileRoles: string[] };

// The roles the edge's SOURCE speaks with: the piece's own role when it has
// one; a file-level statement speaks with the file's roles; an unroled piece
// speaks with none.
const sourceRolesOf = (edge: Edge, fileRoles: readonly string[]): string[] => {
	const own = edge.role ? [edge.role] : [...fileRoles];

	return edge.piece && !edge.role ? [] : own;
};

// The roles the TARGET may be judged by: a self-statement keeps the source's
// own roles; anything else asks the tree what is declared at the target path.
const targetRolesOf = (edge: Edge, jctx: JudgeCtx, selfStatement: boolean): string[] => {
	if (!selfStatement) return rolesAtPath(jctx.arch, edge.path);
	if (edge.role) return [edge.role];

	return jctx.fileRoles.length ? jctx.fileRoles : rolesAtPath(jctx.arch, edge.path);
};

// The scope one action is judged in: the file's facts, the source's roles,
// and the edge itself (the call may need WHAT was passed).
const scopeOf = (ctx: FileContext, sourceRoles: string[], edge: Edge): Facts & { roles: string[]; edge: Edge["fact"] } => {
	const facts = ctx.facts;
	const base: Facts = facts ?? { lines: [], imports: [], exports: [], location: { path: ctx.rel, segments: [], exts: [], fileName: "", words: [], files: [], siblings: [] }, reads: [], kind: { own: { is: "SourceFile" }, descendants: [] }, candidates: [], roles: [] };

	return { ...base, roles: sourceRoles, edge: edge.fact ?? null };
};

// One target role's verdict: the action it declares for this fact kind (or a
// missing one), and whether the source may do it. The allow/except walk is the
// shared `permissionOf` core; a source with no roles is granted nothing.
const pairOf = (targetSlug: string, edge: Edge, sourceRoles: string[], jctx: JudgeCtx): Pair => {
	const { ctx, arch } = jctx;
	const caps = targetCapsFor(edge.path ?? "", arch);
	const action = jctx.actionDecls.get(targetSlug);
	if (!action) return { targetSlug, action: { where: [], missing: true }, caps, violation: true };
	const { allowed, denied } = permissionOf(action, { rel: ctx.rel, arch, scope: scopeOf(ctx, sourceRoles, edge), caps });
	const violation = sourceRoles.length ? !allowed || denied : true;

	return { targetSlug, action, caps, violation, outward: denied };
};

// A role that NAMES who may do it explains the rule best; a declared action
// beats a missing one; fewer conditions beat more.
const rankPairs = (a: Pair, b: Pair): number =>
	Number(Boolean(b.action.where?.length)) - Number(Boolean(a.action.where?.length)) ||
	Number(!b.action.missing) - Number(!a.action.missing) ||
	(a.action.where ?? []).length - (b.action.where ?? []).length;

// The route the architecture DOES allow to the same code, if it names one:
// a `call` permission with a declared accessor.
const routeOf = (targetSlug: string, jctx: JudgeCtx, caps: Caps): string | null => {
	const { ctx, arch } = jctx;
	const callDecl = declaredCall(jctx, targetSlug);
	const callOk = callDecl?.where ? !checkWhere(callDecl.where, ctx.rel, arch, ctx.facts, caps) : false;
	const route = callOk ? ((callDecl?.scopeAccess ?? [])[0] ?? null) : null;

	return route ? accessorLabel(route) : null;
};

const declaredCall = (jctx: JudgeCtx, targetSlug: string): ActionDef | null => jctx.ctx.arch.codeRoles[targetSlug]?.actions[RELATION.CALL] ?? null;

// The concrete destinations the refusal can offer: the allowed places that
// are not the target itself, not this file, not this folder.
const destOf = (places: AllowedPlace[], targetSlug: string, rel: string): string | null => {
	const others = places.filter((p) => p.role !== targetSlug);
	const spots = (others.length ? others : places)
		.filter((pl) => !pl.filter)
		.flatMap((pl) => pl.paths.map((path) => ({ role: pl.role, path })))
		.filter((sp) => sp.path !== rel && sp.path !== dirOf(rel) && sp.role !== targetSlug);

	return spots[0]?.path ?? null;
};

// The group one refused edge starts or joins. The allowed roles are the
// places WITHOUT the target itself (the target cannot allow its own refusal);
// only when no other place exists does the target's own list stand.
const groupOf = (edge: Edge, pair: Pair, jctx: JudgeCtx, all: AllowedPlace[]): RelationGroup => {
	const { ctx, kind } = jctx;
	const route = routeOf(pair.targetSlug, jctx, pair.caps);
	const others = all.filter((p) => p.role !== pair.targetSlug);
	const places = others.length ? others : all;

	return {
		kind,
		targetNode: pair.targetSlug,
		allowedRoles: [...new Set(places.map((pl) => pl.role).filter((r): r is string => Boolean(r)))],
		sameRoles: [...new Set(places.filter((pl) => pl.same).map((pl) => pl.role).filter((r): r is string => Boolean(r)))],
		via: (pair.action.scopeAccess ?? []).map(accessorLabel),
		route,
		dest: destOf(all, pair.targetSlug, ctx.rel),
		lines: [],
		what: new Set<string>(),
		path: edge.path,
		pieces: new Map<string, string | null>(),
		piece: edge.piece ?? null,
		pieceRole: edge.role ?? null,
		silent: Boolean(pair.action.missing) || !(pair.action.where ?? []).length,
		filtered: Boolean(pair.outward),
		self: edge.path === ctx.rel,
		fact: edge.fact ?? null,
	};
};

// Judge one edge: every target role's verdict, ranked; when ALL refuse, the
// best-explaining one names the group.
const judgeEdge = (edge: Edge, jctx: JudgeCtx): EdgeJudgment | null => {
	const sourceRoles = sourceRolesOf(edge, jctx.fileRoles);
	const selfStatement = edge.path === jctx.ctx.rel;
	const pairs = targetRolesOf(edge, jctx, selfStatement).map((slug) => pairOf(slug, edge, sourceRoles, jctx));
	const worst = worstWhenAllRefuse(pairs, rankPairs);
	if (!worst) return null;
	const places = allowedPlaces(worst.action.where, jctx.arch, worst.caps);
	const group = groupOf(edge, worst, jctx, places);
	const key = `${jctx.kind}|${worst.targetSlug}|${edge.what}`;

	return { key, group };
};

// Merge one edge into its group: the line, the what, the piece.
const joinGroup = (group: RelationGroup, edge: Edge): void => {
	group.lines.push(edge.line ?? 1);
	group.what.add(edge.what);
	if (edge.piece) group.pieces.set(edge.piece, edge.role ?? null);
};

export { judgeEdge, joinGroup };
export type { EdgeJudgment, Pair };
"use strict";

// THE FACT a declaration carries: what was written, every concrete reading the
// resolver reached, and what it could not reach. This module is the surface —
// the pieces, the expression folding and the variable substitution are modules
// of their own; a consumer asks for one resolution, not for the machinery.
//
// Every problem is STRUCTURED: a reading carries the grammar's `problems`
// (kind + span), and an unreached part carries a `kind` the report layer matches
// on. No sentence is composed here.

import { collapseSpaces, rawValueOf, type Branch, type BranchProblem, type Piece, type Span } from "../core/pieces";
import { resolvePieces, type ResolveContext } from "./substitute";
import { checkValue, type Verdict } from "../core/syntax-check";

// One concrete reading of a declaration value, in one provider and one media
// variant — a grammar VERDICT (`valid` + structured `problems`) plus the two
// labels that say which reading it is. `valid` is `null` when the grammar has
// no verdict (an unknown property, a custom property) — never a guess.
// `provider` is the literal name when the providers disagree (or when the
// reading is blamed on it), null when the value is not provider-specific.
type ResolvedValue = Verdict & { value: string; provider: string | null; mediaVariant: string | null };

// A part of the value the resolver could not reach the bottom of — the shared
// `BranchProblem` (a KIND the report matches on + its name/text) made concrete
// for a finished declaration: the `text` it applies to is required, and it may
// name the incomplete `provider` (for `absent`) and the `span` it sits at.
type UnresolvedValue = BranchProblem & { text: string; provider?: string; span?: Span };

// The fact a declaration carries: what was written, every concrete reading, and
// what could not be read.
type ValueResolution = { property: string; rawValue: string; resolvedValues: ResolvedValue[]; unresolved: UnresolvedValue[] };

const readingKey = (item: ResolvedValue): string => `${item.value}|${item.provider ?? ""}|${item.mediaVariant ?? ""}`;

const problemKey = (item: UnresolvedValue): string => `${item.kind}|${item.text}|${item.name ?? ""}|${item.provider ?? ""}`;

// Record a problem once; the same reason reached through several branches is one
// fact, not several.
const recordProblem = (item: UnresolvedValue, list: UnresolvedValue[], seen: Set<string>): void => {
	const key = problemKey(item);
	if (seen.has(key)) return;
	seen.add(key);
	list.push(item);
};

// A read that needs a provider but the invariant named no provider role: say
// that as its own kind, rather than silently resolving against nothing.
const providerlessKind = (problem: BranchProblem, noProviderRole: boolean): string => (noProviderRole && problem.kind === "unresolved-expr" ? "no-provider-role" : problem.kind);

// Where problems are recorded: the list and the set that keeps them distinct.
type ProblemSink = { unresolved: UnresolvedValue[]; seen: Set<string> };

// Every problem ONE branch carries: the resolver's own kinds, the providers a
// fixed path was absent in (a provider is incomplete, not the component), and an
// empty branch that is neither a nested block nor a value.
const collectProblems = (branch: Branch, raw: { rawValue: string; noProviderRole: boolean }, sink: ProblemSink): void => {
	const text = collapseSpaces(branch.text);
	for (const problem of branch.problems) recordProblem({ kind: providerlessKind(problem, raw.noProviderRole), text: problem.text ?? (text || raw.rawValue), name: problem.name }, sink.unresolved, sink.seen);
	if (branch.problems.length) return;
	for (const missing of branch.absent ?? []) recordProblem({ kind: "absent", text: raw.rawValue, provider: missing.provider }, sink.unresolved, sink.seen);
	// A branch that was ONLY a nested block (`${aCssFragment}`) is not an empty
	// value: the block's own declarations are checked where it was written. A
	// dynamic branch is runtime data, not an empty value either.
	if (!text && !branch.directive && !branch.dynamic) recordProblem({ kind: "empty", text: raw.rawValue }, sink.unresolved, sink.seen);
};

// One branch that reached the bottom, as a reading (empty/directive branches
// have nothing to judge — they are handled by `collectProblems`). A DYNAMIC
// branch carries a placeholder SHAPE: when that shape is rejected, the real
// value is still the runtime's and the component is not blamed — the reading is
// dropped instead of reported.
const collectReading = (branch: Branch, prop: string, resolvedValues: ResolvedValue[], seen: Set<string>): void => {
	const text = collapseSpaces(branch.text);
	if (!text) return;
	const verdict = checkValue(prop, text);
	if (branch.dynamic && verdict.valid === false) return;
	const item: ResolvedValue = { value: text, provider: branch.provider, mediaVariant: branch.media, valid: verdict.valid, problems: verdict.problems };
	const key = readingKey(item);
	if (seen.has(key)) return;
	seen.add(key);
	resolvedValues.push(item);
};

// Resolve ONE declaration. Every branch that reaches the bottom becomes a
// `resolvedValue` (with its provider/media label and the grammar's verdict);
// every branch that does not becomes an `unresolved` entry with its kind.
const resolveDeclaration = (declaration: { prop: string; pieces: Piece[] }, context: ResolveContext): ValueResolution => {
	const rawValue = rawValueOf(declaration.pieces);
	const resolvedValues: ResolvedValue[] = [];
	const unresolved: UnresolvedValue[] = [];
	const seenReadings = new Set<string>();
	const seenProblems = new Set<string>();
	const problemSink: ProblemSink = { unresolved, seen: seenProblems };
	const raw = { rawValue, noProviderRole: context.scope.providers.length === 0 };
	for (const branch of resolvePieces(declaration.pieces, context)) {
		collectProblems(branch, raw, problemSink);
		if (!branch.problems.length) collectReading(branch, declaration.prop, resolvedValues, seenReadings);
	}

	return { property: declaration.prop, rawValue, resolvedValues, unresolved };
};

export { resolveDeclaration };
export { resolvePieces } from "./substitute";
export { emptyScope, mergeScopes, normalizeScope, withProviders } from "../core/scope-types";
export { piecesOfRange } from "../core/pieces";
export { checkValue } from "../core/syntax-check";
export type { Piece, Span } from "../core/pieces";
export type { Scope, ScopeEntry, ProviderLiteral } from "../core/scope-types";
export type { ResolveContext } from "./substitute";
export type { ValueProblem, ProblemKind } from "../core/syntax-check";
export type { ResolvedValue, UnresolvedValue, ValueResolution };

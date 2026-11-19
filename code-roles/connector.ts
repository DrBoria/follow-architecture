"use strict";

// The code-role connector: the ONE place that makes codeRole names usable in
// any filter. A codeRole is a human-readable extension of a ts-morph kind, so
// the two are interchangeable in filters. This module is imported by
// invariants, nodes, and the pipeline — no other module implements
// role-name resolution.
//
// How it works:
//   `enrichWithRoles(candidates, codeRoles)` adds three fields to each
//   candidate fact (in place, mutating the array):
//     • `role` — the candidate's classified role name (first matching
//       codeRole in YAML order), or null.
//     • `parentRole` — the role of the piece this one sits in (the `piece` of
//       its `location`), or null.
//     • Each entry in `calls` gets `targetRole` — the role of the function
//       the call targets (matched by callee name), or null.
//
// After enrichment, filters can use plain field access:
//   - `role: { equals: "action" }`  →  candidate IS an action
//   - `parentRole: { equals: "orchestrator" }`  →  nested in an orchestrator
//   - `calls: { some: { targetRole: { equals: "pureFunction" } } }`
//   - `kind: { own: { is: { in: ["storeModel"] } } }`  →  a node's own kind
//
// This is the same mechanism used by classifyRoles — the connector does not
// re-implement infer matching; the first-match walk is the shared
// `utils/classify` core, over the same `matches` from the queries engine.

import { rolesAtPath } from "../entities/location";
import { definitionsOf, firstMatch } from "../utils/classify";
import { untilStable } from "../utils/fixpoint";
import type { Arch, CodeRoles } from "../entities/architecture";
import type { Candidate, CallFact } from "../entities/facts";

// The candidate a call names locally: the action first (`self.toggleLine()`
// resolves to `toggleLine`), then the origin.
const localTarget = (call: Partial<CallFact> | null | undefined, nameToRole: ReadonlyMap<string, Candidate>): Candidate | null =>
	(call?.action ? nameToRole.get(call.action) : undefined) ?? (call?.origin ? nameToRole.get(call.origin) : undefined) ?? null;

// The role declared at a call target's location in ANOTHER file — ONE
// implementation of that question, in `entities/location/homes`. Ambiguous
// location → null, never a guess.
const roleAtTarget = (call: Partial<CallFact> | null | undefined, arch?: Arch | null): string | null => {
	const at = call?.target?.path && arch ? rolesAtPath(arch, call.target.path) : [];

	return at.length === 1 ? at[0] : null;
};

// The role of the candidate a call targets. A call's `action` is the called
// member name (`doX` in `store.doX()`) or the full text for a bare-identifier
// call (`fn`); `origin` is the leftmost chain segment (`store`, `new F`).
// This is the ONLY place call-target role resolution happens; every consumer
// (filters via `calls.some.targetRole`) reads the `targetRole` this attaches.
const roleOfTarget = (call: Partial<CallFact> | null | undefined, nameToRole: ReadonlyMap<string, Candidate>, arch?: Arch | null): string | null => {
	const hit = localTarget(call, nameToRole);
	if (hit) return hit.role ?? null;

	return roleAtTarget(call, arch);
};

// The candidates by name — the table call-target resolution reads.
const byName = (candidates: readonly Candidate[]): Map<string, Candidate> => {
	const map = new Map<string, Candidate>();
	for (const c of candidates) if (c.name) map.set(c.name, c);

	return map;
};

// One classification pass: every candidate gets the first role whose infer
// matches (YAML order wins). Reports whether any role moved.
const assignRoles = (candidates: Candidate[], codeRoles: CodeRoles, arch?: Arch | null): boolean => {
	const defs = definitionsOf(codeRoles);
	const scope = arch ? { arch } : undefined;
	let changed = false;
	for (const c of candidates) {
		const role = firstMatch(c, defs, scope ?? c);
		if (role !== (c.role ?? null)) changed = true;
		c.role = role;
	}

	return changed;
};

// One resolution pass: every call learns the role of its target, then the
// roles are re-assigned (a role may be inferred from the callees' roles).
const resolvePass = (candidates: Candidate[], codeRoles: CodeRoles, names: ReadonlyMap<string, Candidate>, arch?: Arch | null): boolean => {
	for (const c of candidates) {
		if (!Array.isArray(c.calls)) continue;
		for (const call of c.calls) call.targetRole = roleOfTarget(call, names, arch);
	}

	return assignRoles(candidates, codeRoles, arch);
};

// Classify each candidate's role (first matching codeRole in YAML order wins)
// and attach `targetRole` to each call fact. Mutates the candidates array in
// place and returns it.
//
// `arch` (optional) is the built architecture; when present it is passed as
// the match scope so location-aware infer operators (e.g. `path`, which takes
// the same entry interface as `location.allowedFrom`) can resolve node
// declarations.
//
// Role assignment and call-target resolution feed each other: a role may be
// inferred from the roles of the callees (`calls.some.targetRole`), while a
// callee's role is what `targetRole` resolves to. The passes repeat until
// nothing changes (the shared fixpoint walk), at most four times — roles move
// in one direction only: an earlier entry in the YAML order can newly match,
// never un-match.
const enrichWithRoles = (candidates: Candidate[], codeRoles: CodeRoles | null | undefined, arch?: Arch | null): Candidate[] => {
	if (!Object.keys(codeRoles ?? {}).length) return candidates;
	const roles = codeRoles ?? {};
	const names = byName(candidates);

	assignRoles(candidates, roles, arch);
	for (const c of candidates) {
		c.parentRole = c.location?.piece ? (names.get(c.location.piece)?.role ?? null) : null;
	}
	untilStable(() => resolvePass(candidates, roles, names, arch), 4);

	return candidates;
};

export { enrichWithRoles, roleOfTarget };

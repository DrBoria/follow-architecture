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
// re-implement infer matching; it reuses `matches` from the queries engine.

const { matches } = require("../entities/queries");
const { rolesAtPath } = require("../entities/location");
const { deepestMatch } = require("../entities/tree");

// The role of the candidate a call targets. A call's `action` is the called
// member name (`doX` in `store.doX()`) or the full text for a bare-identifier
// call (`fn`); `origin` is the leftmost chain segment (`store`, `new F`).
// Try the action first, then the origin — `self.toggleLine()` resolves to the
// `toggleLine` candidate. This is the ONLY place call-target role resolution
// happens; every consumer (assert.js, filters via `calls.some.targetRole`)
// reads the `targetRole` this attaches.
const roleOfTarget = (call, nameToRole, arch) => {
	const hit = (call?.action && nameToRole.get(call.action)) ?? (call?.origin && nameToRole.get(call.origin)) ?? null;
	if (hit) return hit.role ?? null;
	// Declared in another file: the role is whatever the architecture declares
	// at the target's location — ONE implementation of that question, in
	// nodes/homes.js. Ambiguous location → null, never a guess.
	const at = call?.target?.path ? rolesAtPath(arch, call.target.path) : [];
	return at.length === 1 ? at[0] : null;
};

// Classify each candidate's role (first matching codeRole in YAML order wins)
// and attach `targetRole` to each call fact. Mutates the candidates array in
// place and returns it.
//
// `arch` (optional) is the built architecture; when present it is passed as
// the match scope so location-aware infer operators (e.g. `path`, which takes
// the same entry interface as `location.allowedFrom`) can resolve
// node declarations.
const enrichWithRoles = (candidates, codeRoles, arch) => {
	const roleDefs = Object.entries(codeRoles ?? {});
	if (!roleDefs.length) return candidates;
	const nameToRole = new Map();
	for (const c of candidates) {
		if (c.name) nameToRole.set(c.name, c);
	}
	const scope = arch ? { arch } : undefined;

	// Role assignment and call-target resolution feed each other: a role may be
	// inferred from the roles of the callees (`calls.some.targetRole`), while a
	// callee's role is what `targetRole` resolves to. Two phases per pass, and
	// passes repeat until nothing changes (roles move in one direction only —
	// an earlier entry in the YAML order can newly match, never un-match).
	const assignRoles = () => {
		let changed = false;
		for (const c of candidates) {
			const before = c.role ?? null;
			let role = null;
			for (const [name, def] of roleDefs) {
				if (def?.infer && matches(c, def.infer, scope)) {
					role = name;
					break;
				}
			}
			if (role !== before) changed = true;
			c.role = role;
		}
		return changed;
	};

	assignRoles();
	for (const c of candidates) {
		c.parentRole = c.location?.piece ? (nameToRole.get(c.location.piece)?.role ?? null) : null;
	}

	for (let pass = 0; pass < 4; pass += 1) {
		for (const c of candidates) {
			if (!Array.isArray(c.calls)) continue;
			for (const call of c.calls) call.targetRole = roleOfTarget(call, nameToRole, arch);
		}
		if (!assignRoles()) break;
	}
	return candidates;
};

module.exports = { enrichWithRoles, roleOfTarget };

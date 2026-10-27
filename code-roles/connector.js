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
//     • `parentRole` — the role of the candidate this one is nested in
//       (matched by `parentName`), or null.
//     • Each entry in `calls` gets `targetRole` — the role of the function
//       the call targets (matched by callee name), or null.
//
// After enrichment, filters can use plain field access:
//   - `role: { equals: "action" }`  →  candidate IS an action
//   - `parentRole: { equals: "orchestrator" }`  →  nested in an orchestrator
//   - `calls: { some: { targetRole: { equals: "pureFunction" } } }`
//   - `kind: { in: ["storeModel"] }`  →  in a node's `kind` field
//
// This is the same mechanism used by classifyRoles — the connector does not
// re-implement infer matching; it reuses `matches` from the queries engine.

const { matches } = require("../utils/queries");

// The role of the candidate a call targets. A call's `action` is the called
// member name (`doX` in `store.doX()`) or the full text for a bare-identifier
// call (`fn`); `origin` is the leftmost chain segment (`store`, `new F`).
// Try the action first, then the origin — `self.toggleLine()` resolves to the
// `toggleLine` candidate. This is the ONLY place call-target role resolution
// happens; every consumer (assert.js, filters via `calls.some.targetRole`)
// reads the `targetRole` this attaches.
const roleOfTarget = (call, nameToRole) => {
	const hit = (call?.action && nameToRole.get(call.action)) ?? (call?.origin && nameToRole.get(call.origin)) ?? null;
	return hit?.role ?? null;
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
	for (const c of candidates) {
		c.role = null;
		for (const [name, def] of roleDefs) {
			if (def?.infer && matches(c, def.infer, scope)) {
				c.role = name;
				break;
			}
		}
		c.parentRole = c.parentName ? (nameToRole.get(c.parentName)?.role ?? null) : null;
		if (Array.isArray(c.calls)) {
			for (const call of c.calls) {
				call.targetRole = roleOfTarget(call, nameToRole);
			}
		}
	}
	return candidates;
};

module.exports = { enrichWithRoles, roleOfTarget };

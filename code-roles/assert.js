"use strict";

// Role assertion: for a candidate that was classified into a role, apply that
// role's `assert` block. Two parts, both pure filters / generic constraints —
// no named rule kinds:
//
//   structure.forbidden: [ <filter>, ... ]
//     Each filter is matched against the candidate's descendants. A finding
//     when a descendant matches. (e.g. { kind: { equals: ClassDeclaration } })
//
//   descendants: { <DescendantKind>: { allow?, deny?, unresolved? } }
//     Constrain the candidate's descendants of the given kind.
//       deny: all         — no descendant of that kind is allowed.
//       allow: true       — the kind is allowed (no finding).
//       deny: [role, ...] — a call whose callee has one of these roles fails.
//       allow: { role: { min?, max? } } — per-role call-count bounds.
//       unresolved: warn  — a call whose target resolves to no in-file role.
//
// Resolving a call's callee role is generic: the call's target name is matched
// against the file's candidate names (functions only). Anything that matches no
// candidate is "unresolved".

const { matches } = require("../utils/queries");
const { roleOfTarget } = require("./connector");

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// The callee role of a call — delegated to the code-role connector, the ONLY
// place call-target role resolution lives.
const calleeRole = (call, candidates) => roleOfTarget(call, new Map(candidates.filter((c) => c.name && c.role).map((c) => [c.name, c])));

const checkStructure = (cand, assert, out, findingFrom, ctx) => {
	const forbidden = assert.structure?.forbidden ?? [];
	for (const filter of forbidden) {
		const hit = (cand.descendants ?? []).find((d) => matches(d, filter));
		if (hit) {
			const vars = { path: ctx.rel, what: hit.name ?? null, snippet: hit.snippet ?? null };
			out.push(findingFrom({ key: "assert.structure", report: filter.report ?? null, line: hit.line }, "codeRoles", cand.role, `role:${cand.role}:structure`, vars));
		}
	}
};

const checkDescendants = (cand, assert, out, findingFrom, ctx, candidates) => {
	const specs = assert.descendants ?? {};
	for (const [kind, spec] of Object.entries(specs)) {
		if (!isObj(spec)) continue;
		const hits = (cand.descendants ?? []).filter((d) => d.kind === kind);
		const isCall = kind === "CallExpression" || kind === "NewExpression";

		if (spec.deny === "all") {
			for (const h of hits) {
				const vars = { path: ctx.rel, what: h.name ?? null, snippet: h.snippet ?? null, kind };
				out.push(findingFrom({ key: "assert.descendants", report: spec.report ?? null, line: h.line }, "codeRoles", cand.role, `role:${cand.role}:descendants`, vars));
			}
			continue;
		}
		if (spec.allow === true) continue;

		// Role-based constraints (calls only).
		if (isCall && (Array.isArray(spec.deny) || isObj(spec.allow))) {
			const calls = (cand.calls ?? []).filter((cl) => cl.kind === kind);
			for (const cl of calls) {
				const role = calleeRole(cl, candidates);
				if (role == null) {
					if (spec.unresolved === "warn") {
						const vars = { path: ctx.rel, what: cl.action ?? null, kind, unresolved: true };
						out.push(findingFrom({ key: "assert.descendants", report: spec.report ?? null, line: undefined }, "codeRoles", cand.role, `role:${cand.role}:descendants`, vars));
					}
					continue;
				}
				if (Array.isArray(spec.deny) && spec.deny.includes(role)) {
					const vars = { path: ctx.rel, what: cl.action ?? null, role, kind };
					out.push(findingFrom({ key: "assert.descendants", report: spec.report ?? null, line: undefined }, "codeRoles", cand.role, `role:${cand.role}:descendants`, vars));
				}
			}
			// Per-role call-count bounds.
			for (const [role, bound] of Object.entries(spec.allow ?? {})) {
				const count = calls.filter((cl) => calleeRole(cl, candidates) === role).length;
				if (isObj(bound) && ((bound.min != null && count < bound.min) || (bound.max != null && count > bound.max))) {
					const vars = { path: ctx.rel, role, count, kind };
					out.push(findingFrom({ key: "assert.descendants", report: spec.report ?? null }, "codeRoles", cand.role, `role:${cand.role}:descendants`, vars));
				}
			}
		}
	}
};

// Apply a role's assert block to one classified candidate.
const assertRole = (cand, assert, ctx, candidates, out, findingFrom) => {
	if (!assert || !cand.role) return;
	checkStructure(cand, assert, out, findingFrom, ctx);
	checkDescendants(cand, assert, out, findingFrom, ctx, candidates);
};

module.exports = { assertRole };

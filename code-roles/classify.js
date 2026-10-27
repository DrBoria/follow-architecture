// Classify the file's candidates against the codeRoles.
//
// `classifyRoles(candidates, codeRoles)` returns:
//   • `present` — the flat list of role names present in the file
//   • `roleCtx` — `{ present, candidates }` where `candidates` are the
//     enriched facts (each carrying `role`, `parentRole`, and
//     `calls[].targetRole`).
//
// The input candidates array is NOT mutated in place — a shallow copy
// (plus a copy of `calls`) is enriched, so the original facts the
// pipeline built stay untouched.
//
// File-level `when` filters consume `ctx.facts` (which already includes
// `roles` and `candidates`), so no separate predicate language is needed.
const { enrichWithRoles } = require("./connector");

const classifyRoles = (candidates, codeRoles, arch) => {
	const copy = (candidates ?? []).map((c) => ({ ...c, calls: (c.calls ?? []).map((x) => ({ ...x })) }));
	enrichWithRoles(copy, codeRoles, arch);

	const present = copy.map((c) => c.role).filter(Boolean);
	return { present, candidates: copy, roleCtx: { present, candidates: copy } };
};

module.exports = { classifyRoles };

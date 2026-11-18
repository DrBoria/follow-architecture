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
const { matches } = require("../entities/queries");

// A file with NO code candidates (a barrel of re-exports, a file of imports)
// still has a nature a role may describe: the file's own facts are asked
// against the same `infer` filters. The first role whose infer matches the
// FILE facts describes the module scope — the same first-match-wins order the
// pieces use. A role inferred from a piece's shape (`kind.own`) simply does not
// match the file, so nothing changes for files that hold code.
const fileRoleOf = (fileFacts, codeRoles, arch) => {
	if (!fileFacts) return null;
	const scope = { ...fileFacts, arch };
	for (const [name, def] of Object.entries(codeRoles ?? {})) {
		if (def?.infer && matches(fileFacts, def.infer, scope)) return name;
	}

	return null;
};

const classifyRoles = (candidates, codeRoles, arch, fileFacts = null) => {
	const copy = (candidates ?? []).map((c) => ({ ...c, calls: (c.calls ?? []).map((x) => ({ ...x })) }));
	enrichWithRoles(copy, codeRoles, arch);

	const present = copy.map((c) => c.role).filter(Boolean);
	// The module scope answers for statements no piece owns (`export * from`).
	// When no piece got a role, the file itself may still be describable.
	if (!present.length) {
		const fileRole = fileRoleOf(fileFacts, codeRoles, arch);
		if (fileRole) present.push(fileRole);
	}

	return { present, candidates: copy, roleCtx: { present, candidates: copy } };
};

module.exports = { classifyRoles };

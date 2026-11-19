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
import { enrichWithRoles } from "./connector";
import { definitionsOf, firstMatch } from "../utils/classify";
import { readWhen } from "../utils/read-when";
import type { Arch, CodeRoles } from "../entities/architecture";
import type { Candidate, FileFacts } from "../entities/facts";

// A file with NO code candidates (a barrel of re-exports, a file of imports)
// still has a nature a role may describe: the file's own facts are asked
// against the same `infer` filters. The first role whose infer matches the
// FILE facts describes the module scope — the same first-match-wins order the
// pieces use (the shared `utils/classify` walk). A role inferred from a piece's
// shape (`kind.own`) simply does not match the file, so nothing changes for
// files that hold code. The qualified read is the shared `readWhen`: only a
// file that is there is asked.
const fileRoleOf = (fileFacts: FileFacts | null | undefined, codeRoles: CodeRoles | null | undefined, arch?: Arch | null): string | null =>
	readWhen(fileFacts, (f) => f != null, (f) => firstMatch(f, definitionsOf(codeRoles), { ...f, arch }), null);

const classifyRoles = (
	candidates: Candidate[] | null | undefined,
	codeRoles: CodeRoles | null | undefined,
	arch?: Arch | null,
	fileFacts: FileFacts | null = null,
): { present: string[]; candidates: Candidate[]; roleCtx: { present: string[]; candidates: Candidate[] } } => {
	const copy = (candidates ?? []).map((c) => ({ ...c, calls: (c.calls ?? []).map((x) => ({ ...x })) }));
	enrichWithRoles(copy, codeRoles, arch);

	const present = copy.map((c) => c.role).filter((r): r is string => Boolean(r));
	// The module scope answers for statements no piece owns (`export * from`).
	// When no piece got a role, the file itself may still be describable.
	if (!present.length) {
		const fileRole = fileRoleOf(fileFacts, codeRoles, arch);
		if (fileRole) present.push(fileRole);
	}

	return { present, candidates: copy, roleCtx: { present, candidates: copy } };
};

export { classifyRoles };

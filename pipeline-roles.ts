"use strict";

// The ROLE-HOME phase: every candidate must fit its ROLE's declared home. A
// role says where its code may be declared; code of that role anywhere else is
// reported with the place it belongs. ONE finding per role per file — four
// helpers in one file are one decision, not four copies of the same sentence.

import { homesOf, placeFor, boxOfPlace, placeholdersOf } from "./entities/location";
import { fitsRole } from "./nodes/finally";
import { asks } from "./report/asks";
import { findingFrom } from "./report/cli-report";
import { answerWhenAllPass } from "./utils/qualified";
import type { Arch } from "./entities/architecture";
import type { FileContext } from "./entities/context";
import type { Candidate } from "./entities/facts";
import type { Finding } from "./entities/findings";

// One misfit piece: its name and the line it starts on.
type Misfit = { name: string; line: number };

// Is this candidate a misfit? A role's report is about a NAME: an anonymous
// function is the argument or the body of something else, and naming it would
// produce a sentence with a hole in it. A role nobody declares, or one with no
// home, restricts nothing. The guards are the shared qualified-answer walk;
// the home question is `fitsRole`'s own.
const misfitRoleOf = (c: Candidate, arch: Arch, rel: string): string | null =>
	answerWhenAllPass(
		c,
		[(x) => Boolean(x.role && arch.codeRoles?.[x.role] && x.name), (x) => homesOf(arch, x.role ?? "").length > 0, (x) => !fitsRole(x.role ?? "", arch, rel)],
		(x) => x.role ?? null,
	);

// The misfits by role: every named candidate of a declared role with homes,
// sitting outside every one of them.
const misfitsOf = (withRoles: readonly Candidate[], arch: Arch, rel: string): Map<string, Misfit[]> => {
	const misfits = new Map<string, Misfit[]>();
	for (const c of withRoles) {
		const role = misfitRoleOf(c, arch, rel);
		if (!role || !c.name) continue;
		misfits.set(role, [...(misfits.get(role) ?? []), { name: c.name, line: c.lines?.[0] ?? 1 }]);
	}

	return misfits;
};

// The reason a misfit is a misfit: the role's own wording when the config has
// one (a clause, not a sentence — the subject and the place are the frame's
// job), else the plain statement of what the code is and what to fill in.
const whyOf = (role: string, names: readonly string[], place: { path: string; concrete: boolean } | null, arch: Arch): string => {
	const own = arch.codeRoles[role].report;
	const ownMessage = typeof own === "object" && own !== null ? own.message : null;
	if (ownMessage) return ownMessage;
	// A role with NO place for this file must not reach `place.path`: widening the
	// rules to `packages` put such a file in front of this line and it crashed.
	const fill = !place || place.concrete ? "" : `; fill ${placeholdersOf(place.path)} for the instance this code belongs to`;

	return `${names.length > 1 ? "They are" : "It is"} \`${role}\` code${fill}.`;
};

// One role's misfit finding: the demand and its sentence come from the ONE
// vocabulary in report/asks — "this code belongs elsewhere" is a `move`, said
// the same way here and in the folder check. The BOX the sentence names is
// resolved here, once, so the picture and the sentence cannot disagree.
const misfitFinding = (role: string, found: readonly Misfit[], ctx: FileContext, arch: Arch): Finding => {
	const names = found.map((x) => x.name);
	const list = names.map((n) => `\`${n}\``).join(", ");
	// WHERE this code belongs — asked of the ONE implementation in homes, so
	// this message and the folder-level one can never name different places.
	const place = placeFor(arch, role, ctx.rel);
	const where = place ? `\`${place.path}\`` : null;
	const report = asks.move({
		what: list,
		to: where,
		plural: names.length > 1,
		node: boxOfPlace(arch, place?.path),
		// The path WITHOUT backticks: the text decorates, the data does not.
		path: place?.path ?? null,
		// `findingFrom` substitutes `{what}` / `{destination}` from the vars below.
		why: whyOf(role, names, place, arch),
	});

	return findingFrom({ report, line: found[0].line }, "codeRoles", role, `role:${role}:report`, {
		path: ctx.rel,
		what: names.join(", "),
		destination: place?.path ?? null,
	});
};

const checkRoleHomes = (withRoles: readonly Candidate[], ctx: FileContext, arch: Arch, out: Finding[]): void => {
	for (const [role, found] of misfitsOf(withRoles, arch, ctx.rel)) out.push(misfitFinding(role, found, ctx, arch));
};

export { checkRoleHomes };
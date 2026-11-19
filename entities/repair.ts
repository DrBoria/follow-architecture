"use strict";

// THE repair — the ONE shape a finding offers, and the only thing the two
// representations read:
//
//   { code, to, from, path, text }
//
//   code  what kind of repair it is (`move` | `remove` | `role` | `add` | …)
//   to    the BOXES it lands in — the picture draws one arrow per entry
//   from  the box a removal points at
//   path  the place the sentence names, when it names one
//   text  the sentence printed for a human
//
// A sentence alone is not a repair: it cannot be drawn. Every producer builds
// ONE of these (`report/asks`), the decision maker normalizes every option to
// it (`errorTypes/decision-maker`), and the picture reads it
// (`user-report/src/graph`). This module names the shape once so the three can
// never drift; it is plain data, so it travels through the JSON payload.

// The repair codes the report knows. A producer may state its own (`rewrite`,
// `merge`, `split`, `delete`, `declare`, `create`, `rules`); the picture maps
// each to a word, so the list here is the COMMON core, not a closed vocabulary.
type RepairCode = "move" | "remove" | "role" | "add" | "split" | "rewrite" | "merge" | "delete" | "declare" | "create" | "rules";

type Repair = {
	code: RepairCode | string;
	to: string[];
	from: string | null;
	path: string | null;
	text: string;
};

// A repair as a producer may state it: every field of the ONE shape optional,
// the normalizer fills the defaults. `ask` is the legacy spelling of `code`,
// `fix` the legacy spelling of `text` — both still read.
type StatedRepair = Partial<Repair> & { ask?: string | null; fix?: string | null };

// One shape for every option, whatever produced it: an old string-returning
// type cannot reintroduce a second format. A bare string is the rule's own
// words (`rules`, no destination); an object keeps the fields it states and
// defaults the rest. An option with no text is dropped — it says nothing.
const fromString = (text: string): Repair | null => (text ? { code: "rules", to: [], from: null, path: null, text } : null);

const fromObject = (option: StatedRepair): Repair | null => {
	const text = String(option.text ?? option.fix ?? "");
	if (!text) return null;
	return { code: option.code ?? option.ask ?? "rules", to: option.to ?? [], from: option.from ?? null, path: option.path ?? null, text };
};

const normalizeRepair = (option: string | StatedRepair | null | undefined): Repair | null => {
	if (option == null) return null;
	return typeof option === "string" ? fromString(option) : fromObject(option);
};

// Normalize a list of options to the one shape, dropping the empty ones.
const normalizeRepairs = (list: readonly (string | StatedRepair | null | undefined)[] | null | undefined): Repair[] =>
	(list ?? []).map(normalizeRepair).filter((r): r is Repair => r !== null);

export { normalizeRepair, normalizeRepairs };
export type { Repair, RepairCode, StatedRepair };

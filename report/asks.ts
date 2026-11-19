"use strict";

// There are only FOUR things a finding can ask for, and each of them says it the
// SAME way wherever it comes from. This module is the only place those four
// sentences are written.
//
//   move   — this code belongs in another place   `Move <what> to <where>.`
//   remove — this code must not exist here        `Delete <what>.`
//   role   — nothing describes this code          `Delete it, or declare its kind.`
//   add    — the folder requires what is missing  `Create <what>.`
//
// Why it is one module and not five: the same demand used to be worded
// differently depending on WHICH check noticed it. A finding now names the
// demand it makes (`ask`) and the sentence follows from the kind.

import type { StatedRepair } from "../entities/repair";
import type { ReportObject } from "../entities/architecture";

const q = (text: string): string => `\`${text}\``;

// A list of names as one subject: `a`, `b`, `c`.
const names = (list: readonly string[]): string => list.map(q).join(", ");

// The repair — the ONE shape a finding offers (`entities/repair`). A sentence
// alone is not a repair: it cannot be drawn. Every producer builds ONE of these,
// and the text is the last field of it — never the other way round.
const repair = (spec: { code?: string | null; ask?: string | null; fix?: string | null }, place: { to?: string[]; from?: string | null; path?: string | null } = {}): StatedRepair | null =>
	spec.fix ? { code: spec.code ?? spec.ask ?? "rules", to: place.to ?? [], from: place.from ?? null, path: place.path ?? null, text: spec.fix } : null;

// The move demand: a destination named → a move; none → a deletion (the picture
// draws THAT instead of a move with no target). The node travels with the
// sentence, so "Move … to X" and the arrow to X are one value.
type MoveAsk = { what: string; to?: string | null; why?: string | null; plural?: boolean; name?: string | null; node?: string | null; path?: string | null };
// The move demand is a report spec with its sentence fields present — derived
// from the ONE report model so the vocabularies cannot drift.
type MoveDemand = Required<Pick<ReportObject, "ask" | "message" | "fix" | "to" | "path">>;

const moveMessage = (what: string, to: string | null, why: string | null, plural: boolean): string => {
	const belongs = plural ? "belong" : "belongs";
	const where = to ? `in ${to}` : "somewhere else";
	return `${what} ${belongs} ${where}.${why ? ` ${why}` : ""}`;
};

const moveFix = (what: string, to: string | null, name: string | null): string =>
	to ? `Move ${name ?? what} to ${to}.` : `Delete ${name ?? what}: this architecture holds no place for that kind of code, so there is nowhere to move it to.`;

const moveBoxes = (to: string | null, node: string | null): string[] => (to && node ? [node] : []);

const move = (args: MoveAsk): MoveDemand => {
	const { what, to = null, why = null, plural = false, name = null, node = null, path: place = null } = args;
	return {
		ask: to ? "move" : "remove",
		message: moveMessage(what, to, why, plural),
		fix: moveFix(what, to, name),
		to: moveBoxes(to, node),
		path: place ?? to,
	};
};

const remove = (args: { what: string; what_is?: string | null; why?: string | null }): { ask: string; to: string[]; message: string; fix: string } => ({
	ask: "remove",
	to: [],
	message: `${args.what}${args.what_is ? ` ${args.what_is}` : ""}, but ${args.why}.`,
	fix: `Delete it.`,
});

const role = (args: { what: string; why: string }): { ask: string; to: string[]; message: string; fix: string } => ({
	ask: "role",
	to: [],
	message: `${args.what} has no role: ${args.why}`,
	fix: `Delete ${args.what}, or move it to a place whose code the architecture describes.`,
});

const add = (args: { what: string; why: string }): { ask: string; to: string[]; message: string; fix: string } => ({
	ask: "add",
	to: [],
	message: `${args.what} is missing: ${args.why}`,
	fix: `Create ${args.what}.`,
});

const __exported_asks = { move, remove, role, add };
export { __exported_asks as asks, repair, names, q };

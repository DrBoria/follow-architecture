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
// differently depending on WHICH check noticed it — a role with a home elsewhere,
// a file the folder does not declare, a folder the tree does not have and a
// relation the rules forbid each built their own sentence, so a reader had to
// learn four vocabularies for one decision. A finding now names the demand it
// makes (`ask`) and the sentence follows from the kind.

const q = (text) => `\`${text}\``;

// A list of names as one subject: `a`, `b`, `c`.
const names = (list) => list.map(q).join(", ");

// The repair — the ONE shape a finding offers, and the only thing the two
// representations read:
//
//   { code, to, from, path, text }
//
//   code  what kind of repair it is (`move` | `remove` | `role` | `add`)
//   to    the BOXES it lands in — the picture draws one arrow per entry
//   from  the box a removal points at
//   path  the place the sentence names, when it names one
//   text   the sentence printed for a human
//
// A sentence alone is not a repair: it cannot be drawn, so a finding that only
// had words was printed as "Move … to `X`" next to a picture saying "no
// destination named". Every producer builds ONE of these, and the text is the
// last field of it — never the other way round.
const repair = ({ code, ask, fix }, { to = [], from = null, path = null } = {}) => (fix ? { code: code ?? ask ?? "rules", to, from, path, text: fix } : null);

const move = ({ what, to = null, why = null, plural = false, name = null, node = null, path: place = null }) => ({
	// No destination = no arrow: the repair the reader can actually make is a
	// deletion, and the picture draws THAT instead of a move with no target.
	ask: to ? "move" : "remove",
	message: to
		? `${what} ${plural ? "belong" : "belongs"} in ${to}.${why ? ` ${why}` : ""}`
		: `${what} ${plural ? "belong" : "belongs"} somewhere else.${why ? ` ${why}` : ""}`,
	// A move with NO destination still owes the reader an action: the sentence says
	// "belongs somewhere else", and an empty fix printed a card with nothing to do
	// (every role whose kind no node accepts).
	fix: to
		? `Move ${name ?? what} to ${to}.`
		: `Delete ${name ?? what}: this architecture holds no place for that kind of code, so there is nowhere to move it to.`,
	// The node is part of the sentence's own statement: whoever knows the place
	// names the box in the same call, so "Move … to X" and the arrow to X are one
	// value. No caller can produce the words without producing the destination.
	to: to && node ? [node] : [],
	path: place ?? to,
});

const remove = ({ what, what_is = null, why = null }) => ({
	ask: "remove",
	to: [],
	message: `${what}${what_is ? ` ${what_is}` : ""}, but ${why}.`,
	fix: `Delete it.`,
});

const role = ({ what, why }) => ({
	ask: "role",
	to: [],
	message: `${what} has no role: ${why}`,
	fix: `Delete ${what}, or move it to a place whose code the architecture describes.`,
});

const add = ({ what, why }) => ({
	ask: "add",
	to: [],
	message: `${what} is missing: ${why}`,
	fix: `Create ${what}.`,
});

module.exports = { asks: { move, remove, role, add }, repair, names, q };

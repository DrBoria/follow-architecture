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

const move = ({ what, to = null, why = null, plural = false, name = null }) => ({
	ask: "move",
	message: to
		? `${what} ${plural ? "belong" : "belongs"} in ${to}.${why ? ` ${why}` : ""}`
		: `${what} ${plural ? "belong" : "belongs"} somewhere else.${why ? ` ${why}` : ""}`,
	fix: to ? `Move ${name ?? what} to ${to}.` : null,
});

const remove = ({ what, what_is = null, why = null }) => ({
	ask: "remove",
	message: `${what}${what_is ? ` ${what_is}` : ""}, but ${why}.`,
	fix: `Delete it.`,
});

const role = ({ what, why }) => ({
	ask: "role",
	message: `${what} has no role: ${why}`,
	fix: `Delete ${what}, or move it to a place whose code the architecture describes.`,
});

const add = ({ what, why }) => ({
	ask: "add",
	message: `${what} is missing: ${why}`,
	fix: `Create ${what}.`,
});

module.exports = { asks: { move, remove, role, add }, names, q };

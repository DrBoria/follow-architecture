"use strict";

// A relation the architecture forbids: the boxes are fine, the edge is not.
//
// The repairs are OBJECTS, not sentences: `{ code, text, to }`. The `to` array
// is the same one the picture draws, so a repair with three destinations is
// three arrows in the graph and three lines in the text — computed once.

const { WRONG_ACTION } = require("../vocabulary/ids");
const { nounOf } = require("../vocabulary/verbs");
const { relationMessage, factText, subjectText, whyText } = require("../vocabulary/phrases");

const classify = (ctx, places) => {
	const { violation, ownerNode } = ctx;
	if (!violation?.kind) return null;
	const from = places.folderOf(ownerNode?.slug);
	const to = places.folderOf(violation.targetNode);
	// A relation inside one box is not an edge the picture can draw.
	if (!from || !to || from === to) return null;
	const targetPath = violation.targetPath ?? null;
	const targetNode = places.folderOf(violation.targetNode);
	// WHO MAY do this — read from the engine's verdict, never recomputed. It is a
	// list of NAMES for the sentence ("only `orchestrator`, `testCode` may do it").
	// It is NOT a list of destinations: "may" is a permission, and a permission is
	// not a place. `testCode` may call an action because tests verify code, which
	// says nothing about where production code belongs.
	const actors = (violation.token?.why?.roles ?? []).filter(Boolean);
	return {
		type: WRONG_ACTION,
		kind: violation.kind,
		from,
		to: [to],
		line: violation.line ?? null,
		target: {
			node: violation.targetNode ?? null,
			paths: targetPath ? [targetPath] : targetNode ? [places.pathOf(targetNode)] : [],
			exact: Boolean(targetPath),
		},
		actors,
		token: violation.token ?? null,
	};
};

const message = (story, ctx) => {
	if (story.token?.fact) return relationMessage(story.token, { file: ctx.file });
	const targetPath = story.target.exact ? story.target.paths[0] : null;
	if (!targetPath) return null;
	const who = story.actors.length ? storiesToList(story.actors) : "nobody";
	return `\`${ctx.file}\` ${factText({ kind: story.kind, resolved: targetPath, form: "statement" })}, but only ${who} may do it.`;
};

const storiesToList = (list) => list.map((a) => `\`${a}\``).join(", ");

// WHAT THE READER CAN DO — always a list of OBJECTS:
//   code   how the repair works (`remove` | `move`)
//   text   the sentence
//   to     the boxes the repair moves to, if it moves anywhere
// The picture draws one arrow per `to`, the text prints `text`: same array,
// same evaluation.
const fixes = (story, ctx) => {
	const noun = nounOf(story.kind);
	const plural = story.token?.subject?.plural;
	const them = plural ? "them" : "it";
	const touched = story.target.paths[0] ?? story.target.node;
	const isWrite = story.kind === "mutate" || story.kind === "assign";
	const out = [];

	// WHERE IT BELONGS — already decided by the decision maker, from code roles.
	// Each place is one arrow and one line; the percentage is the decision's own
	// confidence, so the reader sees why this box and not another.
	for (const place of story.destinations ?? []) {
		out.push({
			code: "move",
			text: `Move ${them} into \`${place.path}\` — that is where a \`${place.role}\` lives (fit ${Math.round(place.confidence * 100)}%).`,
			to: [place.node],
		});
	}

	if (isWrite && !out.length) {
		out.push({
			code: "move",
			text: `Move ${them} out of this file — the state ${plural ? "they change is" : "it changes is"} not ${plural ? "theirs" : "its"} to change.`,
			// No arrow: no role owns this code here, so the repair only marks the
			// code that has to leave.
			to: [],
			from: story.from,
		});
	} else if (touched) {
		// `from` is what a removal POINTS AT: the box whose code goes away. The
		// picture marks it, so a sentence with "Remove" is never drawn as nothing.
		out.push({ code: "remove", text: `Remove the ${noun} of \`${touched}\` from \`${ctx.file}\` — this relation is not allowed here.`, to: [], from: story.from });
	}

	return out;
};

// A tool that prints a finding WITHOUT a tree (the CLI, a linter message) still
// gets the same words: the token is enough to say what happened and what to do.
const describeToken = (token, { file, targetPath } = {}) => {
	const story = {
		kind: token?.fact?.kind ?? null,
		from: null,
		to: token?.why?.targetNode ? [] : [],
		target: {
			node: token?.why?.targetNode ?? null,
			paths: [targetPath ?? token?.fact?.resolved ?? token?.fact?.module].filter(Boolean),
			exact: Boolean(targetPath),
		},
		actors: token?.why?.roles ?? [],
		token,
	};
	return {
		message: relationMessage(token, { file }),
		subject: subjectText(token?.subject, file),
		what: factText(token?.fact),
		why: whyText(token?.why),
		fixes: token?.fact ? fixes(story, { file, ownerNode: null }) : [],
	};
};

module.exports = { id: WRONG_ACTION, label: "A relation the architecture forbids", classify, message, fixes, describeToken };

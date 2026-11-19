"use strict";

// A relation the architecture forbids: the boxes are fine, the edge is not.
//
// The repairs are OBJECTS, not sentences: `{ code, text, to }`. The `to` array
// is the same one the picture draws, so a repair with three destinations is
// three arrows in the graph and three lines in the text — computed once.

import { WRONG_ACTION } from "../vocabulary/ids";
import { nounOf } from "../vocabulary/verbs";
import { changesState } from "../../../entities/kinds";
import { relationMessage, factText, subjectText, whyText } from "../vocabulary/phrases";
import { fieldOf, toList } from "../../../utils/field";
import { stringField, stringListField, booleanField, numberField } from "../../../utils/read-field";
import { answerWhenAllPass } from "../../../utils/qualified";
import type { WrongActionStory, StoryTarget } from "../../../entities/story";
import type { RelationToken } from "../../../entities/token";
import type { DecisionCtx, Places } from "../../../entities/decision-ctx";
import type { StatedRepair } from "../../../entities/repair";

// The target a refused relation names: the exact path when the engine saw one,
// else the box's own path. `exact` says whether the path is a file or a pattern.
const targetPaths = (targetNode: string | null, targetPath: string | null, places: Places): string[] => {
	if (targetPath) return [targetPath];
	const box = places.folderOf(targetNode);
	return toList(box ? places.pathOf(box) : null).filter((p): p is string => typeof p === "string");
};

const targetOf = (targetNode: string | null, targetPath: string | null, places: Places): StoryTarget => ({
	node: targetNode,
	paths: targetPaths(targetNode, targetPath, places),
	exact: Boolean(targetPath),
});

// The story is told only when the relation has a kind AND crosses two distinct
// boxes — a relation inside one box is not an edge the picture can draw (the
// shared qualified-answer walk). WHO MAY do it is read from the engine's
// verdict, never recomputed: a list of NAMES for the sentence, NOT destinations
// ("may" is a permission, and a permission is not a place).
const classify = (ctx: DecisionCtx, places: Places): WrongActionStory | null => {
	const violation = ctx.violation;
	const kind = stringField(violation, "kind");
	const from = places.folderOf(ctx.ownerNode?.slug);
	const targetNode = stringField(violation, "targetNode") || null;
	const to = places.folderOf(targetNode);
	return answerWhenAllPass(
		{ kind, from, to },
		[(p) => Boolean(p.kind), (p) => Boolean(p.from) && Boolean(p.to) && p.from !== p.to],
		(p) => ({
			type: WRONG_ACTION,
			kind: p.kind,
			from: p.from,
			to: [p.to],
			line: numberField(violation, "line", 0) || null,
			target: targetOf(targetNode, stringField(violation, "targetPath") || null, places),
			actors: stringListField(fieldOf(violation, "token"), "why.roles").filter(Boolean),
			token: violation?.token ?? null,
		}),
	);
};

const storiesToList = (list: readonly string[]): string => list.map((a) => `\`${a}\``).join(", ");

// The sentence when the engine sent no token: the file did the action to an
// exact path, and only the named actors may do it.
const fallbackMessage = (story: WrongActionStory, file: string): string | null => {
	const targetPath = story.target.exact ? story.target.paths[0] : null;
	if (!targetPath) return null;
	const who = story.actors.length ? storiesToList(story.actors) : "nobody";
	return `\`${file}\` ${factText({ kind: story.kind, resolved: targetPath, form: "statement" })}, but only ${who} may do it.`;
};

const message = (story: WrongActionStory, ctx: DecisionCtx): string | null =>
	story.token?.fact ? relationMessage(story.token, { file: ctx.file }) : fallbackMessage(story, ctx.file);

// WHERE IT BELONGS — already decided by the decision maker, from code roles.
// Each place is one arrow and one line; the percentage is the decision's own
// confidence, so the reader sees why this box and not another.
const moveFixes = (story: WrongActionStory, them: string): StatedRepair[] =>
	(story.destinations ?? []).map((place) => ({
		code: "move",
		text: `Move ${them} into \`${place.path}\` — that is where a \`${place.role}\` lives (fit ${Math.round(place.confidence * 100)}%).`,
		to: [place.node],
	}));

// The repair for a write with no destination: the code must leave, but no role
// owns it here, so the repair only marks the code that has to go.
const writeOutFix = (them: string, plural: boolean, from: string | null): StatedRepair => ({
	code: "move",
	text: `Move ${them} out of this file — the state ${plural ? "they change is" : "it changes is"} not ${plural ? "theirs" : "its"} to change.`,
	to: [],
	from,
});

// WHAT THE READER CAN DO — always a list of OBJECTS:
//   code   how the repair works (`remove` | `move`)
//   text   the sentence
//   to     the boxes the repair moves to, if it moves anywhere
// The picture draws one arrow per `to`, the text prints `text`: same array,
// same evaluation.
const fixes = (story: WrongActionStory, ctx: { file: string }): StatedRepair[] => {
	const noun = nounOf(story.kind);
	const plural = booleanField(story.token?.subject, "plural");
	const them = plural ? "them" : "it";
	const touched = story.target.paths[0] ?? story.target.node;
	const out = moveFixes(story, them);

	if (changesState(story.kind) && !out.length) {
		out.push(writeOutFix(them, plural, story.from));
	} else if (touched) {
		// `from` is what a removal POINTS AT: the box whose code goes away. The
		// picture marks it, so a sentence with "Remove" is never drawn as nothing.
		out.push({ code: "remove", text: `Remove the ${noun} of \`${touched}\` from \`${ctx.file}\` — this relation is not allowed here.`, to: [], from: story.from });
	}

	return out;
};

// The story a token-only finding (the CLI, a linter message) carries: no tree,
// so `from` is null and the target is what the token names.
const tokenStory = (token: RelationToken, targetPath: string | null | undefined): WrongActionStory => {
	const fact = token.fact;
	const why = token.why;
	const paths = [targetPath ?? fieldOf(fact, "resolved") ?? fieldOf(fact, "module")].filter((p): p is string => typeof p === "string");
	return {
		type: WRONG_ACTION,
		kind: stringField(fact, "kind") || null,
		from: null,
		to: [],
		line: null,
		target: { node: stringField(why, "targetNode") || null, paths, exact: Boolean(targetPath) },
		actors: stringListField(why, "roles"),
		token,
	};
};

// A tool that prints a finding WITHOUT a tree (the CLI, a linter message) still
// gets the same words: the token is enough to say what happened and what to do.
const describeToken = (token: RelationToken, ctx: { file?: string; targetPath?: string | null } = {}): { message: string; subject: string; what: string; why: string; fixes: StatedRepair[] } => {
	const story = tokenStory(token, ctx.targetPath);
	return {
		message: relationMessage(token, { file: ctx.file }),
		subject: subjectText(token.subject, ctx.file ?? ""),
		what: factText(token.fact),
		why: whyText(token.why),
		fixes: token.fact ? fixes(story, { file: ctx.file ?? "" }) : [],
	};
};

const __exported_label = "A relation the architecture forbids";
export { WRONG_ACTION as id, __exported_label as label, classify, message, fixes, describeToken };

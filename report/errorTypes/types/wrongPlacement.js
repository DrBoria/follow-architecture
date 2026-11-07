"use strict";

// The code sits where it may not: one destination (move) or many (split).
// Repairs are objects `{ code, text, to }` — the picture draws `to`.

const { WRONG_PLACEMENT } = require("../vocabulary/ids");

// The destination is the STRUCTURED one the producer stated (`fix.location` →
// `plan.after`, a violation's `destination`), never a path scraped out of the
// sentence. Reading prose is how a folder-size finding — "send each file to its
// owner: … the feature's `store.ts`" — was drawn as a move of `packages/utils`
// into the root store: a repair no rule ever asked for.
const classify = (ctx) => {
	const { plan, ownerNode } = ctx;
	const before = plan?.before?.node ?? ownerNode?.slug ?? null;
	if (!before) return null;
	const to = plan?.after?.node ?? null;
	if (!to || to === before) return null;

	return {
		type: WRONG_PLACEMENT,
		shape: "move",
		from: before,
		to: [to],
		// An invariant states a rule; a folder walk states where this file goes.
		invariant: ctx.invariant ?? null,
	};
};

// The engine's sentence names the piece; re-deriving a subject here would invent one.
const message = () => null;

const fixes = (story, ctx) => {
	const pathOf = (slug) => ctx.places?.pathOf?.(slug) ?? slug;
	const from = `\`${pathOf(story.from)}\``;
	const to = story.to.map((slug) => `\`${pathOf(slug)}\``);

	// An invariant cannot be satisfied by moving a file: it describes a rule that
	// spans folders (`one file, one role`), so the only repair is to divide it.
	if (story.invariant) {
		if (to.length === 1) {
			return [{ code: "split", to: story.to, text: `Split the file: the code that belongs in ${to[0]} goes there, the rest stays in ${from} — one file may hold one role.` }];
		}
		return [
			{
				code: "split",
				to: story.to,
				text: `Split the file by role: the part that belongs in ${to.slice(0, -1).join(", ")} and ${to[to.length - 1]} moves there, the part that is allowed in ${from} stays — one file may hold one role.`,
			},
		];
	}

	if (story.shape === "split") {
		return [{ code: "split", to: story.to, text: `Divide the file: each part goes to its own destination (${to.join(", ")}), and nothing stays in ${from}.` }];
	}
	return [{ code: "move", to: story.to, text: `Move the whole file to ${to[0]} — nothing of it stays in ${from}.` }];
};

module.exports = { id: WRONG_PLACEMENT, label: "The code is in the wrong place", classify, message, fixes };

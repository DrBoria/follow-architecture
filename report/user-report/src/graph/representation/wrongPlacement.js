// The code sits where it may not: one destination (move) or many (split).
// The boxes carry the verdict; the arrows are the options, one per destination.
import { ids } from "../ids";
import { nameOf } from "../naming";

export const wrongPlacement = {
	key: ids.WRONG_PLACEMENT,
	title: "The code is in the wrong place",
	handles: (story) => story.type === ids.WRONG_PLACEMENT && Boolean(story.from) && Boolean(story.to?.length),
	build: ({ story }) => {
		const marks = { [story.from]: "wrong" };
		for (const to of story.to) marks[to] = "right";
		const kind = story.shape === "split" ? "split" : "move";
		return {
			edges: story.to.map((to) => ({ from: story.from, to, kind, broken: true })),
			marks,
		};
	},
	caption: ({ story, nodes }) =>
		story.shape === "split"
			? `✕ \`${nameOf(nodes, story.from)}\` holds code that belongs to ${story.to.length} different places; each ✓ is one of them — the piece has to be divided.`
			: `✕ the code is in \`${nameOf(nodes, story.from)}\`; ✓ \`${nameOf(nodes, story.to[0])}\` is where it belongs.`,
};

// A relation the architecture forbids: the boxes are fine, the edge is not.
//
// The arrows are the OPTIONS — the same array the text prints. One repair with
// three destinations is three arrows here and three lines there, because both
// read `story.options` and neither recomputes anything.
import { ids } from "../ids";
import { nameOf } from "../naming";
import { nounOf, baseVerbOf } from "../words";

export const wrongAction = {
	key: ids.WRONG_ACTION,
	title: "A relation the architecture forbids",
	handles: (story) => story.type === ids.WRONG_ACTION && Boolean(story.from) && Boolean(story.to?.length),
	build: ({ story, options = [] }) => {
		// A removal is a mark, not an arrow: the box whose code goes away is
		// crossed out. Without this, "Remove …" was a sentence with no picture.
		// The refused edge: dashed, red, crossed out.
		const edges = story.to.map((to) => ({ from: story.from, to, kind: nounOf(story.kind), broken: true }));
		// …and one arrow per repair that lands somewhere, coloured by its code.
		// One rule for every repair: if it has a destination, it is an arrow; if it
		// does not, it points at the box its `from` names and that box is crossed
		// out. A sentence is never drawn as nothing.
		const marks = {};
		for (const option of options) {
			const dests = (option.to ?? []).filter((to) => to !== story.from);
			for (const to of dests) edges.push({ from: story.from, to, kind: option.code, broken: false, option: true });
			if (!dests.length && option.from) marks[option.from] = "wrong";
		}
		return { edges, marks };
	},
	caption: ({ story, options = [], nodes }) => {
		const touched = story.target?.paths?.[0];
		const role = story.target?.node ? ` (\`${story.target.node}\` code)` : "";
		const from = `\`${nameOf(nodes, story.from)}\``;
		const head = touched
			? `✕ ${from} may not ${baseVerbOf(story.kind)} \`${touched}\`${role}.`
			: `✕ ${from} may not ${baseVerbOf(story.kind)} into \`${nameOf(nodes, story.to[0])}\`.`;
		const drawn = options.filter((o) => (o.to ?? []).length);
		const tail = drawn.length
			? ` The other arrows are the ${drawn.length > 1 ? "repairs" : "repair"}: ${drawn.map((o) => o.code).join(", ")}.`
			: "";
		return `${head}${tail}`;
	},
};

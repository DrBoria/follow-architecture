// A relation the architecture forbids: the boxes are fine, the edge is not.
//
// The arrows are the OPTIONS — the same array the text prints. One repair with
// three destinations is three arrows here and three lines there, because both
// read the options and neither recomputes anything.
import { ids } from "../ids";
import { nameOf } from "../naming";
import { nounOf, baseVerbOf } from "../words";
import { brokenEdges } from "./placement";
import type { Representation, Scene, ProblemEdge, Mark } from "./contract";
import type { WrongActionStory } from "../../../../../entities/story";

const isWrongAction = (story: Scene["story"]): story is WrongActionStory =>
	story.type === ids.WRONG_ACTION && Boolean(story.from) && Boolean(story.to?.length);

// The refused edge (dashed, red, crossed out) plus one arrow per repair that
// lands somewhere. A repair with no destination points at the box its `from`
// names and that box is crossed out — a sentence is never drawn as nothing.
const build = ({ story, options }: Scene): { edges: ProblemEdge[]; marks: Record<string, Mark> } => {
	if (!isWrongAction(story)) return { edges: [], marks: {} };
	const edges = brokenEdges(story.from ?? "", story.to, nounOf(story.kind));
	const marks: Record<string, Mark> = {};
	for (const option of options) {
		const dests = (option.to ?? []).filter((to) => to !== story.from);
		for (const to of dests) edges.push({ from: story.from ?? "", to, kind: option.code, broken: false, option: true });
		if (!dests.length && option.from) marks[option.from] = "wrong";
	}
	return { edges, marks };
};

const headOf = (story: WrongActionStory, nodes: Scene["nodes"]): string => {
	const touched = story.target?.paths?.[0];
	const role = story.target?.node ? ` (\`${story.target.node}\` code)` : "";
	const from = `\`${nameOf(nodes, story.from)}\``;
	if (touched) return `✕ ${from} may not ${baseVerbOf(story.kind)} \`${touched}\`${role}.`;
	return `✕ ${from} may not ${baseVerbOf(story.kind)} into \`${nameOf(nodes, story.to[0])}\`.`;
};

const caption = ({ story, options, nodes }: Scene): string => {
	if (!isWrongAction(story)) return "";
	const drawn = options.filter((o) => (o.to ?? []).length);
	const tail = drawn.length
		? ` The other arrows are the ${drawn.length > 1 ? "repairs" : "repair"}: ${drawn.map((o) => o.code).join(", ")}.`
		: "";
	return `${headOf(story, nodes)}${tail}`;
};

const wrongAction: Representation = {
	key: ids.WRONG_ACTION,
	title: "A relation the architecture forbids",
	handles: isWrongAction,
	build,
	caption,
};

export { wrongAction };

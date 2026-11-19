// The code sits where it may not: one destination (move) or many (split).
// The boxes carry the verdict; the arrows are the options, one per destination.
// The drawing is the SHARED placement core — the same crossed source and ticked
// destinations a refused relation draws.
import { ids } from "../ids";
import { nameOf } from "../naming";
import { placementView } from "./placement";
import type { Representation, Scene, Built } from "./contract";
import type { WrongPlacementStory } from "../../../../../entities/story";

const isWrongPlacement = (story: Scene["story"]): story is WrongPlacementStory =>
	story.type === ids.WRONG_PLACEMENT && Boolean(story.from) && Boolean(story.to?.length);

const build = ({ story }: Scene): Built => {
	if (!isWrongPlacement(story)) return { edges: [], marks: {} };
	const kind = story.shape === "split" ? "split" : "move";
	return placementView(story.from ?? "", story.to, kind);
};

const caption = ({ story, nodes }: Scene): string => {
	if (!isWrongPlacement(story)) return "";
	if (story.shape === "split") {
		return `✕ \`${nameOf(nodes, story.from)}\` holds code that belongs to ${story.to.length} different places; each ✓ is one of them — the piece has to be divided.`;
	}
	return `✕ the code is in \`${nameOf(nodes, story.from)}\`; ✓ \`${nameOf(nodes, story.to[0])}\` is where it belongs.`;
};

const wrongPlacement: Representation = {
	key: ids.WRONG_PLACEMENT,
	title: "The code is in the wrong place",
	handles: isWrongPlacement,
	build,
	caption,
};

export { wrongPlacement };

// Nothing declares this kind of code here: one box, crossed out. The drawing
// is the SHARED "no role" mark — the same verdict the file-contents picture
// gives code no rule describes.
import { ids } from "../ids";
import { nameOf } from "../naming";
import type { Representation, Scene, Built } from "./contract";
import type { UnknownRoleStory } from "../../../../../entities/story";

const isUnknownRole = (story: Scene["story"]): story is UnknownRoleStory =>
	story.type === ids.UNKNOWN_ROLE && Boolean(story.from);

const build = ({ story }: Scene): Built => {
	if (!isUnknownRole(story)) return { edges: [], marks: {} };
	return { edges: [], marks: { [story.from ?? ""]: "wrong" } };
};

const caption = ({ story, nodes }: Scene): string => {
	if (!isUnknownRole(story)) return "";
	return `✕ nothing in the architecture declares code like this in \`${nameOf(nodes, story.from)}\`: delete it, or move it into a folder whose code the architecture describes.`;
};

const unknownRole: Representation = {
	key: ids.UNKNOWN_ROLE,
	title: "No role describes this code",
	handles: isUnknownRole,
	build,
	caption,
};

export { unknownRole };

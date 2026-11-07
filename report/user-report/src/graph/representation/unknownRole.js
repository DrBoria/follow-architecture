import { ids } from "../ids";
import { listOf, nameOf } from "../naming";

export const unknownRole = {
	key: ids.UNKNOWN_ROLE,
	title: "No role describes this code",
	handles: (story) => story.type === ids.UNKNOWN_ROLE && Boolean(story.from),
	build: ({ story }) => ({ edges: [], marks: { [story.from]: "wrong" } }),
	caption: ({ story, nodes }) =>
		`✕ nothing in the architecture declares code like this in \`${nameOf(
			nodes,
			story.from,
		)}\`: delete it, or move it into a folder whose code the architecture describes.`,
};

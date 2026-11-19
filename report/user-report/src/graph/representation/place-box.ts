"use strict";

// A PLACE drawn as a box of its own: the file, named by its own segment, inside
// the node that holds it. The architecture graph draws NODES; a move between
// two files of one folder is still a move, so the two files are boxes here.

import { fileName } from "../../utils/format";
import type { PlaceBox } from "./contract";

const placeSlug = (path: string): string => `place:${path}`;

// The box says the FILE (`store.ts`), not the path again: the folder is the
// same on both sides, so repeating it in two wide boxes pushed the one word
// that differs off the edge.
const placeNode = (slug: string, path: string, owner: string | null): PlaceBox => {
	const file = fileName(path);
	return { slug, name: file, paths: [file], file, parents: owner ? [owner] : [], children: [] };
};

export { placeSlug, placeNode };

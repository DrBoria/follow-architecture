"use strict";

// The file-contents picture's three shapes, one per repair the rule stated:
// no repair (the box IS the verdict), a destination (arrows to it), or a code
// with no place (the box says what happens inside it). Split from the module so
// each shape is a named decision, not a branch of a 90-line function.

import { verbFor, crossesBox } from "./repair-words";
import { placeSlug, placeNode } from "./place-box";
import type { Built, Scene } from "./contract";
import type { Repair } from "../../../../../entities/repair";

// The repair the picture reads: the first with a destination, else the first
// stated, else none.
const repairOf = (options: readonly Repair[]): Repair | null =>
	options.find((o) => o.to?.length) ?? options[0] ?? null;

// NO OPTION AT ALL — the finding is the story itself. The box IS the verdict:
// the code is in the wrong shape where it stands.
const noRepairView = (box: string): Built => ({
	edges: [],
	marks: { [box]: "wrong" },
	only: [box],
	action: { [box]: "declare or delete" },
});

// The destination is a FILE in the box the code is already in: two boxes still
// (the FILE it is now and the FILE it becomes), one broken move between them.
const sameFolderView = (finding: Scene["finding"], place: string, owner: string): Built => {
	const from = placeSlug(finding.file);
	const to = placeSlug(place);
	return {
		edges: [{ from, to, kind: "move", broken: true }],
		marks: { [from]: "wrong", [to]: "right" },
		only: [from, to],
		extra: [placeNode(from, finding.file, owner), placeNode(to, place, owner)],
	};
};

// A destination in ANOTHER box: the source crossed, each landing point ticked.
const moveView = (owner: string, repair: Repair): Built => {
	const marks: Built["marks"] = { [owner]: "wrong" };
	for (const to of repair.to) if (to !== owner) marks[to] = "right";
	return {
		edges: repair.to.filter((to) => to !== owner).map((to) => ({ from: owner, to, kind: "move", broken: true })),
		marks,
		only: [owner],
	};
};

// NO PLACE AT ALL — but the rule still SAID what it wants (`code`). The box
// names the repair; a piece (`what`) is a declaration inside a file, so its box
// is that file, not the folder around it.
const codeOnlyView = (finding: Scene["finding"], owner: string, repair: Repair): Built => {
	const piece = finding.what ? placeSlug(finding.file) : null;
	const box = piece ?? owner;
	return {
		edges: [],
		marks: crossesBox(repair.code) ? { [box]: "wrong" } : {},
		only: [box],
		action: { [box]: verbFor(repair.code) },
		...(piece ? { extra: [placeNode(piece, finding.file, owner)] } : null),
	};
};

export { repairOf, noRepairView, sameFolderView, moveView, codeOnlyView };

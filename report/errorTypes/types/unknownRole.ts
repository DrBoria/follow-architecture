"use strict";

// Nothing declares this kind of code here. One repair, because there is one
// thing the reader can do with code the architecture does not describe.

import { UNKNOWN_ROLE } from "../vocabulary/ids";
import { answerWhenAllPass } from "../../../utils/qualified";
import type { UnknownRoleStory } from "../../../entities/story";
import type { DecisionCtx, Places } from "../../../entities/decision-ctx";
import type { StatedRepair } from "../../../entities/repair";

// The finding is an unroled piece AND its box can be drawn: both guards must
// pass before the story is told (the shared qualified-answer walk).
const classify = (ctx: DecisionCtx, places: Places): UnknownRoleStory | null =>
	answerWhenAllPass(
		ctx,
		[(c) => /:unroled:/.test(c.key ?? ""), (c) => Boolean(places.folderOf(c.ownerNode?.slug))],
		(c) => ({ type: UNKNOWN_ROLE, from: places.folderOf(c.ownerNode?.slug), to: [] }),
	);

const message = (): null => null;

const fixes = (story: UnknownRoleStory): StatedRepair[] => [
	// `from` = the box the code sits in: the picture crosses it out, so "Delete"
	// is drawn, not only printed.
	{ code: "delete", to: [], from: story.from, text: "Delete it — nothing in the architecture describes this code, so nothing may rely on it." },
];

const __exported_label = "No role describes this code";
export { UNKNOWN_ROLE as id, __exported_label as label, classify, message, fixes };

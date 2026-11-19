"use strict";

// The finding judges the file itself — no place, no relation. The repair is
// whatever the rule that fired already said — and it is read from `data.repair`,
// the ONE object the producer stated, never re-derived from the sentence.

import { FILE_CONTENTS } from "../vocabulary/ids";
import { fieldOf, type FieldValue } from "../../../utils/field";
import { recordField, stringField, stringListField } from "../../../utils/read-field";
import type { FileContentsStory } from "../../../entities/story";
import type { DecisionCtx, Places } from "../../../entities/decision-ctx";
import type { StatedRepair } from "../../../entities/repair";

const classify = (ctx: DecisionCtx, places: Places): FileContentsStory => ({ type: FILE_CONTENTS, from: places.folderOf(ctx.ownerNode?.slug), to: [] });

const message = (): null => null;

// The repair the producer stated, with its destination resolved to the BOX that
// holds it — once, in the one place both representations read. Every field the
// producer stated travels untouched (the normalizer downstream fills defaults);
// only `to` is resolved here.
const statedFix = (stated: { readonly [key: string]: FieldValue }, ctx: DecisionCtx): StatedRepair => {
	const to = stringListField(stated, "to");
	const boxes = to.length ? to : [ctx.places.nodeAtPath(stringField(stated, "path") || null)].filter((b): b is string => Boolean(b));
	return { ...stated, to: boxes };
};

const fixes = (story: FileContentsStory, ctx: DecisionCtx): StatedRepair[] => {
	const stated = recordField(fieldOf(ctx.finding, "data"), "repair");
	if (stated) return [statedFix(stated, ctx)];
	// A producer that had only words: still one option, with no destination.
	const fix = stringField(ctx.finding, "fix");
	return fix ? [{ code: "rules", to: [], from: null, path: null, text: fix }] : [];
};

const __exported_label = "The file's own contents";
export { FILE_CONTENTS as id, __exported_label as label, classify, message, fixes };

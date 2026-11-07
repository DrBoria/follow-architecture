"use strict";

// The finding judges the file itself — no place, no relation. The repair is
// whatever the rule that fired already said — and it is read from `data.repair`,
// the ONE object the producer stated, never re-derived from the sentence.

const { FILE_CONTENTS } = require("../vocabulary/ids");

const classify = (ctx, places) => ({ type: FILE_CONTENTS, from: places.folderOf(ctx.ownerNode?.slug), to: [] });

const message = () => null;

const fixes = (story, ctx) => {
	const stated = ctx.finding?.data?.repair ?? null;
	if (stated) {
		// A rule may name its place as a template (`{dir}/store.ts`). The place is
		// resolved to the BOX that holds it here — once, in the one place both
		// representations read — so a sentence with a destination always has a box.
		const to = stated.to?.length ? stated.to : [ctx.places?.nodeAtPath?.(stated.path)].filter(Boolean);
		return [{ ...stated, to }];
	}
	// A producer that had only words: still one option, with no destination.
	return ctx.finding?.fix ? [{ code: "rules", to: [], from: null, path: null, text: ctx.finding.fix }] : [];
};

module.exports = { id: FILE_CONTENTS, label: "The file's own contents", classify, message, fixes };

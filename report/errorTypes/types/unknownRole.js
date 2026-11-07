"use strict";

// Nothing declares this kind of code here. One repair, because there is one
// thing the reader can do with code the architecture does not describe.

const { UNKNOWN_ROLE } = require("../vocabulary/ids");

const classify = (ctx, places) => {
	if (!/:unroled:/.test(ctx.key ?? "")) return null;
	const from = places.folderOf(ctx.ownerNode?.slug);
	if (!from) return null;
	return { type: UNKNOWN_ROLE, from, to: [] };
};

const message = () => null;

const fixes = (story) => [
	// `from` = the box the code sits in: the picture crosses it out, so "Delete"
	// is drawn, not only printed.
	{ code: "delete", to: [], from: story.from, text: "Delete it — nothing in the architecture describes this code, so nothing may rely on it." },
];

module.exports = { id: UNKNOWN_ROLE, label: "No role describes this code", classify, message, fixes };

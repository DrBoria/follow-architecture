"use strict";

// Public entry for the interactive overview (`--overview`).
//
//   const { collectOverviewData, renderOverview } = require("./report/user-report");
//   const html = renderOverview(collectOverviewData({ ... }));
//
// The payload is plain JSON; the presentation is the React app in ./src,
// compiled on demand by ./build/bundle.js and inlined by ./html/shell.js.

const fs = require("node:fs");
const path = require("node:path");
const { collectOverviewData } = require("./data/collect");
const { renderHtml } = require("./html/shell");

const renderOverview = (data) => renderHtml(data);

// Write the overview and return the path plus a one-line summary for the CLI.
const writeOverview = (data, outPath) => {
	const abs = path.resolve(outPath);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, renderOverview(data), "utf8");
	return { path: abs, bytes: fs.statSync(abs).size };
};

module.exports = {
	collectOverviewData,
	writeOverview,
	renderOverview,
};

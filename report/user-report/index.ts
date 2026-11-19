"use strict";

// Public entry for the interactive overview (`--overview`).
//
//   const { collectOverviewData, renderOverview } = require("./report/user-report");
//   const html = renderOverview(collectOverviewData({ ... }));
//
// The payload is plain JSON; the presentation is the React app in ./src,
// compiled on demand by ./build/bundle.js and inlined by ./html/shell.js.

import * as fs from "node:fs";
import * as path from "node:path";
import { collectOverviewData } from "./data/collect";
import { renderHtml } from "./html/shell";
import type { OverviewData } from "../../entities/overview-data";

const renderOverview = (data: OverviewData): string => renderHtml(data);

// Write the overview and return the path plus a one-line summary for the CLI.
const writeOverview = (data: OverviewData, outPath: string): { path: string; bytes: number } => {
	const abs = path.resolve(outPath);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, renderOverview(data), "utf8");
	return { path: abs, bytes: fs.statSync(abs).size };
};

export { collectOverviewData, writeOverview, renderOverview };

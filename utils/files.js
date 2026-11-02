"use strict";

// The ONE directory walk: which files of a repo the tool looks at. Scan scope is
// the tool's (extensions, skipped folders, skipped globs), never the
// architecture's — so there is one walker and two callers.

const fs = require("node:fs");
const path = require("node:path");
const { minimatch } = require("minimatch");
const { toRel } = require("./imports");

// Absolute paths of every scanned file under `repoRoot`.
const collectFiles = (repoRoot, { exts, ignoreDirs, ignoreGlobs }) => {
	const extSet = new Set(exts);
	const ignoreSet = new Set(ignoreDirs);
	const out = [];
	const walk = (dir) => {
		let entries = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			// An unreadable folder is not a scan error: the file list just does not
			// include it (folder facts degrade, the rule still runs).
			return;
		}
		for (const entry of entries) {
			const abs = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (!ignoreSet.has(entry.name)) walk(abs);
			} else if (extSet.has(path.extname(entry.name)) && !(ignoreGlobs ?? []).some((g) => minimatch(toRel(repoRoot, abs), g))) {
				out.push(abs);
			}
		}
	};
	walk(repoRoot);

	return out;
};

module.exports = { collectFiles };

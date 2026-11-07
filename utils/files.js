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

		// SORTED, always: `readdirSync` returns whatever order the filesystem
		// happens to keep (hashed on btrfs, insertion on ext4), so without this the
		// same tree produced a different report from one machine — or one run — to
		// the next. The order is not cosmetic: a `dedupeBy` finding is reported for
		// the FIRST file that reaches a place, so an unstable list moves the
		// finding between files.
		return out.sort();
};

module.exports = { collectFiles };

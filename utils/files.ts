"use strict";

// The ONE directory walk: which files of a repo the tool looks at. Scan scope is
// the tool's (extensions, skipped folders, skipped globs), never the
// architecture's — so there is one walker and two callers.

import * as fs from "node:fs";
import * as path from "node:path";
import { minimatch } from "minimatch";
import { toRel } from "./imports";
import { notice } from "../report/notices";

// The scan scope a caller declares: which extensions to keep, which folders to
// skip, and any file globs to drop.
interface ScanOptions {
	exts: string[];
	ignoreDirs: string[];
	ignoreGlobs?: string[];
}

// Absolute paths of every scanned file under `repoRoot`.
const collectFiles = (repoRoot: string, { exts, ignoreDirs, ignoreGlobs = [] }: ScanOptions): string[] => {
	const extSet = new Set(exts);
	const ignoreSet = new Set(ignoreDirs);
	const out: string[] = [];
	const walk = (dir: string): void => {
		let entries: fs.Dirent[] = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch (error) {
			const e: { message?: string } = error;
			// An unreadable folder is not a scan error: the file list just does not
			// include it (folder facts degrade, the rule still runs). The reason is
			// reported, so a short list never looks like a complete one.
			notice(`the folder ${dir} could not be read`, e.message ?? String(e));

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

export { collectFiles };

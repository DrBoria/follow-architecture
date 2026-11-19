"use strict";

// The ts-morph project a run works on: the WHOLE repo, loaded once, with the
// YAML aliases handed to the compiler. `references` asks who uses a name, and
// that question is about every file — a project holding one file answers
// "nobody" for a helper the rest of the repo calls, and the answer changes
// depending on which file linted first.
//
// A file that cannot be read is NOT skipped silently: a missing file is missing
// from every answer the tool gives, so the run says which ones, the same way it
// says why it could not write its report.

import * as fs from "node:fs";
import { createTsProject, loadSourceFile } from "./entities/ast";
import { toRel } from "./utils/imports";
import { notice } from "./report/notices";
import { reasonOf } from "./utils/reason";
import type { Project } from "ts-morph";
import type { Arch } from "./entities/architecture";

const REPORTED_LOAD_FAILURES = 10;

// The load failures a run states: the first few by name, the rest as a count.
// A run with no failures states nothing — the notice is the failures' own.
const failureText = (failed: readonly string[]): string => {
	const shown = failed.slice(0, REPORTED_LOAD_FAILURES).map((f) => `\n  ${f}`).join("");
	const rest = failed.length - REPORTED_LOAD_FAILURES;

	return `${shown}${rest > 0 ? `\n  … and ${rest} more` : ""}`;
};

const failureNotice = (failed: readonly string[]): { subject: string; reason: string } | null =>
	failed.length ? { subject: `${failed.length} file(s) are not part of the project, so no repo-wide answer (who calls a name, what a type is) includes them`, reason: failureText(failed) } : null;

const reportLoadFailures = (failed: readonly string[]): void => {
	const stated = failureNotice(failed);
	if (stated) notice(stated.subject, stated.reason);
};

// One file's load: the parsed file, or the reason it could not be read. A
// missing file is missing from every answer the tool gives, so the reason is
// stated, never silent.
const loadOne = (project: Project, repoRoot: string, abs: string): string | null => {
	try {
		loadSourceFile(project, abs, fs.readFileSync(abs, "utf8"));

		return null;
	} catch (error) {
		const e: { message?: string } = error;

		return `${toRel(repoRoot, abs)} — ${reasonOf(e)}`;
	}
};

const openProject = (repoRoot: string, absFiles: readonly string[], arch: Pick<Arch, "aliases">): Project => {
	const project = createTsProject({ repoRoot, aliases: arch.aliases });
	const failed = absFiles.map((abs) => loadOne(project, repoRoot, abs)).filter((f): f is string => f != null);
	reportLoadFailures(failed);

	return project;
};

export { openProject };
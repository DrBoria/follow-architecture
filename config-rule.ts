"use strict";

// The ESLint rule itself: anchor the run on the file being linted, load the
// repo's state once, check the file, and report. The scan scope, the report
// accumulation and the option schema live in their own modules; this module
// only wires them to ESLint's contract.

import * as path from "node:path";
import { minimatch } from "minimatch";
import { checkFile } from "./pipeline";
import { DEFAULT_IGNORE_DIRS } from "./utils/pattern";
import { renderConfigError } from "./report/cli-report";
import { isConfigError } from "./report/config-error-guard";
import { findRepoRoot, getRuleState, type RuleState } from "./config-state";
import { DEFAULT_EXPORT_PATH, reportFor, recordFindings } from "./config-report";
import { RULE_SCHEMA, optionsOf, type RuleOptions } from "./config-options";
import { fieldOf } from "./utils/field";
import type { Finding } from "./entities/findings";

// The slice of ESLint's rule context this rule reads.
type RuleContext = {
	options: (string | RuleOptions)[];
	filename?: string;
	getFilename: () => string;
	report: (descriptor: { node?: FieldValueNode; message: string; loc?: { start: { line: number; column: number }; end: { line: number; column: number } } }) => void;
};
type FieldValueNode = Record<string, never>;

// Is this file outside the scan scope? Scan scope (exts, ignore dirs, ignore
// globs) comes ONLY from the tool: its defaults + the ESLint rule options. The
// architecture yaml must not carry it — it describes the code, not how to scan it.
const skipped = (rel: string, opts: RuleOptions): boolean => {
	const ignoreDirs = [...new Set([...DEFAULT_IGNORE_DIRS, ...(opts.ignoreDirs ?? [])])];
	if (ignoreDirs.some((d) => rel === d || rel.startsWith(`${d}/`))) return true;
	if ((opts.ignores ?? []).some((g) => minimatch(rel, g))) return true;

	return Boolean(opts.include?.length) && !opts.include.some((g) => minimatch(rel, g));
};

// A broken config is the reader's to fix, and they fix it in an editor — so it
// is REPORTED as one error on the file being linted, in the same words the CLI
// prints. Throwing instead buried the sentence in an ESLint stack trace. A
// crash of the engine itself is not a sentence and is left to throw.
const stateOrReport = (repoRoot: string, opts: RuleOptions, context: RuleContext): RuleState | { Program: (node: FieldValueNode) => void } => {
	try {
		return getRuleState(repoRoot, opts);
	} catch (error) {
		const e = error instanceof Error ? error : new Error(String(error));
		if (!isConfigError(e)) throw error;
		const message = renderConfigError(e);

		return { Program: (node) => context.report({ node, message }) };
	}
};

// One finding → one ESLint report. `fix` is human-readable instruction text
// (how to resolve the finding), not an ESLint auto-fix patch — so it is
// appended to the message, which is what surfaces in lint output and drives
// agent-driven fixes.
const reportFinding = (f: Finding, context: RuleContext): void => {
	const message = fieldOf(f, "message");
	const fix = fieldOf(f, "fix");
	const line = Number(fieldOf(f, "pos.line") ?? 1);
	const column = Number(fieldOf(f, "pos.column") ?? 1);
	context.report({
		message: fix ? `${message}\n\nHow to fix: ${fix}` : String(message),
		loc: { start: { line, column: column - 1 }, end: { line, column } },
	});
};

const create = (context: RuleContext): Record<string, (node: FieldValueNode) => void> => {
	const opts = optionsOf(context.options[0]);
	const filePath = context.filename ?? context.getFilename();
	// Anchor on the file, not on cwd: the ESLint server's cwd can be any ancestor
	// directory, while the architecture file sits at the repo root. A named
	// config file is the anchor; the default names are the fallback.
	const namedConfig = typeof opts.config === "string" ? path.basename(opts.config) : null;
	const repoRoot = findRepoRoot(path.dirname(filePath), namedConfig);
	const rel = path.relative(repoRoot, filePath).split(path.sep).join("/");
	const state = stateOrReport(repoRoot, opts, context);
	if ("Program" in state) return state;
	if (skipped(rel, opts)) return {};
	const { arch, project, repoFiles, dedupe } = state;
	const findings = checkFile(filePath, arch, project, repoFiles, dedupe);
	// The report is the run's, not the file's: accumulate, write on the way out,
	// into `exportPath`. `false` disables the file and leaves the findings to
	// ESLint only.
	const exportPath = opts.exportPath === false ? null : (opts.exportPath ?? DEFAULT_EXPORT_PATH);
	if (exportPath) {
		const architecturePath = typeof opts.config === "string" ? path.resolve(repoRoot, opts.config) : null;
		recordFindings(reportFor(repoRoot, exportPath, state, architecturePath), rel, findings);
	}
	for (const f of findings) reportFinding(f, context);

	return {};
};

const rule = {
	meta: {
		type: "problem",
		docs: { description: "Enforces the architecture defined in architecture.yaml (or architecture.json)" },
		schema: RULE_SCHEMA,
	},
	create,
};

export { rule };
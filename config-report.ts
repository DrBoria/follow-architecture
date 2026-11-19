"use strict";

// The report file. A lint run visits every file once and the rule's create()
// is called per file, so the rule has no "end of run" hook of its own. Findings
// are therefore ACCUMULATED here — one bucket per repo root + output path —
// and the report is written on the way out: a debounced write while the run
// continues, and one final write on process exit. That is what makes a plain
// `eslint <dirs>` run leave the whole report in the file the ESLint config
// names, with no CLI step.
//
// The report is the SAME self-contained HTML the CLI's `--overview` writes —
// the readable one with the tree, the graph and every finding.

import * as path from "node:path";
import { notice } from "./report/notices";
import { reasonOf } from "./utils/reason";
import { fieldOf } from "./utils/field";
import { collectOverviewData as collectRaw, writeOverview as writeRaw } from "./report/user-report";
import type { Project } from "ts-morph";
import type { Arch } from "./entities/architecture";
import type { Finding } from "./entities/findings";
import type { RuleState } from "./config-state";

// The report layer owns its payload; the input contract is the ONE entity
// (`entities/overview`), so the rule path and the CLI hand it the same shape.
const collectOverviewData = collectRaw;
const writeOverview = writeRaw;

const DEFAULT_EXPORT_PATH = "reports/architecture-overview.html";

// One output file's accumulation: the findings per file, and the run state the
// overview is built from.
type ReportBucket = {
	repoRoot: string;
	outPath: string;
	files: Map<string, Map<string, Finding>>;
	timer: ReturnType<typeof setTimeout> | null;
	dirty: boolean;
	arch: Arch;
	project: Project;
	repoFiles: string[];
	architecturePath: string | null;
};

const reportBuckets = new Map<string, ReportBucket>();
let exitHookInstalled = false;

// One bucket's overview: the files in SORTED order, not in the order they
// happened to be linted — the report is read as a document, and the same tree
// has to produce the same document.
const writeBucket = (bucket: ReportBucket): void => {
	const files = [...bucket.files.keys()].sort();
	const findings = files.flatMap((file) => [...(bucket.files.get(file)?.values() ?? [])]);
	const data = collectOverviewData({
		arch: bucket.arch,
		findings,
		orphans: [],
		files,
		repoFiles: bucket.repoFiles,
		repoRoot: bucket.repoRoot,
		architecturePath: bucket.architecturePath,
		project: bucket.project,
	});
	writeOverview(data, bucket.outPath);
	bucket.dirty = false;
};

const flushReports = (): void => {
	for (const bucket of reportBuckets.values()) {
		if (!bucket.dirty) continue;
		try {
			writeBucket(bucket);
		} catch (error) {
			// A report is a convenience — it must not break linting — but a SILENT
			// failure left a stale file that looked like the fix had not been applied,
			// so the reason is stated.
			const e: { message?: string } = error;
			notice(`could not write ${bucket.outPath}`, reasonOf(e));
		}
	}
};

const installExitHook = (): void => {
	if (exitHookInstalled) return;
	exitHookInstalled = true;
	// The exit write is unconditional: a debounced write may already have run
	// mid-lint, and skipping it here left the file stale (an older bundle, and
	// the last files' findings missing) exactly when the run finished.
	process.once("exit", () => {
		for (const bucket of reportBuckets.values()) bucket.dirty = true;
		flushReports();
	});
};

// A new bucket for one (repoRoot, outPath) pair, remembered for the next lint.
const newBucket = (repoRoot: string, outPath: string, state: RuleState, architecturePath: string | null): ReportBucket => {
	const bucket: ReportBucket = { repoRoot, outPath, files: new Map(), timer: null, dirty: false, arch: state.arch, project: state.project, repoFiles: state.repoFiles, architecturePath };
	reportBuckets.set(`${repoRoot}\u0000${outPath}`, bucket);
	installExitHook();
	return bucket;
};

const reportFor = (repoRoot: string, out: string, state: RuleState, architecturePath: string | null): ReportBucket => {
	const outPath = path.resolve(repoRoot, out);
	return reportBuckets.get(`${repoRoot}\u0000${outPath}`) ?? newBucket(repoRoot, outPath, state, architecturePath);
};

// Two config blocks may both enable the rule for the same file (an ancestor
// folder and its parent), so the same finding can arrive twice. The bucket
// keeps one Map per FILE, keyed by the finding's own identity — so a repeat
// replaces instead of piling up. A file's findings are REPLACED on every lint
// of that file, so a long-lived ESLint server (the editor) never accumulates
// findings for code that has already been fixed. The identity is read through
// the plain-data field reader — a finding is an opaque bag.
const identityOf = (f: Finding): string => `${fieldOf(f, "pos.line")}\u0000${fieldOf(f, "pos.column")}\u0000${fieldOf(f, "message")}`;

const recordFindings = (bucket: ReportBucket, file: string, findings: readonly Finding[]): void => {
	const perFile = new Map<string, Finding>();
	for (const f of findings) perFile.set(identityOf(f), f);
	bucket.files.set(file, perFile);
	bucket.dirty = true;
	if (bucket.timer) clearTimeout(bucket.timer);
	bucket.timer = setTimeout(() => {
		bucket.timer = null;
		flushReports();
	}, 1000);
	// The debounced write must never keep a finished lint run alive.
	if (typeof bucket.timer.unref === "function") bucket.timer.unref();
};

export { DEFAULT_EXPORT_PATH, reportFor, recordFindings };
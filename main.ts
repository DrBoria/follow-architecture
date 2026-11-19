"use strict";

import * as fs from "node:fs";
import * as path from "node:path";
import { pipe, map, filter, flatMap } from "remeda";

import { buildTree, matchers } from "./entities/tree";
import { normalizeCodeRoles } from "./code-roles/roles";
import { normalizeInvariant } from "./invariants/normalize";
import { normalizeAliases } from "./aliases";
import { checkFile } from "./pipeline";
import { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS } from "./utils/pattern";
import { renderReport, renderNotices } from "./report/cli-report";
import { openProject } from "./config";
import { takeNotices } from "./report/notices";
import { collectOverviewData as collectRaw, writeOverview as writeRaw } from "./report/user-report";
import { toRel } from "./utils/imports";
import { collectFiles } from "./utils/files";
import { parseArgs } from "./args";
import { keyedDefs } from "./utils/keyed";
import { isObj } from "./utils/field";
import * as configError from "./report/configErrors";
import * as yaml from "js-yaml";
import type { Project } from "ts-morph";
import type { Arch, RawArch, RawNode } from "./entities/architecture";
import type { Finding } from "./entities/findings";
import type { SeenStore } from "./utils/seen";
import type { RuleOptions } from "./config-options";

// The report layer owns its payload; the input contract is the ONE entity
// (`entities/overview`), so the rule path and the CLI hand it the same shape.
const collectOverviewData = collectRaw;
const writeOverview = writeRaw;

// The nodes section as a list — the shared list-or-map walk, the same one the
// tree builder reads.
const nodesOf = (raw: RawArch): RawNode[] => keyedDefs(raw.nodes).filter((n): n is RawNode => n != null);

// Every invariant id must be unique, and every role a node names must exist —
// a typo would otherwise give a home to a role nothing ever infers.
const checkBuilt = (arch: Pick<Arch, "invariants" | "codeRoles" | "nodes">): void => {
	const ids = arch.invariants.map((i) => i.id);
	if (new Set(ids).size !== ids.length) throw configError.duplicateInvariantIds(ids);
	const known = new Set(Object.keys(arch.codeRoles));
	for (const role of Object.keys(arch.nodes.roleHomes)) {
		if (!known.has(role)) throw configError.nodeRoleUnknown(role);
	}
};

// What `buildArchitecture` reads: the architecture's own sections, all
// optional. The rule's options bag carries the same sections beside the tool's
// own keys, so it is accepted too — the normalizers validate every section and
// ignore what is not theirs.
type ArchSections = Pick<RawArch, "nodes" | "codeRoles" | "invariants" | "aliases" | "report">;

const buildArchitecture = (raw: ArchSections | null | undefined): Arch => {
	if (!isObj(raw)) throw configError.notAnObject();
	const config: RawArch = raw;
	if (!nodesOf(config).length) throw configError.withoutNodes();
	const codeRoles = config.codeRoles ? normalizeCodeRoles(config.codeRoles) : {};
	const tree = buildTree(config.nodes);
	const invariants = pipe(config.invariants ?? [], map((i) => normalizeInvariant(i, new Set(Object.keys(codeRoles)))));
	const arch: Arch = {
		nodes: tree,
		codeRoles,
		invariants,
		aliases: normalizeAliases(config.aliases ?? {}),
		// The config as written, for consumers that show it back (the overview).
		raw: config,
	};
	checkBuilt(arch);

	return arch;
};

// An architecture file is DATA — YAML or JSON. JSON is valid YAML, so the
// extension decides nothing and there is ONE parser. The parser's answer is
// plain data; the typed view is taken here at the boundary (the same pattern
// the tree uses for the structure renders), and `buildArchitecture` validates
// it — a non-object is not a config, and says so.
const parseArchitecture = (text: string, file: string): RawArch => {
	try {
		const loaded: RawArch = yaml.load(text, { filename: file });

		return loaded;
	} catch (error) {
		const e: { reason?: string; message?: string; mark?: { line: number; column: number } } = error;
		throw configError.unparseable({ reason: describeParse(e) });
	}
};

// Where the file itself is wrong — a missing comma, a tab used as indentation.
// The parser knows the position; the reader needs it, so it travels in the
// sentence.
const describeParse = (error: { reason?: string; message?: string; mark?: { line: number; column: number } }): string => {
	const reason = String(error.reason ?? error.message ?? error).split("\n")[0];
	const at = error.mark ? ` (line ${error.mark.line + 1}, column ${error.mark.column + 1})` : "";

	return `${reason}${at}`;
};

// Every failure between "here is a path" and "here is a usable architecture"
// happens inside ONE call, so the file is named in ONE place: the sentence says
// what the key claims, but only the path says which architecture to open. A
// config error stays a sentence; a bug keeps its stack and never pretends to be
// about the config.
const naming = (file: string, run: () => Arch): Arch => {
	try {
		return run();
	} catch (error) {
		const e: { isConfigError?: boolean; message?: string } = error;
		if (e.isConfigError) e.message = `${e.message}\n  in ${file}`;
		throw error;
	}
};

const readConfigText = (file: string): string => {
	try {
		return fs.readFileSync(file, "utf8");
	} catch (error) {
		const e: { code?: string } = error;
		throw configError.unreadable({ code: e.code });
	}
};

// A config may arrive as a path, as the raw object, or as the rule's own
// options bag (which carries the architecture's sections beside the tool's).
// All three are read here: a `file` key names a path to load; anything else is
// built from the sections it carries. The sections view is taken at this
// boundary — the record's keys are the data the normalizers validate.
const loadArchitecture = (config: string | RawArch | RuleOptions | null | undefined): Arch => {
	if (isObj(config) && typeof config.file === "string") return loadArchitecture(config.file);
	if (typeof config !== "string") {
		const sections: ArchSections = config ?? {};

		return buildArchitecture(sections);
	}
	const file = path.resolve(process.cwd(), config);

	return naming(file, () => buildArchitecture(parseArchitecture(readConfigText(file), file)));
};

// The files a run checks: `--files` restricts the scan to the given files
// (agent stop-hooks lint only changed files); otherwise every scanned file.
const collectedFiles = (repoRoot: string, scanned: readonly string[], files: readonly string[]): { abs: string; rel: string }[] => {
	if (files.length) {
		return pipe(files, map((rel) => path.resolve(repoRoot, rel)), filter((abs) => fs.existsSync(abs) && fs.statSync(abs).isFile()), map((abs) => ({ abs, rel: toRel(repoRoot, abs) })));
	}

	return pipe(scanned, map((abs) => ({ abs, rel: toRel(repoRoot, abs) })));
};

// The run's findings: every checked file, one shared dedupe store.
const runFindings = (files: readonly { abs: string; rel: string }[], run: { arch: Arch; project: Project; repoFiles: string[]; shouldCheck: (rel: string) => boolean }): { findings: Finding[]; orphans: string[] } => {
	const dedupe: SeenStore = new Map();
	const findings = pipe(files, filter((f) => run.shouldCheck(f.rel)), flatMap((f) => checkFile(f.abs, run.arch, run.project, run.repoFiles, dedupe)));
	const orphans = pipe(files, filter((f) => !run.shouldCheck(f.rel)), map((f) => f.rel), (r) => [...r].sort());

	return { findings, orphans };
};

const writeOverviewReport = (args: { overview: string; check: boolean }, run: { arch: Arch; findings: Finding[]; orphans: string[]; repoFiles: string[]; repoRoot: string; configPath: string | undefined; project: Project }): number => {
	const data = collectOverviewData({
		arch: run.arch,
		findings: run.findings,
		orphans: run.orphans,
		files: run.repoFiles,
		repoFiles: run.repoFiles,
		repoRoot: run.repoRoot,
		architecturePath: typeof run.configPath === "string" ? run.configPath : null,
		project: run.project,
	});
	const written = writeOverview(data, path.resolve(run.repoRoot, args.overview));
	console.log(`wrote ${path.relative(run.repoRoot, written.path)} (${run.findings.length} findings, ${Math.round(written.bytes / 1024)} kB)`);
	const caveats = renderNotices(takeNotices());
	if (caveats) console.log(caveats);

	return args.check && run.findings.length > 0 ? 1 : 0;
};

const writeTextReport = (args: { out: string | null | undefined; check: boolean }, run: { findings: Finding[]; orphans: string[]; repoRoot: string }): number => {
	const rewritten = renderReport(run.findings, run.repoRoot, { orphans: run.orphans });
	const text = `${rewritten}${renderNotices(takeNotices())}`;
	if (args.out) {
		fs.writeFileSync(args.out, text);
		console.log(`wrote ${args.out} (${run.findings.length} findings)`);
	} else {
		console.log(text);
	}

	return args.check && run.findings.length > 0 ? 1 : 0;
};

const main = (argv: string[]): number => {
	const args = parseArgs(argv);
	if (args.help) {
		console.log("usage: follow-architecture [--config <path>] [--ext <.ext>]... [--ignore <glob>]... [--ignore-dir <name>]... [--files <path>]... [--out <path>] [--overview [path]] [--check]");

		return 0;
	}
	const cwd = path.resolve(args.cwd ?? process.cwd());
	// The repo starts where the architecture file is — the SAME anchor the ESLint
	// rule uses — so `--config ../arch.yaml` scans the repo that file describes.
	// An explicit `--cwd` still decides where the scan begins.
	const configPath = typeof args.config === "string" ? path.resolve(cwd, args.config) : args.config;
	const repoRoot = typeof configPath === "string" && args.cwd == null ? path.dirname(configPath) : cwd;
	const arch = loadArchitecture(configPath);
	arch.repoRoot = repoRoot;
	const shouldCheck = matchers(arch);
	// Scan scope is the TOOL's: its defaults, extended by `--ext`, never by the
	// architecture (which describes code, not how to find it).
	const exts = [...new Set([...DEFAULT_EXTS, ...(args.ext ?? [])])];
	const ignoreDirs = [...new Set([...DEFAULT_IGNORE_DIRS, ...(args.ignoreDir ?? [])])];
	// ONE walk: the scan list, the repo file list and the ts-morph project are the
	// same set of files. `references` asks who uses a name ACROSS files.
	const scanned = collectFiles(repoRoot, { exts, ignoreDirs, ignoreGlobs: args.ignore ?? [] });
	const project = openProject(repoRoot, scanned, arch);
	const collected = collectedFiles(repoRoot, scanned, args.files);
	// `repoFiles` is the FULL repo file list (for import resolution and folder
	// facts), even when `--files` restricts which files are CHECKED.
	const repoFiles = pipe(scanned, map((abs) => toRel(repoRoot, abs)));
	const { findings, orphans } = runFindings(collected, { arch, project, repoFiles, shouldCheck });
	const run = { arch, findings, orphans, repoFiles, repoRoot, configPath, project };
	if (args.overview) return writeOverviewReport({ overview: args.overview, check: args.check }, run);

	return writeTextReport({ out: args.out, check: args.check }, { findings, orphans, repoRoot });
};

export { main, loadArchitecture, buildArchitecture };

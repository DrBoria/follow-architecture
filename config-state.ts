"use strict";

// The rule's per-repo state: the architecture, the ts-morph project, and the
// repo file list, cached per repo root. The rule's create() runs once per file;
// rebuilding the project every time would be the dominant cost.

import * as fs from "node:fs";
import * as path from "node:path";
import { loadArchitecture } from "./main";
import { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS, DEFAULT_SIMILARITY } from "./utils/pattern";
import { toRel } from "./utils/imports";
import { collectFiles } from "./utils/files";
import { openProject } from "./config-project";
import type { Project } from "ts-morph";
import type { Arch } from "./entities/architecture";
import type { SeenStore } from "./utils/seen";
import type { RuleOptions } from "./config-options";

// The config is DATA. `.js` is not here on purpose: a config that has to be
// evaluated is a second format, and this engine reads one (YAML/JSON).
const CONFIG_NAMES = ["architecture.yaml", "architecture.yml", "architecture.json"];

// Where the repo starts: the folder that holds the architecture file. The file
// the RULE was given is the strongest anchor — a project may call it anything,
// and walking up until some DEFAULT name appears would anchor the run on a
// different file (or, with none in sight, on whatever the editor's cwd happens
// to be). The defaults are only for the case where nobody named one.
const findRepoRoot = (from: string, configName: string | null = null): string => {
	const names = configName ? [configName, ...CONFIG_NAMES] : CONFIG_NAMES;
	let dir = from;
	for (;;) {
		for (const name of names) {
			if (fs.existsSync(path.join(dir, name))) return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) return process.cwd();
		dir = parent;
	}
};

// The heavy per-run state, one bucket per repo root.
type RuleState = { arch: Arch; project: Project; repoFiles: string[]; dedupe: SeenStore };

// The architecture the rule option names: a config path (string or {config}),
// or the architecture object itself. A bare object option is the raw config
// (the rule's own schema accepts it); `loadArchitecture` reads its `file` key
// or builds from it.
const archOf = (repoRoot: string, opts: RuleOptions): Arch => {
	const config = opts.config;
	if (typeof config === "string") return loadArchitecture(path.isAbsolute(config) ? config : path.resolve(repoRoot, config));
	if (config != null) return loadArchitecture(config);

	return loadArchitecture(opts);
};

const stateCache = new Map<string, RuleState>();

// Build the state for one repo root: the architecture, the project that holds
// the whole repo (references ask across files), and the scan scope.
const buildState = (repoRoot: string, opts: RuleOptions): RuleState => {
	const arch = archOf(repoRoot, opts);
	// The CLI sets this in main; the rule path must set it too — the pipeline
	// resolves imports and file facts against arch.repoRoot.
	arch.repoRoot = repoRoot;
	// Scan scope is the TOOL's: its defaults, extended by the rule's options —
	// never the architecture, which describes code, not how to find it.
	const exts = [...new Set([...DEFAULT_EXTS, ...(opts.exts ?? [])])];
	const ignoreDirs = [...new Set([...DEFAULT_IGNORE_DIRS, ...(opts.ignoreDirs ?? [])])];
	// How alike a folder must be to a declared entity before a "no role" finding
	// may offer it as a destination. A RULE option, not a fact of the
	// architecture: the default is 60%.
	arch.similarity = typeof opts.similarity === "number" ? opts.similarity : DEFAULT_SIMILARITY;
	// ONE walk feeds the project, the file list and the facts: `references` asks
	// who uses a name ACROSS files, so the project has to hold the repo.
	const scanned = collectFiles(repoRoot, { exts, ignoreDirs });
	const state: RuleState = { arch, project: openProject(repoRoot, scanned, arch), repoFiles: scanned.map((abs) => toRel(repoRoot, abs)), dedupe: new Map() };
	stateCache.set(repoRoot, state);
	return state;
};

const getRuleState = (repoRoot: string, opts: RuleOptions): RuleState => stateCache.get(repoRoot) ?? buildState(repoRoot, opts);

export { findRepoRoot, getRuleState };
export type { RuleState };
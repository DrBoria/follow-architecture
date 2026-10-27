"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pipe, map, filter, flatMap } = require("remeda");
const { minimatch } = require("minimatch");
const { buildTree, matchers } = require("./nodes/tree");
const { normalizeCodeRoles } = require("./code-roles/roles");
const { normalizeInvariant } = require("./invariants/normalize");
const { normalizeAliases } = require("./aliases");
const { checkFile } = require("./pipeline");
const { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS } = require("./utils/pattern");
const { renderReport } = require("./report/user-report");
const { createTsProject } = require("./ast");
const { toRel } = require("./utils/imports");
const { parseArgs } = require("./args");

const buildArchitecture = (raw) => {
	if (!raw || typeof raw !== "object") throw new Error("architecture: expected an object");
	const nodeList = Array.isArray(raw.nodes) ? raw.nodes : raw.nodes ? Object.values(raw.nodes) : [];
	if (!nodeList.length) throw new Error("architecture.nodes: must be a non-empty array or object");
	const codeRoles = raw.codeRoles ? normalizeCodeRoles(raw.codeRoles) : {};
	const tree = buildTree(raw.nodes);
	const invariants = pipe(raw.invariants ?? [], map((i) => normalizeInvariant(i)));
	const ids = invariants.map((i) => i.id);
	if (new Set(ids).size !== ids.length) throw new Error("architecture.invariants: ids must be unique");
	return {
		nodes: tree,
		codeRoles,
		invariants,
		aliases: normalizeAliases(raw.aliases ?? {}),
		// Union of every role's `scopeAccessors` — structured chain roots
		// (`{ kind, segments }`) that reach some role. Per-role lists live on
		// the roles themselves (see roles.js); this is just the deduped set
		// the fact collector scans for when recording `scopeAccesses`.
		scopeAccessors: [...new Map(Object.values(codeRoles).flatMap((r) => r.scopeAccessors).map((a) => [`${a.kind}:${a.segments.join(".")}`, a])).values()],
		raw,
	};
};

const parseArchitectureText = (text, p) => {
	const ext = path.extname(p).toLowerCase();
	if (ext === ".yaml" || ext === ".yml") {
		const { load } = require("js-yaml");
		return load(text);
	}
	return JSON.parse(text);
};

const loadArchitecture = (config) => {
	if (typeof config === "string") {
		const p = path.resolve(process.cwd(), config);
		const text = fs.readFileSync(p, "utf8");
		if (p.endsWith(".js") || p.endsWith(".cjs")) return buildArchitecture(require(p));
		return buildArchitecture(parseArchitectureText(text, p));
	}
	if (config && typeof config === "object" && typeof config.file === "string") return loadArchitecture(config.file);
	return buildArchitecture(config);
};

const collectFiles = (repoRoot, { exts, ignoreDirs, ignoreGlobs }) => {
	const extSet = new Set(exts);
	const ignoreSet = new Set(ignoreDirs);
	const out = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const abs = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (!ignoreSet.has(entry.name)) walk(abs);
			} else if (extSet.has(path.extname(entry.name))) {
				if (!ignoreGlobs.some((g) => minimatch(toRel(repoRoot, abs), g))) out.push(abs);
			}
		}
	};
	walk(repoRoot);
	return out;
};

const main = (argv) => {
	const args = parseArgs(argv);
	if (args.help) {
		console.log("usage: follow-architecture [--config <path>] [--ignore <glob>]... [--files <path>]... [--out <path>] [--check]");
		return 0;
	}
	const repoRoot = path.resolve(args.cwd ?? process.cwd());
	const arch = loadArchitecture(args.config);
	arch.repoRoot = repoRoot;
	const project = createTsProject(repoRoot);
	const shouldCheck = matchers(arch);
	// --files restricts the scan to the given files (agent stop-hooks lint only
	// changed files); orphans are then computed over that set only.
	const collected = args.files.length
		? pipe(args.files, map((rel) => path.resolve(repoRoot, rel)), filter((abs) => fs.existsSync(abs) && fs.statSync(abs).isFile()), map((abs) => ({ abs, rel: toRel(repoRoot, abs) })))
		: pipe(
				collectFiles(repoRoot, { exts: DEFAULT_EXTS, ignoreDirs: DEFAULT_IGNORE_DIRS, ignoreGlobs: args.ignore ?? [] }),
				map((abs) => ({ abs, rel: toRel(repoRoot, abs) })),
		  );
	const all = collected;
	const files = pipe(all, filter((f) => shouldCheck(f.rel)));
	const orphans = pipe(all, filter((f) => !shouldCheck(f.rel)), map((f) => f.rel), (r) => [...r].sort());
	// `repoFiles` is the FULL repo file list (for import resolution and
	// folder facts), even when `--files` restricts which files are CHECKED —
	// a stop-hook lints only changed files, but their imports point at the
	// rest of the repo.
	const repoFiles = args.files.length ? pipe(collectFiles(repoRoot, { exts: DEFAULT_EXTS, ignoreDirs: DEFAULT_IGNORE_DIRS, ignoreGlobs: args.ignore ?? [] }), map((abs) => toRel(repoRoot, abs))) : pipe(all, map((f) => f.rel));
	const dedupe = new Map();
	const findings = pipe(files, flatMap((f) => checkFile(f.abs, arch, project, repoFiles, dedupe)));
	const text = renderReport(findings, repoRoot, { orphans });
	if (args.out) {
		fs.writeFileSync(args.out, text);
		console.log(`wrote ${args.out} (${findings.length} findings)`);
	} else {
		console.log(text);
	}
	if (args.check && findings.length > 0) return 1;
	return 0;
};

module.exports = { main, loadArchitecture, buildArchitecture };

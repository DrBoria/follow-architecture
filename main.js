"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pipe, map, filter, flatMap } = require("remeda");

const { buildTree, matchers } = require("./nodes/tree");
const { normalizeCodeRoles } = require("./code-roles/roles");
const { normalizeInvariant } = require("./invariants/normalize");
const { normalizeAliases } = require("./aliases");
const { checkFile } = require("./pipeline");
const { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS } = require("./utils/pattern");
const { renderReport } = require("./report/cli-report");
const { collectOverviewData, writeOverview } = require("./report/user-report");
const { createTsProject } = require("./ast");
const { toRel } = require("./utils/imports");
const { collectFiles } = require("./utils/files");
const { parseArgs } = require("./args");
const yaml = require("js-yaml");

// An architecture file is JSON or YAML — the extension does not matter, the
// content decides. A JSON file is valid YAML, so one parser covers both.
const parseArchitectureText = (text, file) => {
	if (/\.json$/i.test(file)) return JSON.parse(text);
	return yaml.load(text, { filename: file });
};

// The name the findings should tell the reader to edit: whatever file this
// architecture actually came from — `architecture.yaml` is a default, not a law.
const buildArchitecture = (raw, source = null) => {
	if (!raw || typeof raw !== "object") throw new Error("architecture: expected an object");
	const nodeList = Array.isArray(raw.nodes) ? raw.nodes : raw.nodes ? Object.values(raw.nodes) : [];
	if (!nodeList.length) throw new Error("architecture.nodes: must be a non-empty array or object");
	const codeRoles = raw.codeRoles ? normalizeCodeRoles(raw.codeRoles) : {};
	const tree = buildTree(raw.nodes);
	const invariants = pipe(raw.invariants ?? [], map((i) => normalizeInvariant(i, new Set(Object.keys(codeRoles)))));
	const ids = invariants.map((i) => i.id);
	if (new Set(ids).size !== ids.length) throw new Error("architecture.invariants: ids must be unique");
	// A node says WHERE code lives, so the role it names has to exist — a typo
	// would otherwise give a home to a role nothing ever infers.
	const known = new Set(Object.keys(codeRoles));
	for (const role of Object.keys(tree.roleHomes)) {
		if (!known.has(role)) throw new Error(`nodes: \`role: ${role}\` names no codeRole — the node gives a home to code the config never describes`);
	}
	const arch = {
		nodes: tree,
		codeRoles,
		invariants,
		aliases: normalizeAliases(raw.aliases ?? {}),
		// The config as written, for consumers that show it back (the overview).
		raw,
	};
	return arch;
};

const loadArchitecture = (config) => {
	if (typeof config === "string") {
		const p = path.resolve(process.cwd(), config);
		const text = fs.readFileSync(p, "utf8");
		if (p.endsWith(".js") || p.endsWith(".cjs")) return buildArchitecture(require(p), p);
		return buildArchitecture(parseArchitectureText(text, p), p);
	}
	if (config && typeof config === "object" && typeof config.file === "string") return loadArchitecture(config.file);
	return buildArchitecture(config);
};

const main = (argv) => {
	const args = parseArgs(argv);
	if (args.help) {
		console.log("usage: follow-architecture [--config <path>] [--ext <.ext>]... [--ignore <glob>]... [--ignore-dir <name>]... [--files <path>]... [--out <path>] [--overview [path]] [--check]");
		return 0;
	}
	const repoRoot = path.resolve(args.cwd ?? process.cwd());
	const arch = loadArchitecture(args.config);
	arch.repoRoot = repoRoot;
	const project = createTsProject(repoRoot);
	const shouldCheck = matchers(arch);
	// Scan scope is the TOOL's: its defaults, extended by `--ext`, never by the
	// architecture (which describes code, not how to find it).
	const exts = [...new Set([...DEFAULT_EXTS, ...(args.ext ?? [])])];
	const ignoreDirs = [...new Set([...DEFAULT_IGNORE_DIRS, ...(args.ignoreDir ?? [])])];
	// --files restricts the scan to the given files (agent stop-hooks lint only
	// changed files); orphans are then computed over that set only.
	const collected = args.files.length
		? pipe(args.files, map((rel) => path.resolve(repoRoot, rel)), filter((abs) => fs.existsSync(abs) && fs.statSync(abs).isFile()), map((abs) => ({ abs, rel: toRel(repoRoot, abs) })))
		: pipe(
				collectFiles(repoRoot, { exts, ignoreDirs, ignoreGlobs: args.ignore ?? [] }),
				map((abs) => ({ abs, rel: toRel(repoRoot, abs) })),
		  );
	const all = collected;
	const files = pipe(all, filter((f) => shouldCheck(f.rel)));
	const orphans = pipe(all, filter((f) => !shouldCheck(f.rel)), map((f) => f.rel), (r) => [...r].sort());
	// `repoFiles` is the FULL repo file list (for import resolution and
	// folder facts), even when `--files` restricts which files are CHECKED —
	// a stop-hook lints only changed files, but their imports point at the
	// rest of the repo.
	const repoFiles = args.files.length ? pipe(collectFiles(repoRoot, { exts, ignoreDirs, ignoreGlobs: args.ignore ?? [] }), map((abs) => toRel(repoRoot, abs))) : pipe(all, map((f) => f.rel));
	const dedupe = new Map();
	const findings = pipe(files, flatMap((f) => checkFile(f.abs, arch, project, repoFiles, dedupe)));

	if (args.overview) {
		const data = collectOverviewData({
			arch,
			findings,
			orphans,
			files: repoFiles,
			repoFiles,
			repoRoot,
			architecturePath: typeof args.config === "string" ? path.resolve(repoRoot, args.config) : null,
			project,
		});
		const written = writeOverview(data, path.resolve(repoRoot, args.overview));
		console.log(`wrote ${path.relative(repoRoot, written.path)} (${findings.length} findings, ${Math.round(written.bytes / 1024)} kB)`);
		return args.check && findings.length > 0 ? 1 : 0;
	}

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

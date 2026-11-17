"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pipe, map, filter, flatMap } = require("remeda");

const { buildTree, matchers } = require("./entities/tree");
const { normalizeCodeRoles } = require("./code-roles/roles");
const { normalizeInvariant } = require("./invariants/normalize");
const { normalizeAliases } = require("./aliases");
const { checkFile } = require("./pipeline");
const { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS } = require("./utils/pattern");
const { renderReport, renderNotices } = require("./report/cli-report");
const { takeNotices } = require("./report/notices");
const { collectOverviewData, writeOverview } = require("./report/user-report");
const { toRel } = require("./utils/imports");
const { collectFiles } = require("./utils/files");
const { parseArgs } = require("./args");
const configError = require("./report/configErrors");
const yaml = require("js-yaml");

// The name the findings should tell the reader to edit: whatever file this
// architecture actually came from — `architecture.yaml` is a default, not a law.
const buildArchitecture = (raw, source = null) => {
	if (!raw || typeof raw !== "object") throw configError.notAnObject();
	const nodeList = Array.isArray(raw.nodes) ? raw.nodes : raw.nodes ? Object.values(raw.nodes) : [];
	if (!nodeList.length) throw configError.withoutNodes();
	const codeRoles = raw.codeRoles ? normalizeCodeRoles(raw.codeRoles) : {};
	const tree = buildTree(raw.nodes);
	const invariants = pipe(raw.invariants ?? [], map((i) => normalizeInvariant(i, new Set(Object.keys(codeRoles)))));
	const ids = invariants.map((i) => i.id);
	if (new Set(ids).size !== ids.length) throw configError.duplicateInvariantIds(ids);
	// A node says WHERE code lives, so the role it names has to exist — a typo
	// would otherwise give a home to a role nothing ever infers.
	const known = new Set(Object.keys(codeRoles));
	for (const role of Object.keys(tree.roleHomes)) {
		if (!known.has(role)) throw configError.nodeRoleUnknown(role);
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

// An architecture file is DATA — YAML or JSON. JSON is valid YAML, so the
// extension decides nothing and there is ONE parser: a second path keyed on
// `.js`/`.cjs` meant `require`-ing the config, which cannot work for `.mjs`, does
// not exist for `.ts`, and reads a file's text only to throw it away.
const parseArchitecture = (text, file) => {
	try {
		return yaml.load(text, { filename: file });
	} catch (error) {
		throw configError.unparseable({ reason: describeParse(error) });
	}
};

// Where the file itself is wrong — a missing comma, a tab used as indentation.
// The parser knows the position; the reader needs it, so it travels in the
// sentence.
const describeParse = (error) => {
	const reason = String(error.reason ?? error.message ?? error).split("\n")[0];
	const at = error.mark ? ` (line ${error.mark.line + 1}, column ${error.mark.column + 1})` : "";
	return `${reason}${at}`;
};

// Every failure between "here is a path" and "here is a usable architecture"
// happens inside ONE call, so the file is named in ONE place: the sentence says
// what the key claims, but only the path says which architecture to open. A
// config error stays a sentence; a bug keeps its stack and never pretends to be
// about the config.
const naming = (file, run) => {
	try {
		return run();
	} catch (error) {
		if (error && error.isConfigError) error.message = `${error.message}\n  in ${file}`;
		throw error;
	}
};

const loadArchitecture = (config) => {
	if (config && typeof config === "object" && typeof config.file === "string") return loadArchitecture(config.file);
	if (typeof config !== "string") return buildArchitecture(config);
	const file = path.resolve(process.cwd(), config);
	return naming(file, () => {
		let text;
		try {
			text = fs.readFileSync(file, "utf8");
		} catch (error) {
			throw configError.unreadable({ code: error.code });
		}
		return buildArchitecture(parseArchitecture(text, file));
	});
};

const main = (argv) => {
	const args = parseArgs(argv);
	if (args.help) {
		console.log("usage: follow-architecture [--config <path>] [--ext <.ext>]... [--ignore <glob>]... [--ignore-dir <name>]... [--files <path>]... [--out <path>] [--overview [path]] [--check]");
		return 0;
	}
	const cwd = path.resolve(args.cwd ?? process.cwd());
	// The repo starts where the architecture file is — the SAME anchor the ESLint
	// rule uses — so `--config ../arch.yaml` scans the repo that file describes,
	// instead of resolving it against the shell's cwd and rebuilding the tree from
	// the wrong folder. An explicit `--cwd` still decides where the scan begins.
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
	// same set of files. `references` asks who uses a name ACROSS files, so a
	// project holding only the file being checked answers "nobody" — and it cannot
	// follow a `@scope/…` import either, because the aliases come from the YAML.
	const scanned = collectFiles(repoRoot, { exts, ignoreDirs, ignoreGlobs: args.ignore ?? [] });
	// `config.js` owns how a run loads its TypeScript, and it requires THIS module
	// for `loadArchitecture` — so it is taken here, at call time, when both are
	// fully evaluated.
	const { openProject } = require("./config");
	const project = openProject(repoRoot, scanned, arch);
	// --files restricts the scan to the given files (agent stop-hooks lint only
	// changed files); orphans are then computed over that set only.
	const collected = args.files.length
		? pipe(args.files, map((rel) => path.resolve(repoRoot, rel)), filter((abs) => fs.existsSync(abs) && fs.statSync(abs).isFile()), map((abs) => ({ abs, rel: toRel(repoRoot, abs) })))
		: pipe(
				scanned,
				map((abs) => ({ abs, rel: toRel(repoRoot, abs) })),
		  );
	const all = collected;
	const files = pipe(all, filter((f) => shouldCheck(f.rel)));
	const orphans = pipe(all, filter((f) => !shouldCheck(f.rel)), map((f) => f.rel), (r) => [...r].sort());
	// `repoFiles` is the FULL repo file list (for import resolution and
	// folder facts), even when `--files` restricts which files are CHECKED —
	// a stop-hook lints only changed files, but their imports point at the
	// rest of the repo.
	const repoFiles = pipe(scanned, map((abs) => toRel(repoRoot, abs)));
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
			architecturePath: typeof configPath === "string" ? configPath : null,
			project,
		});
		const written = writeOverview(data, path.resolve(repoRoot, args.overview));
		console.log(`wrote ${path.relative(repoRoot, written.path)} (${findings.length} findings, ${Math.round(written.bytes / 1024)} kB)`);
		const caveats = renderNotices(takeNotices());
		if (caveats) console.log(caveats);
		return args.check && findings.length > 0 ? 1 : 0;
	}

	const rewritten = renderReport(findings, repoRoot, { orphans });
	const text = `${rewritten}${renderNotices(takeNotices())}`;
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

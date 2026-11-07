"use strict";

// The plugin's own namespace — read from THIS package's name, so the config the
// tool writes names the plugin after itself instead of after a project.
const namespaceOf = () => String(require("../package.json").name ?? "follow-architecture").replace(/^@[^/]+\//, "");

const fs = require("node:fs");
const path = require("node:path");
const { minimatch } = require("minimatch");
const { loadArchitecture } = require("./main");
const { checkFile } = require("./pipeline");
const { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS, DEFAULT_SIMILARITY } = require("./utils/pattern");
const { createTsProject, loadSourceFile } = require("./entities/ast");
const { toRel } = require("./utils/imports");
const { collectFiles } = require("./utils/files");
const pkg = require("./package.json");

const CONFIG_NAMES = ["architecture.yaml", "architecture.yml", "architecture.json", "architecture.config.js"];

// The ts-morph project a run works on: the WHOLE repo, loaded once, with the
// YAML aliases handed to the compiler. `references` asks who uses a name, and
// that question is about every file — a project holding one file answers
// "nobody" for a helper the rest of the repo calls, and the answer changes
// depending on which file linted first.
//
// A file that cannot be read is NOT skipped silently: a missing file is missing
// from every answer the tool gives, so the run says which ones, the same way it
// says why it could not write its report.
const REPORTED_LOAD_FAILURES = 10;

const openProject = (repoRoot, absFiles, arch) => {
	const project = createTsProject({ repoRoot, aliases: arch.aliases });
	const failed = [];
	for (const abs of absFiles) {
		try {
			loadSourceFile(project, abs, fs.readFileSync(abs, "utf8"));
		} catch (error) {
			failed.push(`${toRel(repoRoot, abs)} — ${error && error.message ? error.message : error}`);
		}
	}
	if (failed.length) {
		const shown = failed.slice(0, REPORTED_LOAD_FAILURES).map((f) => `\n  ${f}`).join("");
		const rest = failed.length - REPORTED_LOAD_FAILURES;
		console.warn(`[follow-architecture] ${failed.length} file(s) are not part of the project, so no repo-wide answer (who calls a name, what a type is) includes them:${shown}${rest > 0 ? `\n  … and ${rest} more` : ""}`);
	}
	return project;
};

const findRepoRoot = (from) => {
	let dir = from;
	while (true) {
		for (const name of CONFIG_NAMES) {
			if (fs.existsSync(path.join(dir, name))) return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) return process.cwd();
		dir = parent;
	}
};



// Repo-wide relative file list for cross-folder invariants (location.files).
// The ONE walker (utils/files.js), keyed by the repo root and cached: the ESLint
// rule runs per file, and a full walk per file would be O(n^2).
// Per-repo-root cache of the heavy per-run state: the architecture, the
// ts-morph project, and the repo file list. The rule's create() runs once per
// file; rebuilding the project every time would be the dominant cost.
const stateCache = new Map();
const getRuleState = (repoRoot, opts) => {
	if (!stateCache.has(repoRoot)) {
		// The rule option is either a config path (string or {config}), or the
		// architecture object itself (flatConfig passes architecture.raw).
		const arch = typeof opts.config === "string" ? loadArchitecture(path.isAbsolute(opts.config) ? opts.config : path.resolve(repoRoot, opts.config)) : loadArchitecture(opts.config ?? opts);
		// The CLI sets this in main.js; the rule path must set it too —
		// pipeline.js resolves imports and file facts against arch.repoRoot.
		arch.repoRoot = repoRoot;
		// Scan scope is the TOOL's: its defaults, extended by the rule's options —
		// never the architecture, which describes code, not how to find it.
		const exts = [...new Set([...DEFAULT_EXTS, ...(opts.exts ?? [])])];
		const ignoreDirs = [...new Set([...DEFAULT_IGNORE_DIRS, ...(opts.ignoreDirs ?? [])])];
		// How alike a folder must be to a declared entity before a "no role"
		// finding may offer it as a destination. A RULE option, not a fact of the
		// architecture: the default is 60%.
		arch.similarity = typeof opts.similarity === "number" ? opts.similarity : DEFAULT_SIMILARITY;
		// ONE walk feeds the project, the file list and the facts: `references`
		// asks who uses a name ACROSS files, so the project has to hold the repo —
		// a project holding only the file being linted answers "nobody" for a
		// helper half the features call.
		const scanned = collectFiles(repoRoot, { exts, ignoreDirs });
		stateCache.set(repoRoot, { arch, project: openProject(repoRoot, scanned, arch), repoFiles: scanned.map((abs) => toRel(repoRoot, abs)), dedupe: new Map() });
	}
	return stateCache.get(repoRoot);
};

// ── The report file ──────────────────────────────────────────────────────────
// A lint run visits every file once and the rule's create() is called per file,
// so the rule has no "end of run" hook of its own. Findings are therefore
// ACCUMULATED here — one bucket per repo root + output path — and the report is
// written on the way out: a debounced write while the run continues, and one
// final write on process exit. That is what makes a plain `eslint <dirs>` run
// leave the whole report in the file the ESLint config names, with no CLI step.
//
// The report is the SAME self-contained HTML the CLI's `--overview` writes —
// the readable one with the tree, the graph and every finding. `exportPath` is
// the one option for it, the same name the sibling rules use for their export
// files; it defaults to `reports/architecture-overview.html` and `false` turns
// it off.
const DEFAULT_EXPORT_PATH = "reports/architecture-overview.html";

const reportBuckets = new Map();
let exitHookInstalled = false;

const flushReports = () => {
	for (const bucket of reportBuckets.values()) {
		if (!bucket.dirty) continue;
		try {
			const { collectOverviewData, writeOverview } = require("./report/user-report");
			// A file's findings are REPLACED on every lint of that file, so a
			// long-lived ESLint server (the editor) never accumulates findings
			// for code that has already been fixed. The files are taken in SORTED
			// order, not in the order they happened to be linted: the report is read
			// as a document, and the same tree has to produce the same document.
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
		} catch (error) {
			// A report is a convenience — it must not break linting — but a SILENT
			// failure left a stale file that looked like the fix had not been applied,
			// so the reason is printed.
			console.warn(`[follow-architecture] could not write ${bucket.outPath}: ${error && error.message ? error.message : error}`);
		}
	}
};

const installExitHook = () => {
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

const reportFor = (repoRoot, out, state) => {
	const outPath = path.resolve(repoRoot, out);
	const key = `${repoRoot}\u0000${outPath}`;
	if (!reportBuckets.has(key)) {
		reportBuckets.set(key, { repoRoot, outPath, files: new Map(), timer: null, dirty: false, ...state });
		installExitHook();
	}
	return reportBuckets.get(key);
};

// Two config blocks may both enable the rule for the same file (an ancestor
// folder and its parent), so the same finding can arrive twice. The bucket
// keeps one Map per FILE, keyed by the finding's own identity — so a repeat
// replaces instead of piling up.
const recordFindings = (bucket, file, findings) => {
	// `findings` is one file's run, so its entries REPLACE whatever was stored
	// for that file — a fixed finding disappears from the report on the next
	// lint instead of lingering, and a file that is now clean clears its section.
	const perFile = new Map();
	for (const f of findings) perFile.set(`${f.pos.line}\u0000${f.pos.column}\u0000${f.message}`, f);
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

const rule = {
	meta: {
		type: "problem",
		docs: { description: "Enforces the architecture defined in architecture.yaml (or architecture.json)" },
		schema: [
			{
				anyOf: [
					{ type: "string" },
					{
						type: "object",
						properties: {
							config: { type: "string" },
							include: { type: "array" },
							exts: { type: "array" },
							similarity: { type: "number" },
							ignoreDirs: { type: "array" },
							ignores: { type: "array" },
							exportPath: {
								anyOf: [{ type: "string" }, { type: "boolean" }],
								description:
									"Where the HTML overview is written, relative to the repo root. Default `reports/architecture-overview.html`. `false` turns it off.",
							},
						},
						additionalProperties: false,
					},
				],
			},
		],
	},
	create(context) {
		const rawOpts = context.options[0] ?? {};
		const opts = typeof rawOpts === "string" ? { config: rawOpts } : rawOpts;
		const filePath = context.filename ?? context.getFilename();
		// Anchor on the file, not on cwd: the ESLint server's cwd can be any
		// ancestor directory, while the architecture file sits at the repo root.
		const repoRoot = findRepoRoot(path.dirname(filePath));
		const rel = path.relative(repoRoot, filePath).split(path.sep).join("/");
		const { arch, project, repoFiles, dedupe } = getRuleState(repoRoot, opts);
		// Scan scope (exts, ignore dirs, ignore globs) comes ONLY from the tool:
		// its defaults + the ESLint rule options. The architecture yaml must not
		// carry it — it describes the code, not how to scan it.
		const ignoreDirs = [...new Set([...DEFAULT_IGNORE_DIRS, ...(opts.ignoreDirs ?? [])])];
		const ignoreGlobs = opts.ignores ?? [];
		if (ignoreDirs.some((d) => rel === d || rel.startsWith(`${d}/`))) return {};
		if (ignoreGlobs.some((g) => minimatch(rel, g))) return {};
		if (opts.include?.length && !opts.include.some((g) => minimatch(rel, g))) return {};
		const findings = checkFile(filePath, arch, project, repoFiles, dedupe);
		// The report is the run's, not the file's: accumulate, write on the way
		// out, into `exportPath` — the one option every rule in the family uses
		// for its output file. `false` disables the file and leaves the findings
		// to ESLint only.
		const exportPath = opts.exportPath === false ? null : opts.exportPath ?? DEFAULT_EXPORT_PATH;
		if (exportPath) {
			const architecturePath = typeof opts.config === "string" ? path.resolve(repoRoot, opts.config) : null;
			recordFindings(reportFor(repoRoot, exportPath, { arch, project, repoFiles, architecturePath }), rel, findings);
		}
		for (const f of findings) {
			// `fix` is human-readable instruction text (how to resolve the finding),
			// not an ESLint auto-fix patch — so it is appended to the message, which
			// is what surfaces in lint output and drives agent-driven fixes.
			const message = f.fix ? `${f.message}\n\nHow to fix: ${f.fix}` : f.message;
			context.report({
				message,
				loc: { start: { line: f.pos.line, column: f.pos.column - 1 }, end: { line: f.pos.line, column: f.pos.column } },
			});
		}
		return {};
	},
};

const plugin = {
	meta: { name: pkg.name, version: pkg.version },
	rules: { "follow-architecture": rule },
};

const flatConfig = (architecture, opts = {}) => {
	const { parser, files, ignores, plugins } = opts;
	const list = [];
	if (ignores?.length) list.push({ ignores });
	list.push({
		files: files ?? ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: parser ?? require("@typescript-eslint/parser"),
			parserOptions: { ecmaVersion: "latest", sourceType: "module" },
		},
		linterOptions: { reportUnusedDisableDirectives: "off" },
		plugins: plugins ?? { [namespaceOf()]: plugin },
		// The rule accepts either a config path (string) or the architecture
		// object itself; its create() resolves both.
		rules: { [`${namespaceOf()}/follow-architecture`]: ["error", architecture.raw ?? architecture] },
	});
	return list;
};

module.exports = {plugin, openProject};

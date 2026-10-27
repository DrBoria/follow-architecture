"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { minimatch } = require("minimatch");
const { loadArchitecture } = require("./main");
const { checkFile } = require("./pipeline");
const { DEFAULT_EXTS, DEFAULT_IGNORE_DIRS } = require("./utils/pattern");
const { createTsProject } = require("./ast");
const { toRel } = require("./utils/imports");
const pkg = require("./package.json");

const CONFIG_NAMES = ["architecture.yaml", "architecture.yml", "architecture.json", "architecture.config.js"];

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

const defaultConfigPath = (repoRoot) => {
	for (const name of CONFIG_NAMES) {
		if (fs.existsSync(path.join(repoRoot, name))) return path.join(repoRoot, name);
	}
	return path.join(repoRoot, "architecture.json");
};

// Repo-wide relative file list for cross-folder invariants (path.filesPerFolder).
// Walked once per repo root and cached: the ESLint rule runs per file, and a
// full walk per file would be O(n^2).
const listRepoFiles = (repoRoot, exts, ignoreDirs) => {
	const extSet = new Set(exts);
	const ignoreSet = new Set(ignoreDirs);
	const out = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const abs = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (!ignoreSet.has(entry.name)) walk(abs);
			} else if (extSet.has(path.extname(entry.name))) {
				out.push(toRel(repoRoot, abs));
			}
		}
	};
	try {
		walk(repoRoot);
	} catch {
		// unreadable tree: fall back to an empty list (folder facts degrade)
	}
	return out;
};

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
		stateCache.set(repoRoot, { arch, project: createTsProject(repoRoot), repoFiles: listRepoFiles(repoRoot, DEFAULT_EXTS, DEFAULT_IGNORE_DIRS), dedupe: new Map() });
	}
	return stateCache.get(repoRoot);
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
							ignoreDirs: { type: "array" },
							ignores: { type: "array" },
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
		// hardcoded defaults + the ESLint rule options. The architecture yaml must
		// not carry it — it describes the code, not how to scan it.
		const ignoreDirs = [...new Set([...DEFAULT_IGNORE_DIRS, ...(opts.ignoreDirs ?? [])])];
		const ignoreGlobs = opts.ignores ?? [];
		if (ignoreDirs.some((d) => rel === d || rel.startsWith(`${d}/`))) return {};
		if (ignoreGlobs.some((g) => minimatch(rel, g))) return {};
		if (opts.include?.length && !opts.include.some((g) => minimatch(rel, g))) return {};
		const findings = checkFile(filePath, arch, project, repoFiles, dedupe);
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
		plugins: plugins ?? { "md-code": plugin },
		// The rule accepts either a config path (string) or the architecture
		// object itself; its create() resolves both.
		rules: { "md-code/follow-architecture": ["error", architecture.raw ?? architecture] },
	});
	return list;
};

module.exports = { flatConfig, plugin };

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { minimatch } = require("minimatch");
const { loadArchitecture } = require("./main");
const { checkFile } = require("./utils");
const { createTsProject } = require("./ast");
const pkg = require("./package.json");

const findRepoRoot = (from) => {
	let dir = from;
	while (true) {
		for (const name of ["architecture.json", "architecture.config.js"]) {
			if (fs.existsSync(path.join(dir, name))) return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) return process.cwd();
		dir = parent;
	}
};

const rule = {
	meta: {
		type: "problem",
		docs: { description: "Enforces the vertical-slice architecture defined in architecture.json" },
		schema: [
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
	create(context) {
		const opts = context.options[0] ?? {};
		const filePath = context.filename ?? context.getFilename();
		const repoRoot = findRepoRoot(path.dirname(filePath));
		const rel = path.relative(repoRoot, filePath).split(path.sep).join("/");
		const arch = loadArchitecture(opts.config ?? path.join(repoRoot, "architecture.json"));
		const ignoreDirs = [...new Set(["node_modules", ".git", "dist", "build", ...(arch.ignoreDirs ?? []), ...(opts.ignoreDirs ?? [])])];
		const ignoreGlobs = [...(arch.ignores ?? []), ...(opts.ignores ?? [])];
		if (ignoreDirs.some((d) => rel === d || rel.startsWith(`${d}/`))) return {};
		if (ignoreGlobs.some((g) => minimatch(rel, g))) return {};
		if (opts.include?.length && !opts.include.some((g) => minimatch(rel, g))) return {};
		const project = createTsProject();
		const findings = checkFile(filePath, fs.readFileSync(filePath, "utf8"), repoRoot, arch, project);
		for (const f of findings) {
			context.report({
				message: f.message,
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
		files: files ?? architecture.files,
		languageOptions: {
			parser: parser ?? require("@typescript-eslint/parser"),
			parserOptions: { ecmaVersion: "latest", sourceType: "module" },
		},
		linterOptions: { reportUnusedDisableDirectives: "off" },
		plugins: plugins ?? { "md-code": plugin },
		rules: { "md-code/follow-architecture": ["error", architecture.raw ?? architecture] },
	});
	return list;
};

const parseArgs = (argv) => {
	const args = { config: null, ignore: [], out: null, check: false, help: false, cwd: null };
	const rest = [];
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		if (a === "--config" || a === "-c") args.config = argv[++i];
		else if (a === "--ignore") args.ignore.push(argv[++i]);
		else if (a === "--out" || a === "-o") args.out = argv[++i];
		else if (a === "--check") args.check = true;
		else if (a === "--help" || a === "-h") args.help = true;
		else rest.push(a);
	}
	if (rest.length) args.cwd = rest[0];
	return args;
};

module.exports = { flatConfig, parseArgs, plugin };

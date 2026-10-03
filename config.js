"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildArchitecture } = require("./main");
const { checkFile } = require("./utils");
const { createTsProject } = require("./ast");

const findRepoRoot = (from) => {
	let dir = from;
	while (true) {
		for (const name of ["architecture.json", "architecture.config.js"]) {
			if (fs.existsSync(path.join(dir, name))) return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) return from;
		dir = parent;
	}
};

const rule = {
	meta: {
		name: "md-code/follow-architecture",
		doc: "Enforces the vertical-slice architecture defined in architecture.json",
		type: "problem",
		schema: [{ type: "object" }],
	},
	create(context) {
		const arch = buildArchitecture(context.options[0] ?? {});
		const filePath = context.filename ?? context.getFilename();
		const repoRoot = findRepoRoot(path.dirname(filePath));
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
	meta: { name: "eslint-plugin-md-code", version: "0.1.0" },
	rules: { "follow-architecture": rule },
};

const flatConfig = (architecture, opts = {}) => {
	const { parser, files, ignores } = opts;
	const list = [];
	if (ignores?.length) list.push({ ignores });
	list.push({
		files: files ?? architecture.files,
		languageOptions: {
			parser: parser ?? require("@typescript-eslint/parser"),
			parserOptions: { ecmaVersion: "latest", sourceType: "module" },
		},
		linterOptions: { reportUnusedDisableDirectives: "off" },
		plugins: { "md-code": plugin },
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

module.exports = { flatConfig, parseArgs };

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pipe, map, filter, flatMap } = require("remeda");
const { minimatch } = require("minimatch");
const { buildTree, matchers } = require("./entities/nodes");
const { normalizeInvariant } = require("./entities/invariants");
const { normalizeAliases } = require("./entities/aliases");
const { checkFile } = require("./utils");
const { renderReport } = require("./report");
const { createTsProject, toRel } = require("./ast");

const buildArchitecture = (raw) => {
	if (!raw || typeof raw !== "object") throw new Error("architecture: expected an object");
	if (!raw.nodes || !Object.keys(raw.nodes).length) throw new Error("architecture.nodes: must be a non-empty object");
	const tree = buildTree(raw.nodes);
	const invariants = pipe(raw.invariants ?? [], map((i) => normalizeInvariant(i, tree.slugs)));
	const ids = invariants.map((i) => i.id);
	if (new Set(ids).size !== ids.length) throw new Error("architecture.invariants: ids must be unique");
	return {
		nodes: tree,
		invariants,
		aliases: normalizeAliases(raw.aliases ?? {}),
		files: raw.files ?? ["**/*.ts", "**/*.tsx"],
		ignores: raw.ignores ?? [],
		exts: raw.exts ?? [".ts", ".tsx", ".js", ".jsx"],
		raw,
	};
};

const loadArchitecture = (config) => {
	if (typeof config === "string") {
		const p = path.resolve(process.cwd(), config);
		const text = fs.readFileSync(p, "utf8");
		if (p.endsWith(".js") || p.endsWith(".cjs")) return buildArchitecture(require(p));
		return buildArchitecture(JSON.parse(text));
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
	const { parseArgs } = require("./config");
	const args = parseArgs(argv);
	if (args.help) {
		console.log("usage: follow-architecture [--config <path>] [--ignore <glob>]... [--out <path>] [--check]");
		return 0;
	}
	const repoRoot = path.resolve(args.cwd ?? process.cwd());
	const arch = loadArchitecture(args.config);
	const project = createTsProject();
	const shouldCheck = matchers(arch);
	const files = pipe(
		collectFiles(repoRoot, { exts: arch.exts, ignoreDirs: ["node_modules", ".git", "dist", "build", "_medplum"], ignoreGlobs: [...(arch.ignores ?? []), ...(args.ignore ?? [])] }),
		map((abs) => ({ abs, rel: toRel(repoRoot, abs) })),
		filter((f) => shouldCheck(f.rel)),
	);
	const byDir = new Map();
	for (const f of files) {
		const dir = path.posix.dirname(f.rel);
		if (!byDir.has(dir)) byDir.set(dir, []);
		byDir.get(dir).push(f.rel);
	}
	const findings = pipe(files, flatMap((f) => checkFile(f.abs, fs.readFileSync(f.abs, "utf8"), repoRoot, arch, project, byDir.get(path.posix.dirname(f.rel)) ?? [])));
	const text = renderReport(findings, repoRoot);
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

#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pipe, reduce, filter, map, first } = require("remeda");
const { normalizeArchitecture } = require("../config");
const { checkFile, toRel, nodeMatches, norm } = require("../checks");
const { walk } = require("./walk");
const { renderReport } = require("../report");

const fail = (message) => {
	// eslint-disable-next-line no-console
	console.error(`[follow-architecture] ${message}`);
	process.exit(1);
};

const log = (message) => {
	// eslint-disable-next-line no-console
	console.log(message);
};

const splitList = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);

const VALUE_FLAGS = {
	"--config": (v, cfg) => {
		cfg.config = v;
	},
	"--out": (v, cfg) => {
		cfg.out = v;
	},
	"--repo-root": (v, cfg) => {
		cfg.repoRoot = v;
	},
	"--ext": (v, cfg) => {
		cfg.ext = splitList(v);
	},
	"--ignore-dir": (v, cfg) => {
		cfg.ignoreDir = splitList(v);
	},
	"--ignore": (v, cfg) => {
		cfg.ignore = splitList(v);
	},
};

const BOOL_FLAGS = {
	"--check": (cfg) => {
		cfg.check = true;
	},
	"--verbose": (cfg) => {
		cfg.verbose = true;
	},
};

const HELP_TEXT = [
	"Usage: md-code-follow-architecture [--config architecture.json] [--out report.md] [--check] [--verbose]",
	"       [--ext .ts,.tsx] [--ignore-dir node_modules,.git] [--ignore \"**/*.d.ts\"]",
	"Validates the code against the declarative architecture skeleton (nodes + invariants).",
];

const parseArgs = (argv) => {
	const tokens = [];
	for (let i = 0; i < argv.length; i += 1) {
		if (VALUE_FLAGS[argv[i]]) {
			if (!argv[i + 1]) fail(`${argv[i]} requires a value`);
			tokens.push([argv[i], argv[i + 1]]);
			i += 1;
		} else {
			tokens.push([argv[i]]);
		}
	}
	return pipe(
		tokens,
		reduce(
			(cfg, [flag, value]) => {
				if (VALUE_FLAGS[flag]) {
					VALUE_FLAGS[flag](value, cfg);
					return cfg;
				}
				if (BOOL_FLAGS[flag]) {
					BOOL_FLAGS[flag](cfg);
					return cfg;
				}
				if (flag === "--help" || flag === "-h") {
					HELP_TEXT.forEach(log);
					process.exit(0);
				}
				fail(`unknown argument: ${flag} (see --help)`);
				return cfg;
			},
			{ config: null, out: null, repoRoot: null, check: false, verbose: false, ext: [".ts", ".tsx"], ignoreDir: ["node_modules", ".git"], ignore: ["**/*.d.ts"] },
		),
	);
};

const findRepoRoot = (start) => {
	let dir = start;
	for (;;) {
		if (fs.existsSync(path.join(dir, "package.json")) || fs.existsSync(path.join(dir, ".git"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return start;
		dir = parent;
	}
};

const loadArchitecture = (args, repoRoot) => {
	if (args.config) {
		const p = path.resolve(repoRoot, args.config);
		if (!fs.existsSync(p)) fail(`config not found: ${p}`);
		return { architecture: normalizeArchitecture(JSON.parse(fs.readFileSync(p, "utf8"))), source: p };
	}
	const found = pipe(
		["architecture.json", "architecture.config.json"],
		map((name) => path.join(repoRoot, name)),
		filter((p) => fs.existsSync(p)),
		first,
	);
	if (!found) fail("no architecture found — pass --config architecture.json (or create architecture.json in the repo root)");
	return { architecture: normalizeArchitecture(JSON.parse(fs.readFileSync(found, "utf8"))), source: found };
};

const collectFindings = (repoRoot, architecture, args) => {
	const files = [];
	walk(repoRoot, repoRoot, { extensions: args.ext, ignoreDirs: args.ignoreDir, ignoreFiles: args.ignore }, (file) => {
		const rel = toRel(repoRoot, file);
		const matchesNode = architecture.nodes.some((n) => nodeMatches(n, rel));
		const matchesInvariant = architecture.invariants.some((inv) => inv.whenCompiled.re.test(rel));
		if (matchesNode || matchesInvariant) files.push(file);
	});
	return pipe(files, (fs2) => fs2.flatMap((file) => checkFile(file, repoRoot, architecture)));
};

const main = () => {
	const args = parseArgs(process.argv.slice(2));
	const repoRoot = args.repoRoot ? path.resolve(process.cwd(), args.repoRoot) : findRepoRoot(process.cwd());
	const { architecture, source } = loadArchitecture(args, repoRoot);

	if (args.verbose) {
		log(`[follow-architecture] architecture from ${source}`);
		log(`[follow-architecture] repo root: ${repoRoot}`);
	}

	const findings = collectFindings(repoRoot, architecture, args);
	const outPath = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, "reports", "follow-architecture.md");
	const report = renderReport(repoRoot, architecture.nodes, findings);

	if (args.check) {
		if (findings.length > 0) {
			// eslint-disable-next-line no-console
			console.error(`[follow-architecture] ${findings.length} violation(s) — see report`);
			process.exit(1);
		}
		log("[follow-architecture] OK — no architecture violations");
		return;
	}

	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, report, "utf8");
	log(`[follow-architecture] ${findings.length} violation(s) → ${norm(outPath)}`);
};

main();
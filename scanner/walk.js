"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { minimatch } = require("minimatch");
const { filter } = require("remeda");

const walk = (dir, repoRoot, opts, onFile) => {
	const ignoreDirs = new Set(opts.ignoreDirs);
	const extensions = new Set(opts.extensions);
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	filter(entries, (e) => e.isDirectory() && !ignoreDirs.has(e.name)).forEach((e) => walk(path.join(dir, e.name), repoRoot, opts, onFile));
	filter(entries, (e) => e.isFile() && extensions.has(path.extname(e.name))).forEach((e) => {
		const full = path.join(dir, e.name);
		const rel = String(path.relative(repoRoot, full)).replace(/\\/g, "/");
		if (opts.ignoreFiles.some((g) => minimatch(rel, g))) return;
		onFile(full);
	});
};

module.exports = { walk };

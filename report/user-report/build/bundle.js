"use strict";

// The React overview bundle.
//
// `src/` is plain JSX with no build step committed to the repository: this
// module compiles it with esbuild on first use and keeps the result. The
// compiled text is cached in `os.tmpdir()`, keyed by the mtime+size of every
// source file, so a repeated `--overview` in the same machine pays the build
// once, and a changed source rebuilds.
//
// It is required lazily from `./html/shell.js`: loading the plugin (as an
// ESLint rule) must not pull in esbuild or React.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SRC_DIR = path.join(__dirname, "..", "src");
const ENTRY = path.join(SRC_DIR, "main.jsx");
const CACHE_DIR = path.join(os.tmpdir(), "follow-architecture-overview");
const CACHE_FILE = path.join(CACHE_DIR, "bundle.js");
const STAMP_FILE = path.join(CACHE_DIR, "stamp.json");

// Every source file that ends up in the bundle, with the stat that tells
// whether it changed. Sorted, so the stamp is stable across runs.
const listSources = (dir) => {
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...listSources(abs));
		else if (/\.(jsx?|mjs)$/.test(entry.name)) out.push(abs);
	}
	return out.sort();
};

const stampOf = (files) =>
	files.map((file) => {
		const stat = fs.statSync(file);
		return `${path.relative(SRC_DIR, file)}:${stat.size}:${stat.mtimeMs}`;
	});

const readCached = (stamp) => {
	try {
		const cached = JSON.parse(fs.readFileSync(STAMP_FILE, "utf8"));
		if (JSON.stringify(cached) !== JSON.stringify(stamp)) return null;
		return fs.readFileSync(CACHE_FILE, "utf8");
	} catch {
		return null;
	}
};

const writeCached = (bundle, stamp) => {
	try {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
		fs.writeFileSync(CACHE_FILE, bundle, "utf8");
		fs.writeFileSync(STAMP_FILE, JSON.stringify(stamp), "utf8");
	} catch {
		// A read-only tmpdir is not a reason to fail the report: the bundle is
		// still in hand, it just is not cached.
	}
};

const compile = () => {
	const esbuild = require("esbuild");
	const result = esbuild.buildSync({
		entryPoints: [ENTRY],
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		target: ["es2020"],
		jsx: "automatic",
		loader: { ".js": "jsx", ".jsx": "jsx" },
		define: { "process.env.NODE_ENV": '"production"' },
		minify: true,
		logLevel: "silent",
	});
	return result.outputFiles[0].text;
};

let memoryCache = null;

const getBundle = () => {
	if (memoryCache) return memoryCache;

	const files = listSources(SRC_DIR);
	const stamp = stampOf(files);

	const cached = readCached(stamp);
	if (cached) {
		memoryCache = cached;
		return cached;
	}

	const bundle = compile();
	writeCached(bundle, stamp);
	memoryCache = bundle;
	return bundle;
};

module.exports = { getBundle };

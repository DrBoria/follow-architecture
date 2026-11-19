"use strict";

// The React overview bundle.
//
// `src/` is plain TSX with no build step committed to the repository: this
// module compiles it with esbuild on first use and keeps the result. The
// compiled text is cached in `os.tmpdir()`, keyed by the mtime+size of every
// source file, so a repeated `--overview` in the same machine pays the build
// once, and a changed source rebuilds.
//
// It is required lazily from `./html/shell.ts`: loading the plugin (as an
// ESLint rule) must not pull in esbuild or React.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildSync } from "esbuild";

// The React source lives at report/user-report/src. When this module runs from
// the compiled dist/ tree, __dirname is dist/report/user-report/build (four
// levels below the package root); from source it is report/user-report/build
// (three levels). Try both so the bundle works in either layout.
const candidateRoots = [path.resolve(__dirname, "..", "..", "..", ".."), path.resolve(__dirname, "..", "..", "..")];
const PKG_ROOT = candidateRoots.find((r) => fs.existsSync(path.join(r, "report", "user-report", "src"))) ?? candidateRoots[0];
const SRC_DIR = path.join(PKG_ROOT, "report", "user-report", "src");
const ENTRY = path.join(SRC_DIR, "main.tsx");
const CACHE_DIR = path.join(os.tmpdir(), "follow-architecture-overview");
const CACHE_FILE = path.join(CACHE_DIR, "bundle.js");
const STAMP_FILE = path.join(CACHE_DIR, "stamp.json");

// Every source file that ends up in the bundle, with the stat that tells
// whether it changed. Sorted, so the stamp is stable across runs.
// The bundle is not only `src/`: the operator vocabulary it prints comes from
// the engine (`entities/operators.ts`), and the words and condition lines come
// from `report/errorTypes/vocabulary/*` and `report/user-report/shared/describe`
// — a cached bundle must be rebuilt when THOSE files change too.
const SHARED_SOURCES = [
	path.join(PKG_ROOT, "entities", "operators.ts"),
	path.join(PKG_ROOT, "report", "user-report", "shared", "describe.ts"),
	path.join(PKG_ROOT, "report", "errorTypes", "vocabulary", "ids.ts"),
	path.join(PKG_ROOT, "report", "errorTypes", "vocabulary", "verbs.ts"),
].filter((file) => fs.existsSync(file));

const listSources = (dir: string): string[] => {
	const out: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...listSources(abs));
		else if (/\.(jsx?|tsx?|mjs)$/.test(entry.name)) out.push(abs);
	}
	return out.sort();
};

const stampOf = (files: readonly string[]): string[] =>
	files.map((file) => {
		const stat = fs.statSync(file);
		return `${file}:${stat.size}:${stat.mtimeMs}`;
	});

const readCached = (stamp: readonly string[]): string | null => {
	try {
		const cached = JSON.parse(fs.readFileSync(STAMP_FILE, "utf8"));
		if (JSON.stringify(cached) !== JSON.stringify(stamp)) return null;
		return fs.readFileSync(CACHE_FILE, "utf8");
	} catch {
		return null;
	}
};

const writeCached = (bundle: string, stamp: readonly string[]): void => {
	try {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
		fs.writeFileSync(CACHE_FILE, bundle, "utf8");
		fs.writeFileSync(STAMP_FILE, JSON.stringify(stamp), "utf8");
	} catch {
		// A read-only tmpdir is not a reason to fail the report: the bundle is
		// still in hand, it just is not cached.
	}
};

const compile = (): string => {
	const result = buildSync({
		entryPoints: [ENTRY],
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		target: ["es2020"],
		jsx: "automatic",
		loader: { ".js": "jsx", ".jsx": "jsx", ".ts": "ts", ".tsx": "tsx" },
		define: { "process.env.NODE_ENV": '"production"' },
		minify: true,
		logLevel: "silent",
	});
	return result.outputFiles[0].text;
};

let memoryCache: string | null = null;

// The bundle for this source stamp: the disk cache when it matches, a fresh
// compile otherwise (remembered for the next caller).
const bundleFor = (stamp: readonly string[]): string => {
	const cached = readCached(stamp);
	if (cached) return cached;
	const bundle = compile();
	writeCached(bundle, stamp);
	return bundle;
};

const getBundle = (): string => {
	if (memoryCache) return memoryCache;
	const stamp = stampOf([...listSources(SRC_DIR), ...SHARED_SOURCES]);
	memoryCache = bundleFor(stamp);
	return memoryCache;
};

export { getBundle };

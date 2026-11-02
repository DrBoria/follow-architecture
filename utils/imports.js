"use strict";

// Import resolution — the one mechanism by which any entity points at another
// file. A reference is either an alias (see the `aliases` entity) or a relative
// module path.
//
// The lookup itself is TypeScript's (`resolveModuleName` with the aliases
// injected as `paths`), so the engine never keeps its own list of extensions or
// index files — the compiler that parses the code decides where an import
// points. The files it may find are the ones the tool actually scans
// (`repoFiles`) plus whatever the project has loaded, so a resolution never
// escapes the architecture's own file set.

const path = require("node:path");
const { ts } = require("ts-morph");

const norm = (p) => String(p).replace(/\\/g, "/");

const toRel = (repoRoot, filePath) => norm(path.relative(repoRoot, filePath));

// The YAML `aliases` map says `alias → folder`, which is exactly what
// TypeScript's `paths` expresses in two entries: the alias itself and its
// subpaths (`alias/x` → `folder/x`).
const pathsOf = (aliases) => {
	const paths = {};
	for (const [alias, dir] of Object.entries(aliases ?? {})) {
		paths[alias] = [dir];
		paths[`${alias}/*`] = [`${dir}/*`];
	}

	return paths;
};

// The folders the scanned files live in, derived once per file list: the
// resolver asks "does this folder exist" far more often than it asks anything
// else, and a folder exists here when the architecture has a file in it.
const foldersCache = new WeakMap();
const foldersOf = (repoFiles) => {
	let folders = foldersCache.get(repoFiles);
	if (!folders) {
		folders = new Set([""]);
		for (const file of repoFiles ?? []) {
			const parts = file.split("/");
			for (let i = 1; i < parts.length; i += 1) folders.add(parts.slice(0, i).join("/"));
		}
		foldersCache.set(repoFiles, folders);
	}

	return folders;
};

// Where the resolver may look: the scanned file list, plus the project's own
// file system (a real project reads the disk, a test project reads memory).
const resolutionHost = (project, repoRoot, repoFiles) => {
	const files = project.getFileSystem();
	const scanned = new Set(repoFiles ?? []);
	const folders = foldersOf(repoFiles);

	return {
		fileExists: (p) => scanned.has(toRel(repoRoot, p)) || files.fileExistsSync(p),
		readFile: (p) => {
			try {
				return files.readFileSync(p);
			} catch {
				return undefined;
			}
		},
		directoryExists: (p) => folders.has(toRel(repoRoot, p)) || files.directoryExistsSync(p),
		// `node_modules` walks are not a relation the architecture can describe:
		// anything resolved outside the scanned set is dropped below anyway.
		getDirectories: () => [],
		realpath: (p) => p,
		useCaseSensitiveFileNames: () => true,
	};
};

// Resolve an import source (relative path or alias) to a repo-relative file.
// A resolution that lands outside the scanned set (a `.d.ts`, a file in an
// ignored folder) is not a relation the architecture can talk about → null.
const resolveImport = (sf, source, repoRoot, aliases, repoFiles) => {
	if (!source) return null;
	const { resolvedModule } = ts.resolveModuleName(
		source,
		sf.getFilePath(),
		{ baseUrl: repoRoot, paths: pathsOf(aliases), moduleResolution: ts.ModuleResolutionKind.Node10, allowJs: true },
		resolutionHost(sf.getProject(), repoRoot, repoFiles),
	);
	if (!resolvedModule) return null;
	const rel = toRel(repoRoot, resolvedModule.resolvedFileName);
	if (repoFiles && !repoFiles.includes(rel)) return null;

	return rel;
};

module.exports = { resolveImport, toRel };

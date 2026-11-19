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

import * as path from "node:path";
import { ts, type Project, type SourceFile } from "ts-morph";
import { notice } from "../report/notices";
import { resolveReference } from "./resolve";

// The `aliases` map of the architecture: alias → folder or entry file.
type Aliases = Record<string, string>;

const norm = (p: string): string => String(p).replace(/\\/g, "/");

const toRel = (repoRoot: string, filePath: string): string => norm(path.relative(repoRoot, filePath));

// The YAML `aliases` map says `alias → folder or entry file`, which is exactly
// what TypeScript's `paths` expresses in two entries: the alias itself and its
// subpaths (`alias/x` → `folder/x`).
//
// An alias that names a FILE (`"@md/styles": packages/styles/index.ts`) is the
// common case, and its subpaths go through that file's DIRECTORY: `index.ts/*`
// names a folder that cannot exist, so `@md/styles/themes/viking` never resolved
// and the checker failed on it later.
const ENTRY_FILE = /\.[cm]?[jt]sx?$/;
const pathsOf = (aliases?: Aliases): Record<string, string[]> => {
	const paths: Record<string, string[]> = {};
	for (const [alias, target] of Object.entries(aliases ?? {})) {
		paths[alias] = [target];
		const base = ENTRY_FILE.test(target) ? target.replace(/\/[^/]*$/, "") : target;
		paths[`${alias}/*`] = [`${base}/*`];
	}

	return paths;
};

// The folders the scanned files live in, derived once per file list: the
// resolver asks "does this folder exist" far more often than it asks anything
// else, and a folder exists here when the architecture has a file in it.
const foldersCache = new WeakMap<readonly string[], Set<string>>();
const foldersOf = (repoFiles: readonly string[]): Set<string> => {
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
const resolutionHost = (project: Project, repoRoot: string, repoFiles: readonly string[]): ts.ModuleResolutionHost => {
	const files = project.getFileSystem();
	const scanned = new Set(repoFiles ?? []);
	const folders = foldersOf(repoFiles ?? []);

	return {
		fileExists: (p: string): boolean => scanned.has(toRel(repoRoot, p)) || files.fileExistsSync(p),
		readFile: (p: string): string | undefined => {
			try {
				return files.readFileSync(p);
			} catch (error) {
				const e: { code?: string; message?: string } = error;
				// The resolver PROBES paths, so a missing file is an answer, not a
				// failure. Any other reason is reported: that file exists and is
				// unreadable, which changes what the analysis knows.
				if (e.code !== "ENOENT") notice(`the file ${p} could not be read`, e.message ?? String(e));

				return undefined;
			}
		},
		directoryExists: (p: string): boolean => folders.has(toRel(repoRoot, p)) || files.directoryExistsSync(p),
		// `node_modules` walks are not a relation the architecture can describe:
		// anything resolved outside the scanned set is dropped below anyway.
		getDirectories: (): string[] => [],
		realpath: (p: string): string => p,
		useCaseSensitiveFileNames: (): boolean => true,
	};
};

// Everything the resolver needs about one run: the repo root, the alias map and
// the scanned file list.
interface ResolveContext {
	repoRoot: string;
	aliases?: Aliases;
	repoFiles?: readonly string[];
}

// Resolve an import source (relative path or alias) to a repo-relative file.
// A resolution that lands outside the scanned set (a `.d.ts`, a file in an
// ignored folder) is not a relation the architecture can talk about → null.
// The walk (reference → target → answer) is the shared `resolveReference`; the
// compiler lookup and the scanned-set verdict are this reader's own.
const resolveImport = (sf: SourceFile, source: string, { repoRoot, aliases, repoFiles }: ResolveContext): string | null =>
	resolveReference(
		source || null,
		(specifier) =>
			ts.resolveModuleName(
				specifier,
				sf.getFilePath(),
				{ baseUrl: repoRoot, paths: pathsOf(aliases), moduleResolution: ts.ModuleResolutionKind.Node10, allowJs: true },
				resolutionHost(sf.getProject(), repoRoot, repoFiles ?? []),
			).resolvedModule,
		(resolved) => {
			const rel = toRel(repoRoot, resolved.resolvedFileName);
			if (repoFiles && !repoFiles.includes(rel)) return null;

			return rel;
		},
	);

export { resolveImport, toRel, pathsOf };
export type { ResolveContext };

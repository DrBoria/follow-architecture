"use strict";

// Import / reference resolution — the one mechanism by which any entity
// (nodes, invariants, codeRoles, fileSpecs) points at another. A reference is
// either an alias (see the `aliases` entity) or a relative module path, and is
// resolved against the repo root. Keeping it here means every entity resolves
// references identically instead of each re-implementing the candidate walk.

const fs = require("node:fs");
const path = require("node:path");
const { pipe, filter, map } = require("remeda");

const norm = (p) => String(p).replace(/\\/g, "/");

const toRel = (repoRoot, filePath) => norm(path.relative(repoRoot, filePath));

// Parse one import declaration into { source, named, defaultName,
// namespaceName, typeOnly }.
const importEntry = (imp) => {
	const source = imp.getModuleSpecifierValue();
	const entry = { source, named: [], defaultName: null, namespaceName: null, typeOnly: imp.isTypeOnly() };
	for (const el of imp.getNamedImports()) entry.named.push(el.getName());
	const def = imp.getDefaultImport();
	if (def) entry.defaultName = def.getText();
	const ns = imp.getNamespaceImport();
	if (ns) entry.namespaceName = ns.getText();
	return entry;
};

// Resolve an import source (relative path or alias) to a repo-relative file,
// trying the usual TS/JS extensions and index files. Returns null when the
// target does not exist.
const resolveImport = (sf, source, repoRoot, aliases, repoFiles) => {
	// When the caller provides the repo file list (it always has one — the
	// pipeline scans it), resolve against that instead of the filesystem so
	// resolution stays consistent with what the plugin actually sees.
	const tryFile = (rel) => {
		if (!rel) return null;
		if (repoFiles ? repoFiles.includes(rel) : fs.existsSync(path.resolve(repoRoot, rel)) && fs.statSync(path.resolve(repoRoot, rel)).isFile()) return rel;
		return null;
	};
	const candidates = (rel) => [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}.js`, `${rel}.jsx`, `${rel}/index.ts`, `${rel}/index.tsx`, `${rel}/index.js`];
	const resolveBase = (base) => pipe(candidates(base), map(tryFile), filter(Boolean), (r) => (r.length ? r[0] : null));
	const alias = Object.keys(aliases).find((a) => source === a || source.startsWith(`${a}/`));
	if (alias) return resolveBase(`${aliases[alias]}/${source.slice(alias.length).replace(/^\//, "")}`);
	return resolveBase(toRel(repoRoot, path.resolve(path.dirname(sf.getFilePath()), source)));
};

// The `*.v` vertical slice a path belongs to, if any.
const sliceOf = (relPath) => {
	const m = relPath.replace(/\\/g, "/").match(/\/([^/]+)\.v(\/|$)/);
	return m ? m[1] : null;
};

module.exports = { importEntry, resolveImport, sliceOf, toRel };

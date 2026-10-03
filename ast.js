"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Project, ts } = require("ts-morph");
const { pipe, filter, map } = require("remeda");

const norm = (p) => String(p).replace(/\\/g, "/");

const toRel = (repoRoot, filePath) => norm(path.relative(repoRoot, filePath));

const createTsProject = () =>
	new Project({
		useInMemoryFileSystem: true,
		skipAddingFilesFromTsConfig: true,
		compilerOptions: {
			allowJs: true,
			jsx: ts.JsxEmit.Preserve,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ESNext,
			esModuleInterop: true,
			skipLibCheck: true,
		},
	});

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

const resolveImport = (sf, source, repoRoot, aliases) => {
	const tryFile = (rel) => {
		if (!rel) return null;
		const abs = path.resolve(repoRoot, rel);
		if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return rel;
		return null;
	};
	const candidates = (rel) => [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}.js`, `${rel}.jsx`, `${rel}/index.ts`, `${rel}/index.tsx`, `${rel}/index.js`];
	const resolveBase = (base) => pipe(candidates(base), map(tryFile), filter(Boolean), (r) => (r.length ? r[0] : null));
	const alias = Object.keys(aliases).find((a) => source === a || source.startsWith(`${a}/`));
	if (alias) return resolveBase(`${aliases[alias]}/${source.slice(alias.length).replace(/^\//, "")}`);
	return resolveBase(toRel(repoRoot, path.resolve(path.dirname(sf.getFilePath()), source)));
};

const sliceOf = (relPath) => {
	const m = relPath.replace(/\\/g, "/").match(/\/([^/]+)\.v(\/|$)/);
	return m ? m[1] : null;
};

const enclosingFunctionName = (sf, line) => {
	let node = sf;
	try {
		const pos = sf.getPositionAtLineAndCharacter(line, 0);
		node = sf.getDescendantAtPosition(pos, (n) => n.getStart() <= pos && n.getEnd() >= pos);
	} catch {
		return null;
	}
	let cur = node;
	while (cur) {
		if (cur.isFunctionDeclaration() && cur.getName()) return cur.getName();
		if (cur.isMethodDeclaration()) {
			const n = cur.getName();
			if (n) return n;
		}
		if (cur.isFunctionExpression() || cur.isArrowFunction()) {
			const p = cur.getParent();
			if (p && (p.isVariableDeclaration() || p.isPropertyAssignment() || p.isPropertyDeclaration() || p.isMethodDeclaration())) {
				const n = p.getName();
				if (n) return n;
			}
		}
		cur = cur.getParent();
	}
	return null;
};

const buildContext = (project, filePath, text, repoRoot, aliases, siblings = []) => {
	const sf = project.createSourceFile(filePath, text, { overwrite: true });
	const relPath = toRel(repoRoot, filePath);
	const imports = pipe(
		sf.getImportDeclarations(),
		map((imp) => {
			const entry = importEntry(imp);
			return { ...entry, resolved: resolveImport(sf, entry.source, repoRoot, aliases) };
		}),
	);
	return {
		file: sf,
		path: relPath,
		basename: path.posix.basename(relPath),
		dir: path.posix.dirname(relPath),
		captures: {},
		imports,
		slice: sliceOf(relPath),
		siblings,
		enclosingFunctionName: (line) => enclosingFunctionName(sf, line),
	};
};

module.exports = { createTsProject, buildContext, toRel };

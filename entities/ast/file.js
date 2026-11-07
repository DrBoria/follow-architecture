"use strict";

// A source file: how it is loaded, and everything that is true about it —
// its imports, its exports, the files around it, every meaningful node below
// it and the chains that reach state. One module for the whole file entity.

const fs = require("node:fs");
const path = require("node:path");
const { Project, ts } = require("ts-morph");

const { SK, startLine, linesOf, descriptor, descendantsOf, nodeText } = require("./tree");
const { readsFact, enclosingPiece } = require("./properties");
const { resolveImport, pathsOf } = require("../../utils/imports");
const { heritageOf } = require("./heritage");
const { placeOf } = require("../location");

// ── Loading ─────────────────────────────────────────────────────────────────

// One Project per run. Files are added explicitly (never from tsconfig), so the
// engine is independent of the repo's build config; aliases come only from the
// YAML. `skipAddingFilesFromTsConfig` keeps the project empty until we add a file.
const createTsProject = ({ repoRoot, aliases } = {}) =>
	new Project({
		compilerOptions: {
			allowJs: true,
			jsx: ts.JsxEmit.Preserve,
			esModuleInterop: true,
			// The SAME aliases the facts resolve imports with, handed to the compiler
			// that resolves them (`pathsOf`, in `utils/imports` — one translation). No
			// tsconfig is read: the YAML is the only description of where a name
			// points, so a project fact and an import fact cannot disagree.
			...(repoRoot ? { baseUrl: repoRoot, paths: pathsOf(aliases) } : {}),
		},
		skipAddingFilesFromTsConfig: true,
		useInMemoryFileSystem: false,
	});

// A single-file component (.vue / .svelte) holds its TypeScript inside
// `<script>`. Only that block is parsed; every other line is blanked so the
// line numbers a finding reports still match the file the editor shows.
const extractScript = (text) => {
	const lines = String(text).split("\n");
	const kept = lines.map((line) => (/^\s*$/.test(line) ? "" : ""));
	let inside = false;
	let opened = false;
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		if (!inside && /<script\b[^>]*>/.test(line)) {
			inside = true;
			opened = true;
			const after = line.slice(line.indexOf(">") + 1);
			if (/<\/script>/.test(after)) {
				inside = false;
				kept[i] = after.replace(/<\/script>[\s\S]*$/, "");
			} else kept[i] = after;
			continue;
		}
		if (inside) {
			if (/<\/script>/.test(line)) {
				kept[i] = line.slice(0, line.indexOf("</script>"));
				inside = false;
			} else kept[i] = line;
		}
	}
	return { text: kept.join("\n"), opened };
};

const SFC_RE = /\.(vue|svelte)$/i;

const sourceTextFor = (abs, text) => (SFC_RE.test(abs) ? extractScript(text).text : text);

const loadSourceFile = (project, abs, text) => project.createSourceFile(abs, sourceTextFor(abs, text), { overwrite: true });

// A map of every imported name (default / named / namespace) to the repo-
// relative file the import resolves to. Lets a call (`f(...)`) or an
// initializer (`x = f(...)`) be tied to the module it came from.
const importNameModules = (sf, repoRoot, aliases, repoFiles) => {
	const map = new Map();
	for (const imp of sf.getImportDeclarations()) {
		const resolved = resolveImport(sf, imp.getModuleSpecifierValue(), repoRoot, aliases, repoFiles);
		const def = imp.getDefaultImport();
		if (def) map.set(def.getText(), resolved);
		// Key by the LOCAL binding: for `import { b as c }` that is `c`, not `b`
		// — a call site can only write the local name.
		for (const el of imp.getNamedImports()) map.set(el.getAliasNode()?.getText() ?? el.getName(), resolved);
		const ns = imp.getNamespaceImport();
		if (ns) map.set(ns.getText(), resolved);
	}

	return map;
};

// ── Which file declares this value ──────────────────────────────────────────
// The type checker, through imports, aliases and call results. This is what lets
// a rule say "this writes into a store of that feature" without naming a type or
// a folder.

// A path the architecture can compare. The checker answers with the path it read;
// `/var/home` and `/home` name the same folder, so an absolute path goes through
// `realpath` on both sides before it is made repo-relative.
const repoRelative = (file, repoRoot) => {
	const abs = file ?? null;
	if (!abs) return abs;
	if (!path.isAbsolute(abs)) return String(abs).replace(/\\/g, "/");
	// An in-memory file has no path on disk, so `realpath` is tried first and the
	// plain resolution is the fallback — either way both sides are made absolute
	// before they are compared.
	const real = (p) => {
		try {
			return fs.realpathSync(p);
		} catch {
			return path.resolve(p);
		}
	};

	return path.relative(real(repoRoot ?? "."), real(abs)).replace(/\\/g, "/");
};

// The file that declares a TYPE NODE, followed through `X = <Something<typeof Y>>`
// so a store's model is found through its alias. Returns `{ kind, file, node }`
// with the file repo-relative, or null when the checker cannot answer.
const declaredFileOfNode = (typeNode, checker, repoRoot) => {
	const relOf = (f) => repoRelative(f.getFilePath(), repoRoot);
	const deref = (symbol) => {
		if (!symbol) return null;
		const decls = symbol.getDeclarations();
		const isImport = decls.some((d) => ["ImportSpecifier", "ImportClause", "NamespaceImport"].includes(d.getKindName()));
		return isImport ? checker.getAliasedSymbol(symbol) : symbol;
	};
	const firstDecl = (symbol) => {
		const s = deref(symbol);
		const d = s?.getDeclarations?.()?.[0];
		return d ? { kind: d.getKindName(), file: relOf(d.getSourceFile()), node: d } : null;
	};
	try {
		// `RootStore | undefined` is one type with two parts, and the half that says
		// WHERE the state lives is the object one. Every optional accessor returns a
		// union, so without this the answer was "no file" for all of them.
		// The same for `A & B`, `(A)`, `readonly A`, `A[]`, `A[B]`: composition
		// keeps the owner of the part that names a repo file.
		const partsOf = (n) => {
			const kind = n.getKindName();
			if (kind === "UnionType" || kind === "IntersectionType") return n.getTypeNodes().filter((p) => !(p.getKindName() === "LiteralType" && /^(undefined|null)$/.test(p.getText())));
			if (kind === "ParenthesizedType" || kind === "TypeOperator") return [n.getTypeNode()].filter(Boolean);
			if (kind === "ArrayType") return [n.getElementTypeNode()].filter(Boolean);
			if (kind === "IndexedAccessType") return [n.getObjectTypeNode()].filter(Boolean);
			if (kind === "TupleType") return n.getElementTypeNodes().slice(0, 1);

			return [];
		};
		if (typeNode && partsOf(typeNode).length) {
			for (const part of partsOf(typeNode)) {
				const hit = declaredFileOfNode(part, checker, repoRoot);
				if (hit) return hit;
			}

			return null;
		}
		if (typeNode) {
			const nameNode = typeNode.getKindName() === "TypeReference" ? typeNode.getTypeName() : typeNode;
			let decl = firstDecl(checker.getSymbolAtLocation(nameNode));
			// `function f<T extends DocumentStore>(s: T)` — the VALUE is a store even
			// though its type is a parameter: the constraint says which one.
			if (decl?.kind === "TypeParameter") {
				const constraint = decl.node.getConstraint?.();
				const hit = constraint ? declaredFileOfNode(constraint, checker, repoRoot) : null;
				if (hit) return hit;
			}
			for (let depth = 0; decl && decl.kind === "TypeAliasDeclaration" && depth < 4; depth += 1) {
				const inner = decl.node.getTypeNode();
				const arg = inner?.getTypeArguments?.()?.[0];
				if (!arg) break;
				const innerName = arg.getKindName() === "TypeQuery" ? arg.getExprName() : arg;
				const next = firstDecl(checker.getSymbolAtLocation(innerName));
				if (!next || next.file === decl.file) break;
				decl = next;
			}
			if (decl) return decl;
		}
		return null;
	} catch {
		return null;
	}
};


const declaredFileOf = (param, checker, repoRoot) => declaredFileOfNode(param.getTypeNode?.(), checker, repoRoot);


// The same answer for a TYPE already resolved by the checker (a property's type,
// a call's return type) — only the symbol is left to follow.
const declaredFileOfType = (type, checker, repoRoot) => {
	const relOf = (f) => repoRelative(f.getFilePath(), repoRoot);
	const resolved = (symbol) => {
		if (!symbol) return null;
		const decls = symbol.getDeclarations();
		const isImport = decls.some((d) => ["ImportSpecifier", "ImportClause", "NamespaceImport"].includes(d.getKindName()));
		return isImport ? checker.getAliasedSymbol(symbol) : symbol;
	};
	const firstDecl = (symbol) => {
		const r = resolved(symbol);
		const d = r?.getDeclarations?.()?.[0];
		return d ? { kind: d.getKindName(), file: relOf(d.getSourceFile()), node: d } : null;
	};
	try {
		if (type?.isUnion?.()) {
			for (const part of type.getUnionTypes()) {
				if (part.isUndefined?.() || part.isNull?.()) continue;
				const hit = declaredFileOfType(part, checker, repoRoot);
				if (hit) return hit;
			}

			return null;
		}
		let decl = firstDecl(type?.getSymbol?.());
		if (!decl) decl = firstDecl(type?.getAliasSymbol?.());
		for (let depth = 0; decl && decl.kind === "TypeAliasDeclaration" && depth < 4; depth += 1) {
			const inner = decl.node.getTypeNode();
			const arg = inner?.getTypeArguments?.()?.[0];
			if (!arg) break;
			const innerName = arg.getKindName() === "TypeQuery" ? arg.getExprName() : arg;
			const next = firstDecl(checker.getSymbolAtLocation(innerName));
			if (!next || next.file === decl.file) break;
			decl = next;
		}
		return decl;
	} catch {
		return null;
	}
};

// Is a file part of the repo the architecture describes? A global such as
// `Array` and a built-in method such as `Set.has` are declared in TypeScript's
// own lib files: they are never somebody's state, so they are never a write
// into it. The line is drawn by WHERE the declaration lives, not by its name.
// Two shapes arrive here: an absolute path straight from the compiler and a
// repo-relative one from `declaredFileOf*`. Whether a file belongs to the repo
// is decided by its REAL path relative to the repo root — never by looking for
// a `node_modules` segment, which says nothing in a monorepo where every
// workspace has its own (and where a package is often a symlink into a store
// outside the tree).
const inRepo = (file, repoRoot) => {
	if (!file) return false;
	// already repo-relative: produced by `declaredFileOf*`. A path that climbs OUT
	// of the repo (`../../node_modules/…`) is as outside as an absolute one.
	if (!path.isAbsolute(file)) return !String(file).split("/").includes("..");
	if (!repoRoot) return false;
	let root = repoRoot;
	try {
		root = fs.realpathSync(repoRoot);
	} catch {
		root = repoRoot;
	}
	let abs = file;
	try {
		abs = fs.realpathSync(file);
	} catch {
		// TypeScript's own lib files are given virtual paths that never exist on
		// disk; the relative check below still places them outside the repo.
	}
	const rel = path.relative(root, abs);
	return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

// The file that declares the TYPE of an arbitrary EXPRESSION — aliases, call
// results and imports followed by the checker. One answer for "whose value is
// this", used by both a write (`assignments`) and a call (`calls`).
const declaredFileOfExpr = (expr, checker, repoRoot, depth = 0) => {
	if (!expr || depth > 4) return null;
	const aliased = (symbol) => {
		if (!symbol) return null;
		const isImport = (symbol.getDeclarations?.() ?? []).some((d) => ["ImportSpecifier", "ImportClause", "NamespaceImport"].includes(d.getKindName()));

		return isImport ? checker.getAliasedSymbol(symbol) : symbol;
	};
	const returnTypeOf = (call) => {
		const callee = call.getExpression?.();
		if (!callee) return null;
		const decl = aliased(checker.getSymbolAtLocation(callee))?.getDeclarations?.()?.[0];
		if (!decl) return null;
		// `function f(): T` and `const f = (): T => …` are the same answer
		const own = decl.getReturnTypeNode?.();
		if (own) return own;
		const init = decl.getInitializer?.();

		return ["ArrowFunction", "FunctionExpression"].includes(init?.getKindName?.()) ? init.getReturnTypeNode?.() ?? null : null;
	};
	if (expr.getKindName() === "Identifier") {
		const decl = aliased(checker.getSymbolAtLocation(expr))?.getDeclarations?.()?.[0];
		if (decl?.getKindName?.() === "VariableDeclaration") {
			const init = decl.getInitializer?.();
			if (init && ["CallExpression", "NewExpression"].includes(init.getKindName())) {
				const ret = returnTypeOf(init);
				const byReturn = ret ? declaredFileOfNode(ret, checker, repoRoot) : null;
				if (byReturn) return byReturn;
			}
			if (init) return declaredFileOfExpr(init, checker, repoRoot, depth + 1);
		}

		return declaredFileOfNode(decl?.getTypeNode?.(), checker, repoRoot);
	}
	if (["CallExpression", "NewExpression"].includes(expr.getKindName())) {
		const ret = returnTypeOf(expr);
		const byReturn = ret ? declaredFileOfNode(ret, checker, repoRoot) : null;
		if (byReturn) return byReturn;
	}

	return declaredFileOfType(expr.getType?.(), checker, repoRoot);
};

module.exports = { declaredFileOfNode, declaredFileOf, declaredFileOfType, declaredFileOfExpr, inRepo };

// ── What is in the file ─────────────────────────────────────────────────────

// Raw facts about a whole file. `repoFiles` is the repo-relative file list used
// to compute the folder facts.
const collectFileFacts = (sf, { rel, repoFiles, aliases, repoRoot, candidates }) => {
	const text = sf.getFullText();

	// EVERY way code leaves the module — one list, `form` says which spelling:
	//   named      `export { a, b as c }`        (of local code, or a re-export)
	//   namespace  `export * as ns from "x"`
	//   star       `export * from "x"`
	//   default    `export default <expr>`
	//   equals     `export = <expr>`
	//   commonjs   `module.exports = …`, `module.exports.x = …`, `exports.x = …`
	const importMap = importNameModules(sf, repoRoot, aliases, repoFiles);
	const statementExports = sf.getExportDeclarations().map((exp) => {
		const entry = {
			form: "named",
			named: exp.getNamedExports().map((el) => el.getAliasNode()?.getText() ?? el.getName()),
			from: null,
			source: null,
			name: null,
			line: startLine(exp),
			piece: enclosingPiece(exp),
		};
		if (exp.getModuleSpecifierValue()) {
			entry.source = exp.getModuleSpecifierValue();
			entry.from = resolveImport(sf, entry.source, repoRoot, aliases, repoFiles);
		}
		const ns = exp.getNamespaceExport();
		if (ns) {
			entry.form = "namespace";
			// `export * as ns from ...` — the binding is the name after `as`, not
			// the whole `* as ns` text.
			entry.named = [ns.getName()];
		}
		// `export * from "..."` — has a module specifier but neither a namespace
		// export nor named exports.
		else if (exp.hasModuleSpecifier() && !exp.hasNamedExports()) entry.form = "star";
		// `export { a as b }` with no specifier, where `a` was IMPORTED: that is a
		// re-export like any other — the code being published is not this file's.
		if (!entry.from && entry.named.length === 1 && importMap.has(entry.named[0])) entry.from = importMap.get(entry.named[0]);
		return entry;
	});

	// `export default <expr>` / `export = <expr>`: no declaration modifier to find,
	// so the statement itself is the site. When the expression is an imported
	// binding, the export is a pass-through of that module.
	const assignmentExports = sf.getExportAssignments().map((ea) => {
		const text = ea.getExpression()?.getText() ?? "";

		return { form: ea.isExportEquals() ? "equals" : "default", named: [], source: null, from: text ? (importMap.get(text) ?? null) : null, name: null, line: startLine(ea), piece: enclosingPiece(ea) };
	});

	// CommonJS, in every form it is still written in.
	const commonJsExports = sf
		.getDescendants()
		.filter((d) => d.getKind() === SK.BinaryExpression && d.getOperatorToken().getText() === "=")
		.map((d) => {
			const m = /^(?:module\.)?exports(?:\.([A-Za-z0-9_$]+))?$/.exec(d.getLeft().getText());
			if (!m) return null;

			return { form: "commonjs", named: [], source: null, from: null, name: m[1] ?? null, line: d.getStartLineNumber(), piece: enclosingPiece(d) };
		})
		.filter(Boolean);

	const exports = [...statementExports, ...assignmentExports, ...commonJsExports].sort((a, b) => a.line - b.line);

	// EVERY way a module is brought in — one list, `form` says which spelling:
	//   statement  `import … from "x"`
	//   require    `require("x")` — CommonJS
	//   dynamic    `import("x")` — the dynamic form
	// A `require`/`import()` sits INSIDE a function, so its `piece` says which
	// code depends on the module; a statement is the file's own, `piece` is null.
	// A type dependency written in the declaration itself (`extends`/`implements`),
	// with no import statement to see it.
	const heritage = heritageOf(sf, sf.getProject().getTypeChecker(), repoRoot, rel);

	// `import x = require("y")` / `import x = A.B` — the CommonJS spelling of a
	// dependency, which is a `require` in everything but the keyword.
	const equalsImports = sf
		.getDescendantsOfKind(SK.ImportEqualsDeclaration)
		.map((decl) => {
			// `import x = require("y")` vs `import x = A.B`: only the first names a module.
			const moduleRef = decl.getModuleReference?.();
			const isExternal = String(moduleRef?.getKindName?.() ?? "") === "ExternalModuleReference";
			const expr = isExternal ? moduleRef.getExpression?.() : null;
			const source = nodeText(expr ?? moduleRef) || null;

			return {
				form: isExternal ? "require" : "equals",
				source,
				typeOnly: decl.isTypeOnly?.() ?? false,
				named: [],
				line: startLine(decl),
				piece: null,
				resolved: source ? resolveImport(sf, source, repoRoot, aliases, repoFiles) : null,
			};
		});

	const imports = [
		...sf.getImportDeclarations().map((imp) => {
			const source = imp.getModuleSpecifierValue();
			// Named imports carry the LOCAL binding name (`b as c` → "c").
			const entry = { form: "statement", source, typeOnly: imp.isTypeOnly(), named: imp.getNamedImports().map((el) => el.getAliasNode()?.getText() ?? el.getName()), line: startLine(imp), piece: null };
			const def = imp.getDefaultImport();
			if (def) entry.defaultName = def.getText();
			const ns = imp.getNamespaceImport();
			if (ns) entry.namespaceName = ns.getText();
			entry.resolved = resolveImport(sf, source, repoRoot, aliases, repoFiles);
			return entry;
		}),
		...sf
			.getDescendantsOfKind(SK.CallExpression)
			.map((call) => {
				const callee = call.getExpression();
				const isRequire = callee.getKind() === SK.Identifier && callee.getText() === "require";
				const isDynamic = callee.getKind() === SK.ImportKeyword;
				if (!isRequire && !isDynamic) return null;
				const arg = call.getArguments()[0];
				if (!arg || arg.getKind() !== SK.StringLiteral) return null;
						const entry = { form: isDynamic ? "dynamic" : "require", source: nodeText(arg) || null, typeOnly: false, named: [], line: call.getStartLineNumber(), piece: enclosingPiece(call) };
				entry.resolved = resolveImport(sf, entry.source, repoRoot, aliases, repoFiles);
				return entry;
			})
			.filter(Boolean),
		...heritage,
		...equalsImports,
	].sort((a, b) => a.line - b.line);

	// Members of OTHER modules this file looks at (`requireRootStore().settings`,
	// `Settings.debug`). The import map is rebuilt here because reads are a FILE
	// fact, not a per-candidate one: a read is a property of the file's surface.
	const reads = readsFact(sf, importMap);

	return {
		// The whole file, as one array of lines: `lines[0]` is the first,
		// `lines.length` the count.
		lines: linesOf(sf),
		imports,
		exports,
		// WHERE this file is — one fact, built by `entities/location.placeOf`: the
		// names it is made of, its parts, its folder, its parent, its neighbours and
		// its position among them. Nothing about the place is computed here.
		location: placeOf(rel, repoFiles),
		reads,
		// What is in the file: its own node, and every node below it.
		kind: { own: descriptor(sf), descendants: descendantsOf(sf) },
		candidates: candidates ?? [],
		roles: [...new Set((candidates ?? []).map((c) => c.role).filter(Boolean))],
	};
};

module.exports = { createTsProject, loadSourceFile, importNameModules, collectFileFacts, declaredFileOfNode, declaredFileOf, declaredFileOfType, declaredFileOfExpr, repoRelative, inRepo };

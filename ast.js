"use strict";

// The single ts-morph entry point. Everything that touches the AST lives here:
// project creation, source-file loading, and the collection of *raw facts*
// about a file and its candidates (functions / variable declarations).
//
// Facts are plain data — no comparisons, no predicates, no project rules.
// The YAML pairs a fact with a filter (see utils/queries.js) to express any
// rule. Nothing in this file names a project, a framework, or a role.

const { Project, SyntaxKind: SK, ts } = require("ts-morph");
const { resolveImport } = require("./utils/imports");

// ── SyntaxKind vocabulary ────────────────────────────────────────────────────

// Function-like nodes — the candidates for `functionLike` roles.
const FUNCTION_KINDS = new Set([
	SK.FunctionDeclaration,
	SK.FunctionExpression,
	SK.ArrowFunction,
	SK.MethodDeclaration,
	SK.GetAccessor,
	SK.SetAccessor,
]);

// Loops.
const LOOP_KINDS = new Set([
	SK.ForStatement,
	SK.ForOfStatement,
	SK.ForInStatement,
	SK.WhileStatement,
	SK.DoStatement,
	SK.DoWhileStatement,
]);

// Call targets.
const CALL_KINDS = new Set([SK.CallExpression, SK.NewExpression, SK.TaggedTemplateExpression]);

// Resolve a SyntaxKind name (as written in the YAML) to its numeric kind.
const resolveSyntaxKind = (name) => {
	const v = ts.SyntaxKind[String(name)];
	return typeof v === "number" ? v : null;
};

// The string name of a node's SyntaxKind (e.g. "FunctionDeclaration").
// Built from the real TypeScript enum: ts-morph's own SyntaxKind enum has
// duplicate "First*"/"Last*" range placeholders that shadow the real names
// in its reverse mapping.
const KIND_NAMES = (() => {
	const map = new Map();
	for (const [k, v] of Object.entries(ts.SyntaxKind)) {
		if (typeof v === "number" && !map.has(v)) map.set(v, k);
	}

	return map;
})();

const kindName = (node) => KIND_NAMES.get(node.getKind()) ?? String(node.getKind());

const isFunctionNode = (n) => FUNCTION_KINDS.has(n.getKind());
const isLoopNode = (n) => LOOP_KINDS.has(n.getKind());
const isCallNode = (n) => CALL_KINDS.has(n.getKind());

// Unwrap parenthesized expressions: `() => ({...})` yields a
// ParenthesizedExpression whose `getExpression()` is the real ObjectLiteral.
const unwrapParens = (node) => {
	let n = node;
	while (n != null && n.getKind() === SK.ParenthesizedExpression) n = n.getExpression();
	return n;
};

// ── Project ──────────────────────────────────────────────────────────────────

// One Project per run. Files are added explicitly (never from tsconfig), so
// the engine is independent of the repo's build config; aliases come only
// from the YAML. `skipAddingFilesFromTsConfig` keeps the project empty until
// we add a file.
const createTsProject = (repoRoot) =>
	new Project({
		compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, esModuleInterop: true },
		skipAddingFilesFromTsConfig: true,
		useInMemoryFileSystem: false,
	});

// Load (or re-load) a source file into the project.
const loadSourceFile = (project, abs, text) => project.createSourceFile(abs, text, { overwrite: true });

// A map of every imported name (default / named / namespace) to the repo-
// relative file the import resolves to. Lets a call (`f(...)`) or an
// initializer (`x = f(...)`) be tied to the module it came from.
const importNameModules = (sf, repoRoot, aliases, repoFiles) => {
	const map = new Map();
	for (const imp of sf.getImportDeclarations()) {
		const resolved = resolveImport(sf, imp.getModuleSpecifierValue(), repoRoot, aliases, repoFiles);
		const def = imp.getDefaultImport();
		if (def) map.set(def.getText(), resolved);
		// Key by the LOCAL binding: for `import { b as c }` that is `c`, not
		// `b` — a call site can only write the local name.
		for (const el of imp.getNamedImports()) map.set(el.getAliasNode()?.getText() ?? el.getName(), resolved);
		const ns = imp.getNamespaceImport();
		if (ns) map.set(ns.getText(), resolved);
	}

	return map;
};

// The nearest function-like ancestor of a node, or null.
const nearestFunction = (node) => {
	let n = node?.getParent();
	while (n) {
		if (isFunctionNode(n)) return n;
		n = n.getParent();
	}

	return null;
};

// The name a function-like node carries, when it has one.
// Arrows and function expressions take the name of the variable,
// property, or field they are assigned to.
const nameOf = (fn) => {
	const k = fn.getKind();
	if (k === SK.FunctionDeclaration || k === SK.MethodDeclaration) return fn.getName() ?? null;
	const p = fn.getParent();
	if (!p) return null;
	const pk = p.getKind();
	if (pk === SK.VariableDeclaration) return p.getName() ?? null;
	if (pk === SK.PropertyAssignment || pk === SK.PropertyDeclaration || pk === SK.PropertySignature) return p.getName() ?? null;

	return null;
};

// The ts-morph kind name of the node's direct parent (e.g. an arrow that is
// the `.actions()` callback has parentKind "CallExpression"; a real action
// method has "ObjectLiteralExpression"). Lets role inference tell a callback
// apart from the entity it defines.
const parentKindOf = (n) => {
	const p = n.getParent();
	return p ? kindName(p) : null;
};

// The call that OWNS a function-like node, when the node is a callback of a
// method call (e.g. `.actions((self) => ({...}))`). Handles both the direct
// callback (the arrow IS the argument) and members of the object literal it
// returns (`.actions((self) => ({ doX() {...} })` — walk up through the
// object literal and the callback to the call). Returns the CallExpression
// node or null.
const owningCall = (fn) => {
	let p = fn.getParent();
	if (p && p.getKind() === SK.ParenthesizedExpression) p = p.getParent();
	// A method shorthand or property value inside an object literal that is
	// the callback argument of a method call: walk
	// ObjectLiteralExpression -> callback function -> CallExpression.
	if (p && (p.getKind() === SK.ObjectLiteralExpression || p.getKind() === SK.PropertyAssignment)) {
		const obj = p.getKind() === SK.PropertyAssignment ? p.getParent() : p;
		if (obj && obj.getKind() === SK.ObjectLiteralExpression) {
			let cb = obj.getParent();
			if (cb && cb.getKind() === SK.ParenthesizedExpression) cb = cb.getParent();
			if (cb && (cb.getKind() === SK.ArrowFunction || cb.getKind() === SK.FunctionExpression)) {
				p = cb.getParent();
				if (p && p.getKind() === SK.ParenthesizedExpression) p = p.getParent();
			}
		}
	}
	return p && p.getKind() === SK.CallExpression ? p : null;
};

// ── Fact helpers ─────────────────────────────────────────────────────────────

// A type reference as a plain string (the type node's text), or null.
const typeText = (node) => {
	const t = node.getType();
	return t.isAny() ? "any" : t.getText();
};

// Does a type reference look like a collection (Array / Map / Set / Record / T[])?
const isCollectionType = (typeStr) => {
	if (!typeStr) return false;

	return /\b(Array|Map|Set|Record)\b/.test(typeStr) || /\[\]$/.test(typeStr.trim());
};

// Is this node a "pure property path" — dots only, rooted in an identifier?
// `a.b.c` → true; `arr[0].run` → false (element access); `f().x` → false (call).
const isPurePropertyPath = (node) => {
	const k = node.getKind();
	if (k === SK.Identifier) return true;
	if (k === SK.PropertyAccessExpression) return isPurePropertyPath(node.getExpression());

	return false;
};

// The origin of any expression chain — what the expression acts on / is
// rooted at:
//   `t.model("X", {...})` → `t.model`        (pure property path = the function)
//   `a.b.c()` → `a.b.c`                      (pure property path = the function)
//   `arr[0].run()` → `arr[0]`               (element access → the object, not the method)
//   `new F(...)` / `new F({}).create()` → `new F`  (construction → the class, `new ` prefix)
//   `getRoot(self).store.doAction()` → `getRoot`   (call in chain → the root call)
//   `state` (bare identifier) → `state`
//   `[1,2,3]` (array literal) → null
// This is the generic "what can this expression be performed on" fact. The
// YAML can match any pattern: `origin: { equals: "t.model" }`,
// `origin: { startsWith: "new " }`, `origin: { endsWith: ".run" }`.
const leftmostOrigin = (expr) => {
	if (!expr) return null;
	let e = expr;
	while (e) {
		const ek = e.getKind();
		if (ek === SK.CallExpression) {
			const callee = e.getExpression();
			// Pure property path (a.b.c) → the full chain IS the function name.
			if (isPurePropertyPath(callee)) return callee.getText();
			// Otherwise (arr[0].run, new F().m, f().x) → recurse into the callee
			// to find the base object.
			e = callee;
			continue;
		}
		if (ek === SK.NewExpression) {
			return "new " + e.getExpression().getText();
		}
		if (ek === SK.PropertyAccessExpression) {
			const base = e.getExpression();
			if (base.getKind() === SK.Identifier) return e.getText();
			e = base;
			continue;
		}
		if (ek === SK.ElementAccessExpression) {
			return e.getText();
		}
		if (ek === SK.Identifier) return e.getText();
		break;
	}

	return null;
};

// The rightmost member name of an expression chain: `store.doX` → "doX",
// `arr[0]` → null. null for a bare identifier (it is its own name).
const lastMemberName = (expr) => {
	if (!expr) return null;
	if (expr.getKind() === SK.PropertyAccessExpression) return expr.getName();
	return null;
};

// A variable declaration list is mutable when declared with `let` or `var`.
const isMutableDecl = (declList) => {
	const k = declList.getDeclarationKind?.();

	return k === "let" || k === "var";
};

// Is an object-literal member a "method" — a method shorthand, an accessor, or
// a property whose value is a function expression? ts-morph's
// `getProperties()` returns the base element type, so `isMethod()` is not
// available; we test the kind / initializer instead.
const isMethodMember = (p) => {
	const k = p.getKind();
	if (k === SK.MethodDeclaration || k === SK.GetAccessor || k === SK.SetAccessor) return true;
	const init = p.getInitializer?.();

	return init != null && isFunctionNode(init);
};

// Raw per-member facts of an object literal:
// `[{name, kind, type, isFunction}]`. The plugin records DATA, not verdicts —
// "does this literal have methods?" is a query
// (`members: { some: { isFunction: { equals: true } } }` or a `js`
// expression), not a hardcoded fact field.
const memberFacts = (objLit) =>
	objLit.getProperties().map((p) => ({
		name: typeof p.getName === "function" ? p.getName() : null,
		kind: kindName(p),
		type: typeText(p),
		isFunction: isMethodMember(p),
	}));

// A descendant is meaningful when it is not a SyntaxList and not a punctuation
// token. Keywords (NumberKeyword, …) are kept — they are meaningful.
const isMeaningful = (d) => {
	const k = d.getKind();
	if (k === SK.SyntaxList) return false;
	if (k >= ts.SyntaxKind.FirstToken && k <= ts.SyntaxKind.LastToken) return (KIND_NAMES.get(k) ?? "").endsWith("Keyword");

	return true;
};

// Raw facts for one descendant node, relative to `root` (a file or a
// candidate). `nested` is set on function-like / loop nodes: true when another
// function-like node sits between the node and `root`.
// ts-morph `getStart()`/`getEnd()` return a *position* (a number), not a
// `{line, column}` object — the line must be resolved against the source file.
const startLine = (n) => n.getSourceFile().getLineAndColumnAtPos(n.getStart()).line;

// Depth of a node below `root` (0 = a direct child of the root).
const depthOf = (n, root) => {
	let depth = 0;
	let p = n.getParent();
	while (p && p !== root) {
		depth += 1;
		p = p.getParent();
	}

	return depth;
};

const descendantFact = (d, root, depth = 0) => {
	const f = { kind: kindName(d), depth, line: startLine(d) };
	// A short, reportable label: the node's name when it has one, otherwise
	// its (trimmed) source text. Feeds the `{what}` / `{snippet}` report vars.
	f.name = d.getName ? (d.getName() ?? null) : null;
	f.snippet = d.getText().trim().slice(0, 120);
	if (d.getKind() === SK.AsExpression) {
		// `as unknown` — the cast target is UnknownKeyword.
		f.type = d.getTypeNode()?.getText() ?? null;
		f.isUnknownCast = d.getTypeNode()?.getKind() === SK.UnknownKeyword;
	}
	if (d.getKind() === SK.ObjectLiteralExpression) {
		// Raw per-member facts; "has methods" is a query, not a fact.
		f.members = memberFacts(d);
	}
	if (isFunctionNode(d) || isLoopNode(d)) f.nested = isNestedIn(d, root) || (isFunctionNode(root) && d !== root);
	return f;
};

// ── File facts ───────────────────────────────────────────────────────────────

// Raw facts about a whole file. `repoFiles` is the repo-relative file list
// used to compute `filesPerFolder`.
// A property-access chain whose leftmost base matches a configured
// *scope accessor* — e.g. `getRoot(self).grammar.loadGrammar(id)`,
// `global.x.y`, `self.root.storeA.doX()`, `parent.get("name").feature`.
// Accessors are config-driven (YAML `scopeAccessors`) and STRUCTURED —
// each declares how the chain is rooted, so matching is unambiguous:
//
//   { kind: "call",       segments: ["getRoot"] }            — `getRoot(self).x`
//   { kind: "identifier", segments: ["global"] }             — `global.x.y`
//   { kind: "identifier", segments: ["self", "root"] }       — `self.root.x`
//   { kind: "methodCall", segments: ["parent", "get"] }      — `parent.get("n").x`
//
// The chain's base shape decides which accessor kind applies: a call with
// an identifier callee → `call`; a plain identifier → `identifier`; a call
// with a property-chain callee → `methodCall`. An accessor never competes
// with another kind on the same chain — `getRoot` can only ever match
// `getRoot(...)`, never `global.x` or `parent.get(...)`. Within one kind,
// the longest segment list wins (`self.root` beats `self` on the same
// chain). For `identifier` accessors the segments span the base identifier
// PLUS leading property names (`self.root` = base `self` + property `root`);
// for `call` / `methodCall` they are exactly the base segments.
//
// For every PropertyAccessExpression whose base matches a configured
// accessor, this returns the matched accessor text (`via`) and the full
// property path up to this node (`chain`, innermost-first; the last element
// is the outermost property — for a call, the method being invoked).
//
// The fact is deliberately recorded at EVERY level of the chain, so
// `getRoot(self).grammar` (a store reference) and
// `getRoot(self).grammar.loadGrammar` (a method call on that store) are both
// facts. The YAML picks the granularity with the usual list operators:
// `chain: { length: { gte: 2 } }` = method calls, `chain: { length: { equals: 1 } }`
// = bare store references, `chain: { contains: "loadGrammar" }` = a specific
// call, `via: { equals: "getRoot" }` = a specific accessor.
//
// The accessor itself is NOT a fact: a chain that consists of nothing but
// the accessor (`parent.get("name")` with no property after it) yields no
// `chain` and is dropped — only the property accesses that FOLLOW the
// accessor are recorded.
const scopeAccessOf = (node, accessors) => {
	// Walk up the PropertyAccessExpression chain, collecting property names
	// (innermost-first). `cur` ends at the leftmost base.
	const names = [];
	let cur = node;
	while (cur.getKind() === SK.PropertyAccessExpression) {
		names.unshift(cur.getName());
		cur = cur.getExpression();
	}
	// Classify the base: its shape determines the accessor kind.
	let kind = null;
	let baseSegs = null;
	if (cur.getKind() === SK.CallExpression) {
		const callee = cur.getExpression();
		if (callee.getKind() === SK.Identifier) {
			kind = "call";
			baseSegs = [callee.getText()];
		} else if (callee.getKind() === SK.PropertyAccessExpression) {
			const cnames = [];
			let c = callee;
			while (c.getKind() === SK.PropertyAccessExpression) {
				cnames.unshift(c.getName());
				c = c.getExpression();
			}
			if (c.getKind() === SK.Identifier) {
				kind = "methodCall";
				baseSegs = [c.getText(), ...cnames];
			}
		}
	} else if (cur.getKind() === SK.Identifier) {
		kind = "identifier";
		baseSegs = [cur.getText()];
	}
	if (!kind) return null;
	const sameKind = accessors.filter((a) => a.kind === kind);
	let acc = null;
	let consumed = 0; // property names eaten by the accessor (identifier kind only)
	if (kind === "identifier") {
		// segments = base identifier + leading property names; longest wins.
		for (const a of sameKind) {
			if (a.segments.length < 1 || a.segments.length > 1 + names.length) continue;
			if (a.segments[0] !== baseSegs[0]) continue;
			if (!a.segments.slice(1).every((s, i) => s === names[i])) continue;
			if (!acc || a.segments.length > acc.segments.length) {
				acc = a;
				consumed = a.segments.length - 1;
			}
		}
	} else {
		// call / methodCall: the segments are exactly the base segments.
		acc = sameKind.find((a) => a.segments.length === baseSegs.length && a.segments.every((s, i) => s === baseSegs[i]));
	}
	if (!acc) return null;
	// The chain is the property segments AFTER the accessor — the accessor
	// itself is not a store field.
	const chain = names.slice(consumed);
	if (!chain.length) return null;
	return { via: acc.segments.join("."), chain, line: cur.getStartLineNumber() };
};

const collectFileFacts = (sf, { rel, repoFiles, aliases, repoRoot, candidates, scopeAccessors }) => {
	const text = sf.getFullText();

	// Every meaningful node in the file — the target of file-level `forbid`
	// filters (e.g. forbid a ClassDeclaration / AnyKeyword anywhere). `depth`
	// is 0 for top-level statements, so "top-level only" is a query
	// (`depth: { equals: 0 }`), not a separate fact.
	const descendants = sf.getDescendants().filter(isMeaningful).map((d) => descendantFact(d, sf, depthOf(d, sf)));

	// Exports: every export binding with its kind. `named` carries the LOCAL
	// names; `from` is set for re-exports (`export { x } from "./y"`), `source`
	// for `export * from`.
	const exports = sf
		.getExportDeclarations()
		.map((exp) => {
			const entry = {
				kind: "named",
				named: exp.getNamedExports().map((el) => el.getAliasNode()?.getText() ?? el.getName()),
				from: null,
				source: null,
				line: startLine(exp),
			};
			if (exp.getModuleSpecifierValue()) {
				entry.source = exp.getModuleSpecifierValue();
				entry.from = resolveImport(sf, entry.source, repoRoot, aliases, repoFiles);
			}
			const ns = exp.getNamespaceExport();
			if (ns) {
				entry.kind = "namespace";
				// `export * as ns from ...` — the binding is the name after
				// `as`, not the whole `* as ns` text.
				entry.named = [ns.getName()];
			}
			// `export * from "..."` — has a module specifier but neither a
			// namespace export nor named exports.
			else if (exp.hasModuleSpecifier() && !exp.hasNamedExports()) entry.kind = "star";
			return entry;
		});

	const imports = sf
		.getImportDeclarations()
		.map((imp) => {
			const source = imp.getModuleSpecifierValue();
			// Named imports carry the LOCAL binding name (`b as c` → "c").
			const entry = { source, typeOnly: imp.isTypeOnly(), named: imp.getNamedImports().map((el) => el.getAliasNode()?.getText() ?? el.getName()), line: startLine(imp) };
			const def = imp.getDefaultImport();
			if (def) entry.defaultName = def.getText();
			const ns = imp.getNamespaceImport();
			if (ns) entry.namespaceName = ns.getText();
			entry.resolved = resolveImport(sf, source, repoRoot, aliases, repoFiles);
			return entry;
		});

	// Scope-accessor chains (`getRoot(self).x.y`, `global.x.y`,
	// `self.root.storeA.doX()`, `parent.get("name").feature`), when accessors
	// are configured. Recorded at every level of the chain — see scopeAccessOf.
	const accessors = scopeAccessors ?? [];
	const scopeAccesses = accessors.length
		? sf
			.getDescendantsOfKind(SK.PropertyAccessExpression)
			.map((n) => scopeAccessOf(n, accessors))
			.filter(Boolean)
		: [];

	// Files in the same folder as this one (repo-relative), by basename.
	// Lets a YAML filter ask "does this folder contain X" without the plugin
	// knowing what X is.
	const folder = rel.replace(/\/[^/]*$/, "");
	// Basenames without extension, consistent with `fileName`.
	const folderFiles = folder
		? [...new Set(repoFiles.filter((p) => p.replace(/\/[^/]*$/, "") === folder).map((p) => p.split("/").pop().replace(/\.[^.]*$/, "")))].sort()
		: [];
	const filesPerFolder = folderFiles.length;
	// The file's basename without extension — so a YAML filter can ask
	// "does the file name contain / repeat something" without the plugin
	// knowing what that something is.
	const fileName = rel.split("/").pop().replace(/\.[^.]*$/, "");
	// Leading dash-boundary stems of this file's folder siblings, with how
	// many siblings share each: `text-mate-*.ts` + `text-mate.ts` share the
	// stems `text` and `text-mate`. A stem shared by several siblings is a
	// fake namespace — one concern split across files without a folder to
	// hold it. The YAML picks the threshold (`count: { gt: 2 }`).
	const sharedPrefixes = (() => {
		const stemsByFile = folderFiles.map((f) => {
			const parts = f.replace(/\.[^.]*$/, "").split("-");
			const stems = [];
			for (let i = 1; i < parts.length; i++) stems.push(parts.slice(0, i).join("-"));
			return { file: f, stems };
		});
		const counts = new Map();
		for (const { file, stems } of stemsByFile) for (const s of stems) counts.set(s, (counts.get(s) ?? 0) + 1);
		return [...counts.entries()]
			.filter(([stem, count]) => count > 1)
			.map(([stem, count]) => ({ stem, count, files: stemsByFile.filter((sf) => sf.stems.includes(stem)).map((sf) => sf.file) }))
			.sort((a, b) => b.count - a.count);
	})();
	// Subdirectories of this file's folder (by basename), so a YAML filter can
	// ask "does this folder contain a subfolder named X".
	const subfolders = folder
		? [...new Set(repoFiles.filter((p) => p.startsWith(folder + "/") && p !== rel).filter((p) => p.slice(folder.length + 1).includes("/")).map((p) => p.slice(folder.length + 1).split("/")[0]))].sort()
		: [];

	return {
		lines: text.split("\n").length,
		imports,
		exports,
		// Everything that is true about the file's LOCATION in the repo tree
		// lives here — one fact, queryable by dot-path (`path.dir`,
		// `path.fileName`, `path.filesPerFolder`, …).
		path: {
			dir: folder,
			fileName,
			filesPerFolder,
			folderFiles,
			subfolders,
			sharedPrefixes,
		},
		scopeAccesses,
		descendants,
		candidates: candidates ?? [],
		roles: [...new Set((candidates ?? []).map((c) => c.role).filter(Boolean))],
	};
};

// ── Candidate facts (function-like / variable declaration) ──────────────────

// Raw facts about a single candidate node. `rel` is the repo-relative file
// path — carried on the fact so location-aware infer operators (e.g. `location`)
// can match the candidate's position against node declarations.
const collectCandidateFacts = (node, sf, importMap, rel) => {
	const isFn = isFunctionNode(node);
	const kind = kindName(node);

	// Descendants: every meaningful node below (no SyntaxList / punctuation
	// tokens), with kind + a few derived flags.
	const descendants = node.getDescendants().filter(isMeaningful).map((d) => descendantFact(d, node, depthOf(d, node)));

	// Returns (function-like only). A value a function yields: each
	// `return <expr>;` statement plus, for an expression-body function
	// (`() => ({...})`), the expression body itself. A bare `return;` /
	// `() => {}` yields no value.
	//
	// Each entry shares the plugin-wide fact interface — no bespoke booleans:
	//   kind            — where the value comes from: "ReturnStatement" or
	//                     "ExpressionBody" (synthetic: an arrow's body IS the
	//                     value, ts-morph has no return node for it).
	//   exprKind        — the ts-morph kind of the yielded expression
	//                     (null when the function yields no value there).
	//                     Queryable by ts-morph kinds OR code-roles, like any
	//                     other kind fact.
	//   origin          — the origin of the yielded expression chain
	//                     (`t.model({}).actions(...)` → "t.model"); null when
	//                     the chain has no identifier root (literals, etc.).
	//   members         — for an object-literal value: raw per-member facts
	//                     `[{name, kind, isFunction}]` (empty otherwise).
	const bodyNode = isFn ? node.getBody() : null;
	const hasExpressionBody = isFn && bodyNode != null && bodyNode.getKind() !== SK.Block;
	const returnStatements = isFn ? node.getDescendantsOfKind(SK.ReturnStatement) : [];
	const returnEntry = (kind, expr) => {
		const isObject = expr?.getKind() === SK.ObjectLiteralExpression;
		return {
			kind,
			exprKind: expr ? kindName(expr) : null,
				origin: leftmostOrigin(expr),
			members: isObject ? memberFacts(expr) : [],
		};
	};
	const returns = returnStatements.map((r) => returnEntry("ReturnStatement", r.getExpression()));
	if (hasExpressionBody) {
		returns.push(returnEntry("ExpressionBody", unwrapParens(bodyNode)));
	}
	const hasReturn = returns.some((r) => r.exprKind != null);

	// Calls (function-like only): every call the candidate makes. One unified
	// entity for all call shapes (CallExpression / NewExpression /
	// TaggedTemplateExpression):
	//   kind              — the ts-morph kind of the call node
	//   origin            — the origin of the called expression chain
	//                       (`store.doX()` → "store", `new F()` → "new F",
	//                       `t.model(...)` → "t.model"); null when the chain
	//                       has no identifier root
	//   action            — the action being performed: the called member
	//                       name (`doX` in `store.doX()`), or the full
	//                       expression text for a bare-identifier call
	//   module            — the module the call resolves to: for a bare
	//                       identifier the import it came from, for a member
	//                       access the module of the origin object
	//   forwardsAllParams — true when the call forwards all of the candidate's
	//                       parameters (the forwarder pattern)
	const calls = isFn
		? node
				.getDescendants()
				.filter(isCallNode)
				.map((c) => {
					const expr = c.getKind() === SK.TaggedTemplateExpression ? c.getTag() : c.getExpression();
					// The module the call resolves to: for a bare identifier the
					// import it came from, for a member access the module of the
					// origin object.
					let module = null;
					if (expr) {
						let base = expr;
						while (base.getKind() === SK.PropertyAccessExpression) base = base.getExpression();
						if (base.getKind() === SK.Identifier) module = importMap.get(base.getText()) ?? null;
					}
					// origin = the base of the chain, action = the member
					// actually invoked: `store.doX()` → origin "store",
					// action "doX"; `getRoot(self).store.doAction()` →
					// origin "getRoot", action "doAction"; `new F()` →
					// origin "new F", action "F".
					let origin, action;
					if (kindName(c) === "new") {
						const ctor = expr.getExpression();
						origin = `new ${ctor.getText()}`;
						action = lastMemberName(ctor) ?? ctor.getText();
					} else if (isPurePropertyPath(expr)) {
						const chain = expr.getText().split(".");
						origin = chain[0];
						action = chain[chain.length - 1];
					} else {
						origin = leftmostOrigin(expr);
						action = lastMemberName(expr) ?? expr.getText();
					}
					return { kind: kindName(c), origin, action, module, forwardsAllParams: forwardsAllParams(c, node) };
					})
			: [];

	// Assignments (function-like only): targets that are local vs non-local.
	const assignments = isFn
		? node
				.getDescendants()
				.filter((d) => d.getKind() === SK.BinaryExpression && d.getOperatorToken().getText() === "=")
				.map((a) => {
					const lhs = a.getLeft();
					return { kind: "Assignment", target: lhs.getText(), local: isLocalTarget(lhs, node) };
				})
		: [];

	// Local variable declarations inside the candidate (function-like only).
	const declarations = isFn
		? node
				.getDescendantsOfKind(SK.VariableDeclaration)
				.map((d) => {
					const init = d.getInitializer();
					const initText = init ? init.getText() : null;
					const isParam = initText != null && node.getParameters().some((p) => p.getName() === initText);
					return {
						kind: "VariableDeclaration",
						name: d.getName(),
						type: d.getTypeNode()?.getText() ?? null,
						mutable: isMutableDecl(d.getParent()),
						isCollectionType: isCollectionType(d.getTypeNode()?.getText() ?? typeText(d)),
						initializerIsParam: isParam,
					};
				})
		: [];

	// Initializer (variable declaration only): the ts-morph kind of the
	// initializer expression, its origin (`t.model(...)` → "t.model"), and —
	// for an object literal — raw per-member facts.
	let initializer = null;
	if (!isFn && node.getKind() === SK.VariableDeclaration) {
		const init = node.getInitializer();
		if (init) {
			initializer = {
				kind: kindName(init),
				origin: leftmostOrigin(init),
				members: init.getKind() === SK.ObjectLiteralExpression ? memberFacts(init) : [],
			};
		}
	}

	// Parameters (function-like only).
	const parameters = isFn
		? node
				.getParameters()
				.map((p) => ({ name: p.getName(), type: p.getTypeNode()?.getText() ?? typeText(p) }))
		: [];

	// Mutated parameters (function-like only): names of parameters whose
	// PROPERTIES are assigned in the body (`param.x = ...`, `param.x.y = ...`).
	// This is the structural signature of the state-bag pattern — a plain
	// object passed in and mutated — and cannot be dodged by renaming the type.
	const mutatedParams = isFn
		? [
				...new Set(
					node
						.getDescendants()
						.filter((d) => d.getKind() === SK.BinaryExpression && d.getOperatorToken().getText() === "=")
						.map((a) => {
							const lhs = a.getLeft();
							// Only a property access on the param (`param.x = ...`) is a
							// state-bag mutation. A bare `param = ...` reassignment is a
							// different pattern and is not flagged here.
							if (!lhs || lhs.getKind() !== SK.PropertyAccessExpression) return null;
							let obj = lhs.getExpression();
							while (obj && obj.getKind() === SK.PropertyAccessExpression) obj = obj.getExpression();
							return obj && obj.getKind() === SK.Identifier ? obj.getText() : null;
						})
						.filter((n) => n != null && node.getParameters().some((p) => p.getName() === n)),
				),
			]
		: [];

	// Exported: is the candidate (or its statement) exported at module scope?
	const exported = isExported(node);

	// Module scope: is the candidate (or its statement) a top-level statement
	// of the file? A nested function declaration is `moduleScope: false`.
	const moduleScope = isModuleScope(node);

	// Body shape (function-like only): how many statements the body holds, and
	// whether it has none at all (`async () => {}`). Expression bodies
	// (arrow `() => x`) are not blocks and hold no statements.
	const body = isFn ? node.getBody() : null;
	const bodyStatements = body && body.getKind() === SK.Block ? body.getStatements().length : 0;
	const emptyBody = isFn && body?.getKind() === SK.Block && bodyStatements === 0;

	const lines = node.getSourceFile().getLineAndColumnAtPos(node.getEnd()).line - startLine(node) + 1;

	const parent = nearestFunction(node);

	// A variable declaration is mutable when declared with `let`/`var`.
	const mutable = !isFn && node.getKind() === SK.VariableDeclaration ? isMutableDecl(node.getParent()) : null;

	// calledBy: the action of the enclosing call when the candidate is a
	// callback (`actions({ save: () => ... })` → "actions").
	const owning = isFn ? owningCall(node) : null;
	const calledBy = owning ? (owning.getExpression().getKind() === SK.PropertyAccessExpression ? owning.getExpression().getName() : owning.getExpression().getText()) : null;

	return {
		kind,
		name: isFn ? nameOf(node) : (node.getName ? node.getName() : null),
		line: startLine(node),
		path: rel ?? null,
		mutable,
		parentName: parent ? (nameOf(parent) ?? null) : null,
		parentKind: parentKindOf(node),
		calledBy,
		descendants,
		returns,
		hasReturn,
		initializer,
		calls,
		assignments,
		declarations,
		exported,
		moduleScope,
		parameters,
		mutatedParams,
		emptyBody,
		bodyStatements,
		lines,
	};
};

// Does the call pass every parameter of the candidate through, in order, as
// bare identifiers? (The proxy pattern: `return f(...params)` / `f(a, b)`.)
const forwardsAllParams = (call, fn) => {
	const params = fn.getParameters().map((p) => p.getName());
	if (params.length === 0) return false;
	const args = call.getKind() === SK.TaggedTemplateExpression ? [] : call.getArguments();
	if (args.length !== params.length) return false;

	return args.every((a, i) => a.getKind() === SK.Identifier && a.getText() === params[i]);
};

// Type declarations (interface / type alias) are candidates too, so a
// node can declare `kind: [type, interface]` and the built-in rule can
// tell a type-only file from a runtime one.
const isTypeNode = (n) => n.getKind() === SK.InterfaceDeclaration || n.getKind() === SK.TypeAliasDeclaration;

const typeFact = (node, sf, rel) => ({
	kind: kindName(node),
	name: node.getName() ?? null,
	line: startLine(node),
	path: rel ?? null,
	mutable: false,
	parentName: null,
	parentKind: null,
	calledBy: null,
	descendants: [],
	returns: [],
	hasReturn: false,
	initializer: null,
	calls: [],
	assignments: [],
	declarations: [],
	exported: isExported(node),
	moduleScope: isModuleScope(node),
	parameters: [],
	mutatedParams: [],
	emptyBody: null,
	bodyStatements: null,
	lines: node.getSourceFile().getLineAndColumnAtPos(node.getEnd()).line - startLine(node) + 1,
});

// Every classification candidate in the file (function-like nodes,
// variable declarations, and type declarations, in document order).
const collectCandidates = (sf, importMap, rel) =>
	sf
		.getDescendants()
		.filter((n) => isFunctionNode(n) || n.getKind() === SK.VariableDeclaration || isTypeNode(n))
		.map((n) => (isTypeNode(n) ? typeFact(n, sf, rel) : collectCandidateFacts(n, sf, importMap, rel)));

// Is a function-like descendant nested inside another function-like node that
// is itself inside the candidate?
const isNestedIn = (fn, candidate) => {
	let n = fn.getParent();
	while (n && n !== candidate) {
		if (isFunctionNode(n)) return true;
		n = n.getParent();
	}

	return false;
};

// Is an assignment's left-hand side a local binding of the enclosing function?
// A property/element access (`state.x = ...`) is local when its BASE object is a
// local binding — writing to a property of a local is still a local mutation.
const isLocalTarget = (lhs, fn) => {
	let base = lhs;
	if (base.getKind() === SK.PropertyAccessExpression) base = base.getExpression();
	else if (base.getKind() === SK.ElementAccessExpression) base = base.getExpression();
	const name = base.getKind() === SK.Identifier ? base.getText() : null;
	if (!name) return false;
	const params = new Set(fn.getParameters().map((p) => p.getName()));
	const locals = new Set(
		fn
			.getDescendantsOfKind(SK.VariableDeclaration)
			.map((d) => d.getName()),
	);

	return params.has(name) || locals.has(name);
};

// Is the candidate exported at module scope?
const isExported = (node) => {
	let n = node;
	while (n && !n.getSourceFile().getStatements().includes(n)) n = n.getParent();
	if (!n) return false;
	const modifiers = n.getModifiers?.() ?? [];

	return modifiers.some((m) => m.getKind() === SK.ExportKeyword);
};

// Is the candidate at module scope (a top-level declaration of the file)?
// `false` when it sits inside a function body or block (a nested function).
const isModuleScope = (node) => {
	let n = node.getParent();
	while (n && n.getKind() !== SK.SourceFile) {
		if (n.getKind() === SK.Block || isFunctionNode(n)) return false;
		n = n.getParent();
	}

	return true;
};

module.exports = {
	SK,
	FUNCTION_KINDS,
	LOOP_KINDS,
	resolveSyntaxKind,
	kindName,
	isFunctionNode,
	isLoopNode,
	createTsProject,
	loadSourceFile,
	importNameModules,
	nearestFunction,
	nameOf,
	collectFileFacts,
	collectCandidateFacts,
	collectCandidates,
};

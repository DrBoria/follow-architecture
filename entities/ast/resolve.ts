"use strict";

// WHICH FILE DECLARES A VALUE — the type checker, through imports, aliases and
// call results. This is what lets a rule say "this writes into a store of that
// feature" without naming a type or a folder. Every "whose value / whose type
// is this" question asks the checker the same way, so the walks live here once.

import * as fs from "node:fs";
import * as path from "node:path";
import { type SourceFile, type TypeChecker, type Symbol as MorphSymbol, type Type } from "ts-morph";

import { isImportDecl } from "./tree";
import { notice } from "../../report/notices";
import { readOrFallback } from "../../utils/try-read";
import { resolveImport } from "../../utils/imports";
import type { LooseNode } from "./loose";

// The declaration the checker followed a type to: its kind, the repo-relative
// file it lives in, and the node itself.
type DeclInfo = { kind: string; file: string; node: LooseNode };

// The caller's own declaration finder (it knows its `relOf`).
type DeclFinder = (symbol: MorphSymbol | undefined) => DeclInfo | null;

// A path the architecture can compare. The checker answers with the path it read;
// `/var/home` and `/home` name the same folder, so an absolute path goes through
// `realpath` on both sides before it is made repo-relative.
const realPathOf = (p: string): string =>
	readOrFallback(p, (x) => fs.realpathSync(x), path.resolve(p));

const repoRelative = (file?: string | null, repoRoot?: string | null): string | null => {
	const abs = file ?? null;
	if (!abs) return abs;
	if (!path.isAbsolute(abs)) return String(abs).replace(/\\/g, "/");
	// An in-memory file has no path on disk, so `realpath` is tried first and the
	// plain resolution is the fallback — either way both sides are made absolute
	// before they are compared.
	return path.relative(realPathOf(repoRoot ?? "."), realPathOf(abs)).replace(/\\/g, "/");
};
// The symbol a name really points at: an import is followed to the symbol it
// aliases, anything else is its own. Every "whose value / whose type is this"
// question in this module asks the checker the same way.
const followAlias = (symbol: MorphSymbol | null | undefined, checker: TypeChecker): MorphSymbol | null => {
	if (!symbol) return null;
	const isImport = (symbol.getDeclarations() ?? []).some(isImportDecl);

	return isImport ? checker.getAliasedSymbol(symbol) : symbol;
};

// The declaration finder both walkers share: follow the alias, take the first
// declaration, make its file repo-relative.
const declFinderFor = (checker: TypeChecker, repoRoot: string): DeclFinder => {
	const relOf = (f: SourceFile): string => repoRelative(f.getFilePath(), repoRoot) ?? "";

	return (symbol) => {
		const s = followAlias(symbol, checker);
		const d = s?.getDeclarations?.()?.[0];

		return d ? { kind: d.getKindName(), file: relOf(d.getSourceFile()), node: d } : null;
	};
};

// One hop of the alias chain: `X = Alias<typeof Y>` names Y's declaration.
// A hop that stays in the same file (or names nothing) ends the walk.
const nextDeclOf = (decl: DeclInfo, checker: TypeChecker, firstDecl: DeclFinder): DeclInfo | null => {
	const inner: LooseNode | undefined = decl.node.getTypeNode?.();
	const arg: LooseNode | undefined = inner?.getTypeArguments?.()[0];
	if (!arg) return null;
	const innerName: LooseNode = arg.getKindName() === "TypeQuery" ? (arg.getExprName?.() ?? arg) : arg;
	const next = firstDecl(checker.getSymbolAtLocation(innerName));

	return next && next.file !== decl.file ? next : null;
};

// Follow `X = Alias<typeof Y>` through at most four aliases to the file that
// really declares the type. `firstDecl` is the caller's own declaration finder
// (it knows its `relOf`); this loop is the same in both declaration walkers.
const followDeclChain = (start: DeclInfo | null, checker: TypeChecker, firstDecl: DeclFinder): DeclInfo | null => {
	let decl = start;
	for (let depth = 0; decl && decl.kind === "TypeAliasDeclaration" && depth < 4; depth += 1) {
		const next = nextDeclOf(decl, checker, firstDecl);
		if (!next) break;
		decl = next;
	}

	return decl;
};

// `RootStore | undefined` is one type with two parts, and the half that says
// WHERE the state lives is the object one. Every optional accessor returns a
// union, so without this the answer was "no file" for all of them. The same for
// `A & B`, `(A)`, `readonly A`, `A[]`, `A[B]`, `[A, B]`: composition keeps the
// owner of the part that names a repo file. Each composed form has ONE reader;
// a form nobody reads has no parts.
const present = (parts: (LooseNode | undefined)[]): LooseNode[] => parts.filter((p): p is LooseNode => p != null);

const unionParts = (n: LooseNode): LooseNode[] => (n.getTypeNodes?.() ?? []).filter((p) => !(p.getKindName() === "LiteralType" && /^(undefined|null)$/.test(p.getText())));

// ts-morph's `TupleTypeNode` has `getElements()`; the element is either the
// type node itself or a named member (`[name: string]`) that holds it.
const tupleParts = (n: LooseNode): LooseNode[] => {
	const [first] = n.getElements?.() ?? [];

	return first ? [first.getTypeNode?.() ?? first] : [];
};

const COMPOSED_READERS = new Map<string, (n: LooseNode) => LooseNode[]>([
	["UnionType", unionParts],
	["IntersectionType", unionParts],
	["ParenthesizedType", (n) => present([n.getTypeNode?.()])],
	["TypeOperator", (n) => present([n.getTypeNode?.()])],
	["ArrayType", (n) => present([n.getElementTypeNode?.()])],
	["IndexedAccessType", (n) => present([n.getObjectTypeNode?.()])],
	["TupleType", tupleParts],
]);

const composedParts = (n: LooseNode): LooseNode[] => COMPOSED_READERS.get(n.getKindName())?.(n) ?? [];

// A type PARAMETER's constraint says which concrete type the value is:
// `function f<T extends DocumentStore>(s: T)` — the VALUE is a store.
const viaConstraint = (decl: DeclInfo, checker: TypeChecker, repoRoot: string): DeclInfo | null => {
	if (decl.kind !== "TypeParameter") return null;
	const constraint = decl.node.getConstraint?.();

	return constraint ? declaredFileOfNode(constraint, checker, repoRoot) : null;
};

// The first composed part that names a repo file, or null.
const viaParts = (parts: LooseNode[], checker: TypeChecker, repoRoot: string): DeclInfo | null => {
	for (const part of parts) {
		const hit = declaredFileOfNode(part, checker, repoRoot);
		if (hit) return hit;
	}

	return null;
};

// The file that declares a TYPE NODE, followed through `X = <Something<typeof Y>>`
// so a store's model is found through its alias. Returns `{ kind, file, node }`
// with the file repo-relative, or null when the checker cannot answer.
const declaredFileOfNode = (typeNode: LooseNode | null | undefined, checker: TypeChecker, repoRoot: string): DeclInfo | null => {
	const firstDecl = declFinderFor(checker, repoRoot);
	const walk = (): DeclInfo | null => {
		if (!typeNode) return null;
		const parts = composedParts(typeNode);
		if (parts.length) return viaParts(parts, checker, repoRoot);
		const nameNode: LooseNode = typeNode.getKindName() === "TypeReference" ? (typeNode.getTypeName?.() ?? typeNode) : typeNode;
		const decl = firstDecl(checker.getSymbolAtLocation(nameNode));
		if (!decl) return null;

		return viaConstraint(decl, checker, repoRoot) ?? followDeclChain(decl, checker, firstDecl);
	};

	// The checker cannot answer where a type is declared — an import it cannot
	// resolve, a cycle. The answer is UNKNOWN, and the reason is reported.
	return readOrFallback(null, walk, null, (e) => notice("the file declaring a type could not be resolved", e.message ?? String(e)));
};

const declaredFileOf = (param: LooseNode, checker: TypeChecker, repoRoot: string): DeclInfo | null => declaredFileOfNode(param.getTypeNode?.(), checker, repoRoot);

// The first union member that names a repo file (undefined/null carry no
// place), or null.
const viaUnion = (type: Type, checker: TypeChecker, repoRoot: string): DeclInfo | null => {
	for (const part of type.getUnionTypes()) {
		if (part.isUndefined?.() || part.isNull?.()) continue;
		const hit = declaredFileOfType(part, checker, repoRoot);
		if (hit) return hit;
	}

	return null;
};

// The same answer for a TYPE already resolved by the checker (a property's type,
// a call's return type) — only the symbol is left to follow.
const declaredFileOfType = (type: Type | undefined, checker: TypeChecker, repoRoot: string): DeclInfo | null => {
	const firstDecl = declFinderFor(checker, repoRoot);
	const walk = (): DeclInfo | null => {
		if (type?.isUnion?.()) return viaUnion(type, checker, repoRoot);
		const decl = firstDecl(type?.getSymbol?.()) ?? firstDecl(type?.getAliasSymbol?.());

		return followDeclChain(decl, checker, firstDecl);
	};

	// Same answer as above, for a type the checker already produced.
	return readOrFallback(null, walk, null, (e) => notice("the file declaring a type could not be resolved", e.message ?? String(e)));
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
const inRepo = (file?: string | null, repoRoot?: string | null): boolean => {
	if (!file) return false;
	// already repo-relative: produced by `declaredFileOf*`. A path that climbs OUT
	// of the repo (`../../node_modules/…`) is as outside as an absolute one.
	if (!path.isAbsolute(file)) return !String(file).split("/").includes("..");
	if (!repoRoot) return false;
	// TypeScript's own lib files are given virtual paths that never exist on
	// disk; the relative check below still places them outside the repo.
	const rel = path.relative(realPathOf(repoRoot), realPathOf(file));

	return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

// An import the checker cannot resolve — a package that is not installed, a
// path typo — has no aliased symbol. WHOSE VALUE THIS IS stays unknown, and an
// unknown is not a reason to lose the whole run to a `Debug Failure`.
const aliasedSymbolOf = (symbol: MorphSymbol | undefined, checker: TypeChecker): MorphSymbol | null =>
	readOrFallback(symbol ?? null, (s) => followAlias(s, checker), null, (e) => notice(`the import behind \`${symbol?.getName?.() ?? "a name"}\` could not be followed`, e.message ?? String(e)));

// The return type written on a function EXPRESSION initializer
// (`const f = (): T => …`); any other initializer declares no return.
const initReturnType = (decl: LooseNode): LooseNode | null => {
	const init: LooseNode | undefined = decl.getInitializer?.();
	if (!init) return null;
	if (!["ArrowFunction", "FunctionExpression"].includes(init.getKindName())) return null;

	return init.getReturnTypeNode?.() ?? null;
};

// The declared RETURN type of a call's callee: `function f(): T` and
// `const f = (): T => …` are the same answer.
const returnTypeOf = (call: LooseNode, checker: TypeChecker): LooseNode | null => {
	const callee = call.getExpression?.();
	if (!callee) return null;
	const decl: LooseNode | undefined = aliasedSymbolOf(checker.getSymbolAtLocation(callee), checker)?.getDeclarations?.()?.[0];
	if (!decl) return null;

	return decl.getReturnTypeNode?.() ?? initReturnType(decl);
};

// A call's value is declared where its RETURN type is: try that first.
const viaCallReturn = (expr: LooseNode, checker: TypeChecker, repoRoot: string): DeclInfo | null => {
	const ret = returnTypeOf(expr, checker);

	return ret ? declaredFileOfNode(ret, checker, repoRoot) : null;
};

// A variable's initializer: a call hands over its RETURN's owner; any other
// expression is followed as a value of its own.
const viaInitializer = (init: LooseNode, checker: TypeChecker, repoRoot: string, depth: number): DeclInfo | null => {
	if (["CallExpression", "NewExpression"].includes(init.getKindName())) {
		const byReturn = viaCallReturn(init, checker, repoRoot);
		if (byReturn) return byReturn;
	}

	return declaredFileOfExpr(init, checker, repoRoot, depth + 1);
};

// The initializer of a VARIABLE declaration; any other declared kind has none.
const variableInitOf = (decl: LooseNode | undefined): LooseNode | undefined => (decl?.getKindName?.() === "VariableDeclaration" ? decl.getInitializer?.() : undefined);

// An identifier's value: a variable is what it was initialised with; a bare
// binding is its type.
const viaIdentifier = (expr: LooseNode, checker: TypeChecker, repoRoot: string, depth: number): DeclInfo | null => {
	const decl: LooseNode | undefined = aliasedSymbolOf(checker.getSymbolAtLocation(expr), checker)?.getDeclarations?.()?.[0];
	const init = variableInitOf(decl);
	if (init) return viaInitializer(init, checker, repoRoot, depth);

	return declaredFileOfNode(decl?.getTypeNode?.(), checker, repoRoot);
};

// A call-shaped expression's value is its return's owner, when the checker can
// name one; anything else falls through to the expression's own type.
const viaCallShape = (expr: LooseNode, checker: TypeChecker, repoRoot: string): DeclInfo | null =>
	["CallExpression", "NewExpression"].includes(expr.getKindName()) ? viaCallReturn(expr, checker, repoRoot) : null;

// `getType()` itself asks the checker, and the checker throws on an import it
// cannot resolve — the question is answered OUTSIDE `declaredFileOfType`'s
// own guard, so it is guarded here: the declaring file stays UNKNOWN.
const typeOfExpr = (expr: LooseNode, checker: TypeChecker, repoRoot: string): DeclInfo | null =>
	readOrFallback(null, () => declaredFileOfType(expr.getType?.(), checker, repoRoot), null, (e) => notice(`the type of \`${expr.getText?.() ?? "an expression"}\` could not be read`, e.message ?? String(e)));

// The file that declares the TYPE of an arbitrary EXPRESSION — aliases, call
// results and imports followed by the checker. One answer for "whose value is
// this", used by both a write (`assignments`) and a call (`calls`).
const declaredFileOfExpr = (expr: LooseNode | null, checker: TypeChecker, repoRoot: string, depth = 0): DeclInfo | null => {
	if (!expr || depth > 4) return null;
	if (expr.getKindName() === "Identifier") return viaIdentifier(expr, checker, repoRoot, depth);

	return viaCallShape(expr, checker, repoRoot) ?? typeOfExpr(expr, checker, repoRoot);
};

// A map of every imported name (default / named / namespace) to the module it
// came from. A name that resolves to a scanned repo file maps to that file's
// repo-relative path; a name that resolves OUTSIDE the scanned set (a package
// in node_modules, a runtime builtin like `vscode`) maps to the SPECIFIER as
// written (`@apollo/client`, `react`). The specifier is a fact the architecture
// can filter on (`calls.module startsWith "@apollo/client"`) without the engine
// knowing any package by name; whether that module is repo code or a library is
// the consumer's question (`repoFiles.includes(module)`), never this map's.
const importNameModules = (sf: SourceFile, repoRoot: string, aliases?: Record<string, string>, repoFiles?: readonly string[]): Map<string, string> => {
	const map = new Map<string, string>();
	for (const imp of sf.getImportDeclarations()) {
		const source = imp.getModuleSpecifierValue();
		const resolved = resolveImport(sf, source, { repoRoot, aliases, repoFiles }) ?? source ?? null;
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

export { importNameModules, declaredFileOfNode, declaredFileOf, declaredFileOfType, declaredFileOfExpr, repoRelative, inRepo };
export type { DeclInfo };
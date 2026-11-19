"use strict";

// EVERY way a module is brought in — one list, `form` says which spelling:
//   statement  `import … from "x"`
//   require    `require("x")` — CommonJS
//   dynamic    `import("x")` — the dynamic form
//   equals     `import x = require("y")` / `import x = A.B`
//   heritage   `extends`/`implements` — a type dependency with no import
// A `require`/`import()` sits INSIDE a function, so its `piece` says which
// code depends on the module; a statement is the file's own, `piece` is null.

import { Node, type SourceFile, type ImportDeclaration, type ImportEqualsDeclaration, type CallExpression } from "ts-morph";
import { SK, startLine, nodeText } from "./tree";
import { enclosingPiece } from "./properties";
import { heritageOf } from "./heritage";
import { resolveImport } from "../../utils/imports";
import type { ResolveCtx } from "./file-exports";
import type { ImportFact } from "../facts";

const statementImport = (imp: ImportDeclaration, ctx: ResolveCtx): ImportFact => {
	const source = imp.getModuleSpecifierValue();
	// Named imports carry the LOCAL binding name (`b as c` → "c").
	const entry: ImportFact = { form: "statement", source, typeOnly: imp.isTypeOnly(), named: imp.getNamedImports().map((el) => el.getAliasNode()?.getText() ?? el.getName()), line: startLine(imp), piece: null };
	const def = imp.getDefaultImport();
	if (def) entry.defaultName = def.getText();
	const ns = imp.getNamespaceImport();
	if (ns) entry.namespaceName = ns.getText();
	entry.resolved = resolveImport(imp.getSourceFile(), source, ctx);

	return entry;
};

// `require("x")` / `import("x")` — the call forms, only when the first argument
// is a static string.
const callImport = (call: CallExpression, ctx: ResolveCtx): ImportFact | null => {
	const callee = call.getExpression();
	const isRequire = callee.getKind() === SK.Identifier && callee.getText() === "require";
	const isDynamic = callee.getKind() === SK.ImportKeyword;
	if (!isRequire && !isDynamic) return null;
	const arg = call.getArguments()[0];
	if (!arg || arg.getKind() !== SK.StringLiteral) return null;
	const entry: ImportFact = { form: isDynamic ? "dynamic" : "require", source: nodeText(arg) || null, typeOnly: false, named: [], line: call.getStartLineNumber(), piece: enclosingPiece(call) };
	entry.resolved = resolveImport(call.getSourceFile(), entry.source ?? "", ctx);

	return entry;
};

// `import x = require("y")` / `import x = A.B` — the CommonJS spelling of a
// dependency, which is a `require` in everything but the keyword.
const equalsImport = (decl: ImportEqualsDeclaration, ctx: ResolveCtx): ImportFact => {
	// `import x = require("y")` vs `import x = A.B`: only the first names a module.
	const moduleRef = decl.getModuleReference();
	const isExternal = String(moduleRef.getKindName()) === "ExternalModuleReference";
	const expr = isExternal && Node.isExternalModuleReference(moduleRef) ? moduleRef.getExpression() : null;
	const source = nodeText(expr ?? moduleRef) || null;

	return {
		form: isExternal ? "require" : "equals",
		source,
		typeOnly: decl.isTypeOnly?.() ?? false,
		named: [],
		line: startLine(decl),
		piece: null,
		resolved: source ? resolveImport(decl.getSourceFile(), source, ctx) : null,
	};
};

const importsOf = (sf: SourceFile, ctx: ResolveCtx): ImportFact[] => {
	// A type dependency written in the declaration itself (`extends`/`implements`),
	// with no import statement to see it.
	const heritage = heritageOf(sf, sf.getProject().getTypeChecker(), ctx.repoRoot, ctx.rel ?? "");

	return [
		...sf.getImportDeclarations().map((imp) => statementImport(imp, ctx)),
		...sf
			.getDescendantsOfKind(SK.CallExpression)
			.map((call) => callImport(call, ctx))
			.filter((e): e is ImportFact => e != null),
		...heritage,
		...sf.getDescendantsOfKind(SK.ImportEqualsDeclaration).map((decl) => equalsImport(decl, ctx)),
	].sort((a, b) => a.line - b.line);
};

export { importsOf };
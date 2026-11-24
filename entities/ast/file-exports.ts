"use strict";

// EVERY way code leaves the module — one list, `form` says which spelling:
//   named      `export { a, b as c }`        (of local code, or a re-export)
//   namespace  `export * as ns from "x"`
//   star       `export * from "x"`
//   default    `export default <expr>`
//   equals     `export = <expr>`
//   commonjs   `module.exports = …`, `module.exports.x = …`, `exports.x = …`

import { Node, type SourceFile, type ExportDeclaration, type ExportAssignment, type BinaryExpression } from "ts-morph";
import { startLine } from "./tree";
import { enclosingPiece } from "./properties";
import { resolveImport } from "../../utils/imports";
import type { CollectOptions } from "./file-facts";
import type { ExportFact } from "../facts";

// What resolving one module reference needs: the file's own collect options,
// minus the candidates (a reference resolves against the repo, not the pieces).
type ResolveCtx = Omit<CollectOptions, "candidates">;

// The form of one `export …` statement: a namespace re-export, a star
// re-export, or named exports.
const formOf = (exp: ExportDeclaration): ExportFact["form"] => {
	if (exp.getNamespaceExport()) return "namespace";
	if (exp.hasModuleSpecifier() && !exp.hasNamedExports()) return "star";

	return "named";
};

const statementExport = (exp: ExportDeclaration, importMap: ReadonlyMap<string, string>, ctx: ResolveCtx): ExportFact => {
	const named = exp.getNamedExports().map((el) => el.getAliasNode()?.getText() ?? el.getName());
	const entry: ExportFact = {
		form: formOf(exp),
		named,
		from: null,
		source: null,
		name: null,
		// `export type { … } from` / `export type * from` erase at compile time
		// and bind nothing at runtime — a rule that forbids VALUE re-exports must
		// tell them apart, so record which spelling this is.
		typeOnly: exp.isTypeOnly(),
		line: startLine(exp),
		piece: enclosingPiece(exp),
	};
	if (exp.getModuleSpecifierValue()) {
		entry.source = exp.getModuleSpecifierValue();
		entry.from = resolveImport(exp.getSourceFile(), entry.source, ctx);
	}
	const ns = exp.getNamespaceExport();
	// `export * as ns from ...` — the binding is the name after `as`, not the
	// whole `* as ns` text.
	if (ns) entry.named = [ns.getName()];
	// `export { a as b }` with no specifier, where `a` was IMPORTED: that is a
	// re-export like any other — the code being published is not this file's.
	if (!entry.from && entry.named?.length === 1 && importMap.has(entry.named[0])) entry.from = importMap.get(entry.named[0]) ?? null;

	return entry;
};

// `export default <expr>` / `export = <expr>`: no declaration modifier to find,
// so the statement itself is the site. When the expression is an imported
// binding, the export is a pass-through of that module.
const assignmentExport = (ea: ExportAssignment, importMap: ReadonlyMap<string, string>): ExportFact => {
	const text = ea.getExpression()?.getText() ?? "";

	return { form: ea.isExportEquals() ? "equals" : "default", named: [], source: null, from: text ? (importMap.get(text) ?? null) : null, name: null, line: startLine(ea), piece: enclosingPiece(ea) };
};

// CommonJS, in every form it is still written in.
const commonJsExport = (d: BinaryExpression): ExportFact | null => {
	const m = /^(?:module\.)?exports(?:\.([A-Za-z0-9_$]+))?$/.exec(d.getLeft().getText());
	if (!m) return null;

	return { form: "commonjs", named: [], source: null, from: null, name: m[1] ?? null, line: d.getStartLineNumber(), piece: enclosingPiece(d) };
};

const exportsOf = (sf: SourceFile, importMap: ReadonlyMap<string, string>, ctx: ResolveCtx): ExportFact[] => {
	const statementExports = sf.getExportDeclarations().map((exp) => statementExport(exp, importMap, ctx));
	const assignmentExports = sf.getExportAssignments().map((ea) => assignmentExport(ea, importMap));
	const commonJsExports = sf
		.getDescendants()
		.filter((d): d is BinaryExpression => Node.isBinaryExpression(d) && d.getOperatorToken().getText() === "=")
		.map(commonJsExport)
		.filter((e): e is ExportFact => e != null);

	return [...statementExports, ...assignmentExports, ...commonJsExports].sort((a, b) => a.line - b.line);
};

export { exportsOf };
export type { ResolveCtx };

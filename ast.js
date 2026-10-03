"use strict";

const ts = require("typescript");
const { pipe, filter, map } = require("remeda");

const parseSource = (fileName, text) =>
	ts.createSourceFile(
		fileName,
		text,
		ts.ScriptTarget.Latest,
		true,
		fileName.endsWith(".tsx") ? ts.LanguageVariant.JSX : undefined,
	);

const importEntry = (stmt) => {
	const source = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
	if (!source) return null;
	const entry = { source, named: [], defaultName: null, namespaceName: null };
	const clause = stmt.importClause;
	if (clause) {
		if (clause.name) entry.defaultName = clause.name.text;
		const nb = clause.namedBindings;
		if (nb && ts.isNamespaceImport(nb)) entry.namespaceName = nb.name.text;
		if (nb && ts.isNamedImports(nb)) entry.named = pipe(nb.elements, map((el) => el.name.text));
	}
	return entry;
};

const getImports = (sf) =>
	pipe(
		sf.statements,
		filter(ts.isImportDeclaration),
		map(importEntry),
		filter(Boolean),
	);

const enclosingFunctionName = (sf, line) => {
	let name = null;
	const visit = (node) => {
		const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
		const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
		if (start > line || end < line) return;
		let child = null;
		if (ts.isFunctionDeclaration(node) && node.name) child = node.name.text;
		else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) child = node.name.text;
		else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
			const p = node.parent;
			if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) child = p.name.text;
			else if (p && (ts.isPropertyAssignment(p) || ts.isPropertySignature(p)) && ts.isIdentifier(p.name)) child = p.name.text;
		}
		if (child) name = child;
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(sf, visit);
	return name;
};

module.exports = { parseSource, getImports, enclosingFunctionName };

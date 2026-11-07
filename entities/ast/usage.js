"use strict";

// What ts-morph knows BEYOND the syntax tree: who uses a name, and who
// implements a shape. Both are questions about the whole project, so they are
// asked once per named candidate and only where the answer can change a verdict:
// a name nothing outside its file mentions is a name nobody needs.

const countReferences = (node, sf, relOf) => {
	if (typeof node.findReferencesAsNodes !== "function") return null;
	let refs = [];
	try {
		refs = node.findReferencesAsNodes();
	} catch {
		return null;
	}
	const file = sf.getFilePath();
	const outside = refs.filter((r) => r.getSourceFile().getFilePath() !== file);
	// The declaration itself is not a use.
	const uses = refs.filter((r) => r !== node);
	// WHO uses it — not only how many. "One file calls this helper" is the whole
	// question behind "does it belong to a feature or to everybody", and a count
	// cannot answer it: two files in one feature read the same as two features.
	const where = (list) => [...new Set(list.map((r) => relOf(r.getSourceFile().getFilePath())))];
	const files = where(outside);

	return {
		total: uses.length,
		outside: outside.length,
		// Every file the name APPEARS in.
		files,
		// …and the subset where it is USED: a reference inside `export { x } from
		// "./x"` republishes the name instead of using it. Two facts, no verdict —
		// whether a barrel counts as a caller is a question for the rule.
		usedIn: where(outside.filter((r) => !insideExportFrom(r))),
	};
};

// Is this reference part of an `export … from` statement? Syntax only: walk up
// to the statement that holds the name.
const insideExportFrom = (node) => {
	for (let current = node.getParent?.(); current; current = current.getParent?.()) {
		const kind = current.getKindName?.();
		if (kind === "SourceFile") return false;
		if (kind === "ExportDeclaration") return true;
	}

	return false;
};

// How many shapes declare themselves implementations of this one. An interface
// nobody implements is a shape the project carries and nothing depends on.
const countImplementations = (node) => {
	if (typeof node.getImplementations !== "function") return null;
	try {
		return node.getImplementations().length;
	} catch {
		return null;
	}
};

// `{ references, implementations }` — every candidate answers both, `null` where
// the question does not apply (a comment has no name; a local binding's reach is
// its own file). A fact set with holes is a fact set rules cannot rely on.
const usageFact = (node, sf, { exported, relOf = (p) => p }) => {
	const named = typeof node.getName === "function" ? node.getName() : null;

	return {
		references: named && exported ? countReferences(node, sf, relOf) : null,
		implementations: named && exported && node.getKindName() === "InterfaceDeclaration" ? countImplementations(node) : null,
	};
};

module.exports = { usageFact };

"use strict";

// Type declarations — `interface` and `type`. They are candidates like any
// other, so a node can say `kind: [type, interface]` and a rule can tell a
// type-only file from a runtime one. A type has no code inside it, so it holds
// no actions: only where it is, the lines it spans, and whether it is published.

const { SK, kindFact, linesOf, isExported } = require("./tree");

const isTypeNode = (n) => n.getKind() === SK.InterfaceDeclaration || n.getKind() === SK.TypeAliasDeclaration;

const typeFact = (node, rel) => ({
	kind: kindFact(node, null),
	name: node.getName() ?? null,
	location: { path: rel ?? null, piece: null },
	lines: linesOf(node),
	returns: [],
	calls: [],
	assignments: [],
	parameters: [],
	exported: isExported(node),
	mutable: false,
});

module.exports = { typeFact, isTypeNode };

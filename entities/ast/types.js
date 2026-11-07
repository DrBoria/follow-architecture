"use strict";

// Type declarations — `interface` and `type`. They are candidates like any
// other, so a node can say `kind: [type, interface]` and a rule can tell a
// type-only file from a runtime one. A type has no code inside it, so it holds
// no actions: only where it is, the lines it spans, whether it is published —
// and what it is made of.

const { SK, linesOf, isExported } = require("./tree");
const { kindOf } = require("./kind");

const isTypeNode = (n) => n.getKind() === SK.InterfaceDeclaration || n.getKind() === SK.TypeAliasDeclaration;

// The members of a shape: a property (`PropertySignature`), a method
// (`MethodSignature`), an index (`IndexSignature`), a call or a `new` signature.
// The parser's own kind name says which, so "is this data or behaviour?" is a
// query, never a list of names kept in sync here.
const membersOf = (node) => {
	const members = typeof node.getMembers === "function" ? node.getMembers() : [];

	return members.map((m) => {
		const name = typeof m.getName === "function" ? (m.getName() ?? null) : null;
		const typeNode = (typeof m.getReturnTypeNode === "function" ? m.getReturnTypeNode() : null) ?? (typeof m.getTypeNode === "function" ? m.getTypeNode() : null);

		return { name, is: m.getKindName(), type: typeNode ? typeNode.getText() : null };
	});
};

const typeFact = (node, rel) => ({
	kind: kindOf(node),
	name: node.getName() ?? null,
	location: { path: rel ?? null, piece: null },
	lines: linesOf(node),
	returns: [],
	calls: [],
	branches: [],
	assignments: [],
	parameters: [],
	// What the shape is made of: `PropertySignature` is data, `MethodSignature` is
	// behaviour, and the rule reads the difference off `is`.
	members: membersOf(node),
	exported: isExported(node),
	mutable: false,
});

module.exports = { typeFact, isTypeNode };

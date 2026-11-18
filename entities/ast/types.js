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
//
// A member whose type is ANOTHER inline shape carries its own members — the
// same fact an object-literal member carries (`memberFacts` in tree.js), so
// `shape.colors.section` is reachable as a fact whether the shape is written
// as a value or as a type. The walk stops at MAX_MEMBER_DEPTH for the same
// reason it does there: a pathological shape must not turn a report into a
// full tree walk. A type REFERENCE (`Foo`, `Foo<Bar>`) is not an inline shape
// and simply has no `members` — following references is the checker's job,
// not the syntax reader's.
const MAX_MEMBER_DEPTH = 4;

const isInlineShape = (typeNode) => typeNode?.getKind?.() === SK.TypeLiteral;

const membersOf = (node, depth = 0) => {
	const members = typeof node.getMembers === "function" ? node.getMembers() : [];

	return members.map((m) => {
		const name = typeof m.getName === "function" ? (m.getName() ?? null) : null;
		const typeNode = (typeof m.getReturnTypeNode === "function" ? m.getReturnTypeNode() : null) ?? (typeof m.getTypeNode === "function" ? m.getTypeNode() : null);
		const nested = depth < MAX_MEMBER_DEPTH && isInlineShape(typeNode);

		return {
			name,
			is: m.getKindName(),
			type: typeNode ? typeNode.getText() : null,
			...(nested ? { members: membersOf(typeNode, depth + 1) } : {}),
		};
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

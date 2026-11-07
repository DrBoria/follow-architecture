"use strict";

// An `enum` is a declaration with a shape: a closed set of names, each bound to
// a value. It is a candidate like a type — a node may host it, a rule may count
// its members — and `const`/`declare` are its modifiers.

const { linesOf, isExported } = require("./tree");
const { kindOf } = require("./kind");

const membersOf = (node) =>
	(node.getMembers?.() ?? []).map((m) => {
		const initializer = m.getInitializer?.();
		const name = m.getName?.() ?? null;

		return { name, value: initializer ? initializer.getText() : null, line: m.getStartLineNumber() };
	});

const isEnumNode = (n) => n.getKindName() === "EnumDeclaration";

const enumFact = (node, rel) => ({
	// `const enum` is a MODIFIER, and `kind` carries every modifier.
	kind: kindOf(node),
	name: node.getName() ?? null,
	location: { path: rel ?? null, piece: null },
	lines: linesOf(node),
	returns: [],
	calls: [],
	branches: [],
	assignments: [],
	parameters: [],
	members: membersOf(node),
	exported: isExported(node),
	mutable: false,
});

module.exports = { enumFact, isEnumNode };

"use strict";

// An `enum` is a declaration with a shape: a closed set of names, each bound to
// a value. It is a candidate like a type — a node may host it, a rule may count
// its members — and `const`/`declare` are its modifiers.

const { declarationFact } = require("./declaration");

const membersOf = (node) =>
	(node.getMembers?.() ?? []).map((m) => {
		const initializer = m.getInitializer?.();
		const name = m.getName?.() ?? null;

		return { name, value: initializer ? initializer.getText() : null, line: m.getStartLineNumber() };
	});

const isEnumNode = (n) => n.getKindName() === "EnumDeclaration";

// `const enum` is a MODIFIER, and `kind` carries every modifier.
const enumFact = (node, rel) => declarationFact(node, rel, membersOf(node));

module.exports = { enumFact, isEnumNode };

"use strict";

// WHAT A DECLARATION IS, in one fact. `kind` is not only the AST node: it is
// also what the declaration is SPELLED with — `export`, `abstract`, `static`,
// `readonly`, the decorators above it, an assertion on its value, `using`. Those
// are all readable off the same node, so they live in the same place; a second
// top-level field would be the same fact spelled twice.
//
// `references` and `implementations` are NOT here: they come from the checker
// (ast/usage.js), and `kind` stays the answer the syntax tree alone can give.

const { kindFact } = require("./tree");
const { modifiersOf, decoratorsOf } = require("./modifiers");
const { assertionOf, isDisposable } = require("./variables");

// `initializer` — the variable's initializer, when the node has one: `as const`
// and `satisfies X` are written on the VALUE, and only a variable has one.
const kindOf = (node, initializer = null) => ({
	...kindFact(node, initializer),
	modifiers: modifiersOf(node),
	decorators: decoratorsOf(node),
	assertion: initializer ? assertionOf(node) : null,
	disposable: initializer ? isDisposable(node) : false,
});

// The `kind` of something with no node of its own (a comment is trivia): the
// same four fields, empty, so every candidate answers the same questions.
const spelled = (kind) => ({ own: { is: kind }, modifiers: [], decorators: [], assertion: null, disposable: false });

module.exports = { kindOf, spelled };

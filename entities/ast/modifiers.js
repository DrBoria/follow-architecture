"use strict";

// What a declaration is SPELLED with: `export`, `abstract`, `declare`, `async`,
// `static`, `readonly`, `accessor`, `override`, the visibility words — and the
// decorators above it. Facts, not verdicts: a rule decides what they mean.

const { SK, startLine } = require("./tree");
const { lastMemberName } = require("./properties");

// A variable's words live on the STATEMENT that declares it: `export const x`
// and `declare const x` are written on `VariableStatement`, and the declaration
// node itself carries none. Asking only the node answered "nothing" for every
// `const`, while `exported` said the opposite about the same file.
// The declaration sits inside a `VariableDeclarationList`, and the list inside the
// statement — so the owner is a grandparent, not a parent.
const spelledBy = (node) =>
	node.getKind?.() === SK.VariableDeclaration
		? (node.getFirstAncestorByKind?.(SK.VariableStatement) ?? node)
		: node;

// `modifiersOf` answers with the words as written, in source order.
const modifiersOf = (node) => {
	const owner = spelledBy(node);

	return (typeof owner.getModifiers === "function" ? owner.getModifiers() : []).map((m) => m.getText());
};

// Decorators by the NAME a filter can match: `@Component({…})` → "Component",
// `@core.Input()` → "Input". Framework-agnostic — any decorator, any framework.
const decoratorsOf = (node) =>
	(typeof node.getDecorators === "function" ? node.getDecorators() : []).map((d) => {
		const expr = d.getExpression();
		const name = expr.getKind() === SK.CallExpression ? (lastMemberName(expr.getExpression()) ?? expr.getExpression().getText()) : (lastMemberName(expr) ?? expr.getText());

		return { name, full: expr.getText(), line: startLine(d) };
	});

module.exports = { modifiersOf, decoratorsOf };

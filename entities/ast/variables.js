"use strict";

// Variable declarations — what a variable is initialised with. That is the whole
// question: whether the binding may be reassigned is `mutable` (ast/tree.js),
// and who may write into the value is the `assign`/`mutate` relation.
//
// Two things the initializer alone cannot say are read here: the ASSERTION on it
// (`as const`, `satisfies X`, `<X>x`) and whether the binding is DISPOSABLE
// (`using x = …`), which runs a `[Symbol.dispose]` at the end of its scope.

const { SK, kindName, memberFacts } = require("./tree");
const { leftmostOrigin } = require("./properties");

// The initializer, in the same shape as `kind.initializer`: the parser's kind of
// the expression, its origin (`t.model(...)` → "t.model"), and — for an object
// literal — raw per-member facts. A STATIC STRING initializer keeps its text
// (`value`): a class list written as `const cls = "flex p-4"` is a declaration
// list the CSS facet can read, and the text is the fact that makes it possible.
// A published anonymous value (`export default { … }`) has no binding of its
// own: the export assignment IS its declaration, and the expression it exports
// is its initializer — the same fact, read off the node that carries it.
const variableInitializer = (node) => {
	const init = node.getKind() === SK.VariableDeclaration ? node.getInitializer() : node.getKind() === SK.ExportAssignment ? node.getExpression() : null;
	if (!init) return null;

	const isStaticString = init.getKind() === SK.StringLiteral || init.getKind() === SK.NoSubstitutionTemplateLiteral;

	return {
		is: kindName(init),
		origin: leftmostOrigin(init),
		members: init.getKind() === SK.ObjectLiteralExpression ? memberFacts(init) : [],
		...(isStaticString ? { value: String(init.getLiteralText()) } : {}),
	};
};

// `x as Foo`, `x satisfies Foo`, `<Foo>x` — the assertion is part of what the
// variable IS, and `as const` is the one that changes its shape.
const ASSERTIONS = new Map([
	[SK.AsExpression, "as"],
	[SK.SatisfiesExpression, "satisfies"],
	[SK.TypeAssertionExpression, "asserts"],
]);

const assertionOf = (node) => {
	const init = node.getKind() === SK.VariableDeclaration ? node.getInitializer() : null;
	if (!init) return null;
	// Assertions nest and sit under parentheses, so the outermost one is unwrapped
	// first: `(x as const) satisfies Y` is still an assertion.
	let expr = init;
	while (expr && expr.getKind() === SK.ParenthesizedExpression) expr = expr.getExpression();
	const form = ASSERTIONS.get(expr?.getKind());
	if (!form) return null;
	const typeNode = typeof expr.getTypeNode === "function" ? expr.getTypeNode() : null;
	const text = typeNode ? typeNode.getText() : (expr.getType?.().getText?.() ?? null);

	return { form, type: text, isConst: text === "const" };
};

// `using x = …` / `await using x = …` — the binding is disposed at scope exit.
const isDisposable = (node) => {
	const list = node.getKind() === SK.VariableDeclaration ? node.getParent() : null;
	const flags = typeof list?.getDeclarationKind === "function" ? String(list.getDeclarationKind()) : "";

	return flags === "using" || flags === "await using";
};

module.exports = { variableInitializer, assertionOf, isDisposable };

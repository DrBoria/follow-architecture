"use strict";

// Variable declarations — what a variable is initialised with. That is the whole
// question: whether the binding may be reassigned is `mutable` (ast/tree.js),
// and who may write into the value is the `assign`/`mutate` relation.
//
// Two things the initializer alone cannot say are read here: the ASSERTION on it
// (`as const`, `satisfies X`, `<X>x`) and whether the binding is DISPOSABLE
// (`using x = …`), which runs a `[Symbol.dispose]` at the end of its scope.

import { Node } from "ts-morph";
import { SK, kindName, memberFacts } from "./tree";
import { leftmostOrigin } from "./properties";
import type { LooseNode } from "./loose";
import type { Initializer, Assertion } from "../facts";

// A STATIC STRING keeps its text — a quoted string and a backtick string without
// substitutions are both static. The ONE reading of "a literal's own text",
// shared by the initializer fact below and the CSS facet's class-attribute
// reader (`css/markup`): a class list written as `const cls = "flex p-4"` is a
// declaration list, and the text is the fact that makes it readable.
const literalTextOf = (n: Node): string | null => {
	if (Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n)) return n.getLiteralText();

	return null;
};

// The initializer, in the same shape as `kind.initializer`: the parser's kind of
// the expression, its origin (`t.model(...)` → "t.model"), and — for an object
// literal — raw per-member facts. A STATIC STRING initializer keeps its text
// (`value`) via the shared `literalTextOf` above.
// A published anonymous value (`export default { … }`) has no binding of its
// own: the export assignment IS its declaration, and the expression it exports
// is its initializer — the same fact, read off the node that carries it.
const initOf = (n: LooseNode): Node | null => {
	if (n.getKind() === SK.VariableDeclaration) return n.getInitializer?.() ?? null;
	if (n.getKind() === SK.ExportAssignment) return n.getExpression?.() ?? null;

	return null;
};

const variableInitializer = (node: LooseNode): Initializer | null => {
	const init = initOf(node);
	if (!init) return null;
	const value = literalTextOf(init);

	return {
		is: kindName(init),
		origin: leftmostOrigin(init),
		members: Node.isObjectLiteralExpression(init) ? memberFacts(init) : [],
		...(value !== null ? { value } : {}),
	};
};

// `x as Foo`, `x satisfies Foo`, `<Foo>x` — the assertion is part of what the
// variable IS, and `as const` is the one that changes its shape.
const ASSERTIONS = new Map([
	[SK.AsExpression, "as"],
	[SK.SatisfiesExpression, "satisfies"],
	[SK.TypeAssertionExpression, "asserts"],
]);

const outermost = (n: Node): LooseNode => {
	let expr: LooseNode = n;
	while (Node.isParenthesizedExpression(expr)) expr = expr.getExpression();

	return expr;
};

const typeTextOfExpr = (expr: LooseNode): string | null => {
	const typeNode = expr.getTypeNode?.() ?? null;
	if (typeNode) return typeNode.getText();

	return expr.getType?.().getText?.() ?? null;
};

const assertionOf = (node: LooseNode): Assertion | null => {
	const init = node.getKind() === SK.VariableDeclaration ? node.getInitializer?.() : null;
	if (!init) return null;
	// Assertions nest and sit under parentheses, so the outermost one is unwrapped
	// first: `(x as const) satisfies Y` is still an assertion.
	const expr = outermost(init);
	const form = ASSERTIONS.get(expr.getKind());
	if (!form) return null;
	const text = typeTextOfExpr(expr);

	return { form, type: text, isConst: text === "const" };
};

// `using x = …` / `await using x = …` — the binding is disposed at scope exit.
const isDisposable = (node: LooseNode): boolean => {
	const list: LooseNode | null = node.getKind() === SK.VariableDeclaration ? node.getParent() : null;
	const flags = typeof list?.getDeclarationKind === "function" ? String(list.getDeclarationKind()) : "";

	return flags === "using" || flags === "await using";
};

export { variableInitializer, assertionOf, isDisposable, literalTextOf };

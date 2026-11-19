"use strict";

// The expression walkers a write is read through: what an assignment's left
// side is rooted in (`state.a.b` → `state`), which CALL it is written through
// (`f().x` → `f()`), and whether the root is a local binding of the piece. These
// are the same walks for every producer of a write fact, so they live once.

import { Node, type CallExpression } from "ts-morph";
import { SK } from "./tree";

// The local binding → module map an import produces.
type ImportMap = ReadonlyMap<string, string>;

// The identifier a written expression is rooted in: `state.a.b = …` → `state`.
// `x!` and `(x)` are the same value with extra syntax: unwrap them before asking
// what the expression is rooted in, or `getRootStore()!.level = …` looks rooted in
// nothing at all.
const bare = (node: Node): Node => {
	let n = node;
	while (Node.isNonNullExpression(n) || Node.isParenthesizedExpression(n)) n = n.getExpression();

	return n;
};

// The root of a member chain: `a.b.c` → `a`, `f().x` → `f()`, `this.x` → `this`.
// Both questions below ("what is written to?" and "which call is written
// through?") walk the same access chain, so the walk is written once.
const walkToRoot = (expr: Node): Node => {
	let node = bare(expr);
	while (Node.isPropertyAccessExpression(node) || Node.isElementAccessExpression(node)) node = bare(node.getExpression());

	return node;
};

const rootNodeOf = (expr: Node): Node | null => {
	const node = walkToRoot(expr);

	return Node.isIdentifier(node) ? node : null;
};

const rootNameOf = (expr: Node): string | null => {
	const node = rootNodeOf(expr);

	return node ? node.getText() : null;
};

// The CALL a write lands in: `f().x = …` → `f()`, `f().a.b = …` → `f()`; null
// when the left side is not rooted in a call at all.
const callRootOf = (expr: Node): CallExpression | null => {
	const node = walkToRoot(expr);

	return Node.isCallExpression(node) ? node : null;
};

// Is an assignment's left-hand side a local binding of the enclosing function?
// A property/element access (`state.x = ...`) is local when its BASE object is a
// local binding — writing to a property of a local is still a local mutation.
const isLocalTarget = (lhs: Node, fn: Node): boolean => {
	let base = lhs;
	if (Node.isPropertyAccessExpression(base) || Node.isElementAccessExpression(base)) base = base.getExpression();
	if (!Node.isIdentifier(base)) return false;
	const name = base.getText();
	if (!Node.isFunctionLikeDeclaration(fn)) return false;
	const params = new Set(fn.getParameters().map((p) => p.getName()));
	const locals = new Set(fn.getDescendantsOfKind(SK.VariableDeclaration).map((d) => d.getName()));

	return params.has(name) || locals.has(name);
};

export { bare, walkToRoot, rootNodeOf, rootNameOf, callRootOf, isLocalTarget };
export type { ImportMap };

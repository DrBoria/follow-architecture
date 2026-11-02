"use strict";

// Function-like entities — declaration, expression, arrow, method, accessor.
// What a function RECEIVES, YIELDS, DECLARES and how its body is shaped. Every
// "is it a helper / an action / an entry point?" is a rule's question asked in
// the YAML; nothing here decides.

const { SK, isFunctionNode, unwrapParens, kindName, memberFacts, typeText } = require("./tree");
const { leftmostOrigin } = require("./properties");
const { declaredFileOf } = require("./file");

// The nearest function-like ancestor of a node, or null.
const nearestFunction = (node) => {
	let n = node?.getParent();
	while (n) {
		if (isFunctionNode(n)) return n;
		n = n.getParent();
	}

	return null;
};

// The name a function-like node carries, when it has one. Arrows and function
// expressions take the name of the variable / property / field they are
// assigned to.
const nameOf = (fn) => {
	const k = fn.getKind();
	if (k === SK.FunctionDeclaration || k === SK.MethodDeclaration) return fn.getName() ?? null;
	const p = fn.getParent();
	if (!p) return null;
	const pk = p.getKind();
	if (pk === SK.VariableDeclaration || pk === SK.PropertyAssignment || pk === SK.PropertyDeclaration || pk === SK.PropertySignature) return p.getName() ?? null;

	return null;
};

// ── Returns ─────────────────────────────────────────────────────────────────
// A value a function yields: each `return <expr>;` statement plus, for an
// expression-body function (`() => ({...})`), the expression body itself. A bare
// `return;` / `() => {}` yields no value.
//
//   kind     — where the value comes from: "ReturnStatement" or
//              "ExpressionBody" (synthetic: an arrow's body IS the value,
//              the parser has no return node for it).
//   exprKind — the parser's kind of the yielded expression (null when the
//              function yields no value there).
//   origin   — the origin of the yielded chain (`t.model({})` → "t.model").
//   members  — for an object-literal value: raw per-member facts.
const returnsFact = (node) => {
	const bodyNode = node.getBody();
	const hasExpressionBody = bodyNode != null && bodyNode.getKind() !== SK.Block;
	const returnStatements = node.getDescendantsOfKind(SK.ReturnStatement);
	const returnEntry = (kind, expr) => ({
		kind,
		exprKind: expr ? kindName(expr) : null,
		origin: leftmostOrigin(expr),
		members: expr?.getKind() === SK.ObjectLiteralExpression ? memberFacts(expr) : [],
	});
	const returns = returnStatements.map((r) => returnEntry("ReturnStatement", r.getExpression()));
	if (hasExpressionBody) returns.push(returnEntry("ExpressionBody", unwrapParens(bodyNode)));

	return returns;
};

// ── Parameters ──────────────────────────────────────────────────────────────
// `typeFile` is the file that declares the parameter's TYPE, resolved by the
// checker through imports and aliases — the same answer `writes` uses. That is
// how a role can say "this function receives data from the host layer" without
// naming a folder and without naming a type.
const parametersFact = (node, sf, repoRoot) => {
	const checker = sf.getProject().getTypeChecker();

	return node.getParameters().map((p) => ({
		name: p.getName(),
		type: p.getTypeNode()?.getText() ?? typeText(p),
		typeFile: declaredFileOf(p, checker, repoRoot)?.file ?? null,
	}));
};

module.exports = { nearestFunction, nameOf, returnsFact, parametersFact };

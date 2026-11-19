"use strict";

// Function-like entities — declaration, expression, arrow, method, accessor.
// What a function RECEIVES, YIELDS, DECLARES and how its body is shaped. Every
// "is it a helper / an action / an entry point?" is a rule's question asked in
// the YAML; nothing here decides.

import { Node, type SourceFile, type TypeChecker } from "ts-morph";
import { SK, isFunctionNode, unwrapParens, kindName, memberFacts, typeText } from "./tree";
import { leftmostOrigin } from "./properties";
import { declaredFileOf, declaredFileOfNode } from "./file";
import { dispatchOn } from "../../utils/dispatch";
import type { LooseNode } from "./loose";
import type { ReturnFact, ParameterFact, BindingFact } from "../facts";

// The nearest function-like ancestor of a node, or null.
const nearestFunction = (node: Node): Node | null => {
	let n: Node | undefined = node?.getParent();
	while (n) {
		if (isFunctionNode(n)) return n;
		n = n.getParent();
	}

	return null;
};

// The name a function-like node carries, when it has one. Arrows and function
// expressions take the name of the variable / property / field they are
// assigned to. The reading dispatches on the parser's kind (the shared
// `dispatchOn`): a named kind answers its OWN name — final, even when it has
// none — anything else asks its parent, and only a naming parent's name counts.
const NAMED_KINDS = new Set([SK.FunctionDeclaration, SK.MethodDeclaration]);
const NAME_PARENT_KINDS = new Set([SK.VariableDeclaration, SK.PropertyAssignment, SK.PropertyDeclaration, SK.PropertySignature]);

const ownName = (fn: LooseNode): string | null => fn.getName?.() ?? null;

const parentName = (fn: LooseNode | null | undefined): string | null => {
	const p: LooseNode | undefined = fn?.getParent();
	if (!p || !NAME_PARENT_KINDS.has(p.getKind())) return null;

	return p.getName?.() ?? null;
};

const NAME_READERS = new Map<number, (fn: LooseNode) => string | null>([...NAMED_KINDS].map((kind) => [kind, ownName]));

const nameOf = (fn: LooseNode): string | null => dispatchOn(fn, (node) => node.getKind(), NAME_READERS, parentName);

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
const returnsFact = (node: LooseNode): ReturnFact[] => {
	const bodyNode = node.getBody() ?? null;
	const hasExpressionBody = bodyNode !== null && bodyNode.getKind() !== SK.Block;
	const returnStatements = node.getDescendantsOfKind(SK.ReturnStatement);
	const returnEntry = (kind: string, expr: Node | null): ReturnFact => ({
		kind,
		exprKind: expr ? kindName(expr) : null,
		origin: leftmostOrigin(expr),
		members: expr && Node.isObjectLiteralExpression(expr) ? memberFacts(expr) : [],
	});
	const returns = returnStatements.map((r) => returnEntry("ReturnStatement", r.getExpression() ?? null));
	if (hasExpressionBody && bodyNode) returns.push(returnEntry("ExpressionBody", unwrapParens(bodyNode)));

	return returns;
};

// ── Parameters ──────────────────────────────────────────────────────────────
// `typeFile` is the file that declares the parameter's TYPE, resolved by the
// checker through imports and aliases — the same answer `writes` uses. That is
// how a role can say "this function receives data from the host layer" without
// naming a folder and without naming a type.
//
// A destructured parameter (`{ a, b }`) is ONE parameter whose name is the whole
// pattern, so its FIELDS are listed beside it: each binding answers about its own
// type, and `rest` says a `...args` was handed over rather than a value.
const bindingsOf = (p: LooseNode, checker: TypeChecker, repoRoot: string): BindingFact[] => {
	const nameNode: LooseNode | null = p.getNameNode?.() ?? null;
	const kind = nameNode?.getKindName?.();
	if (kind !== "ObjectBindingPattern" && kind !== "ArrayBindingPattern") return [];

	return (nameNode?.getElements?.() ?? []).map((el) => {
		const typeNode = el.getTypeNode?.() ?? null;

		return { name: el.getName?.() ?? null, type: typeNode ? typeNode.getText() : null, typeFile: typeNode ? (declaredFileOfNode(typeNode, checker, repoRoot)?.file ?? null) : null };
	});
};

const typeTextOfParam = (p: LooseNode): string | null => p.getTypeNode?.()?.getText() ?? typeText(p);
const optionalOf = (p: LooseNode): boolean => (typeof p.isOptional === "function" ? p.isOptional() : false);
const restOf = (p: LooseNode): boolean => (p.getChildrenOfKind?.(SK.DotDotDotToken) ?? []).length > 0;

const parametersFact = (node: LooseNode, sf: SourceFile, repoRoot: string): ParameterFact[] => {
	const checker = sf.getProject().getTypeChecker();

	return (node.getParameters?.() ?? []).map((p) => ({
		name: p.getName?.() ?? "",
		type: typeTextOfParam(p),
		typeFile: declaredFileOf(p, checker, repoRoot)?.file ?? null,
		optional: optionalOf(p),
		rest: restOf(p),
		bindings: bindingsOf(p, checker, repoRoot),
	}));
};

export { nearestFunction, nameOf, returnsFact, parametersFact };

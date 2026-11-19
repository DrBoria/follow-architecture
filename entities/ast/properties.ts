"use strict";

// Property access: what an expression chain is rooted at (`getRoot(self).x` →
// "getRoot"), what member is actually used (`store.doX()` → "doX"), and which
// chains reach state through a configured accessor.

import { Node, type SourceFile } from "ts-morph";
import { SK, nodeText } from "./tree";
import { admitsWhenNoneReject } from "../../utils/gate";
import type { ReadFact } from "../facts";
import type { LooseNode } from "./loose";

// The local binding → module map an import produces.
type ImportMap = ReadonlyMap<string, string>;

// Is this node a "pure property path" — dots only, rooted in an identifier?
// `a.b.c` → true; `arr[0].run` → false (element access); `f().x` → false (call).
const isPurePropertyPath = (node: Node): boolean => {
	const k = node.getKind();
	if (k === SK.Identifier) return true;
	if (Node.isPropertyAccessExpression(node)) return isPurePropertyPath(node.getExpression());

	return false;
};

// The origin of any expression chain — what the expression acts on / is rooted at:
//   `t.model("X", {...})` → `t.model`        (pure property path = the function)
//   `a.b.c()` → `a.b.c`                      (pure property path = the function)
//   `arr[0].run()` → `arr[0]`                (element access → the object)
//   `new F(...)` / `new F({}).create()` → `new F`  (construction → the class)
//   `getRoot(self).store.doAction()` → `getRoot`   (call in chain → the root call)
//   `state` (bare identifier) → `state`
//   `[1,2,3]` (array literal) → null
// The YAML can match any pattern: `origin: { equals: "t.model" }`,
// `origin: { startsWith: "new " }`, `origin: { endsWith: ".run" }`.
const leftmostOrigin = (expr: Node | null): string | null => {
	if (!expr) return null;
	let e: Node | null = expr;
	while (e) {
		if (Node.isCallExpression(e)) {
			const callee = e.getExpression();
			// Pure property path (a.b.c) → the full chain IS the function name.
			if (isPurePropertyPath(callee)) return nodeText(callee);
			// Otherwise (arr[0].run, new F().m, f().x) → recurse into the callee
			// to find the base object.
			e = callee;
			continue;
		}
		if (Node.isNewExpression(e)) return `new ${nodeText(e.getExpression())}`;
		if (Node.isPropertyAccessExpression(e)) {
			const base = e.getExpression();
			if (base.getKind() === SK.Identifier) return nodeText(e);
			e = base;
			continue;
		}
		if (Node.isElementAccessExpression(e)) return nodeText(e);
		if (Node.isIdentifier(e)) return nodeText(e);
		break;
	}

	return null;
};

// The rightmost member name of an expression chain: `store.doX` → "doX",
// `arr[0]` → null. null for a bare identifier (it is its own name).
const lastMemberName = (expr: Node | null): string | null => (expr && Node.isPropertyAccessExpression(expr) ? expr.getName() : null);

// Is this expression `this.x…`? Writing there mutates the instance — the state
// of a component/service/store, in any framework.
const isThisChain = (expr: Node): boolean => {
	let e: Node = expr;
	while (Node.isPropertyAccessExpression(e)) e = e.getExpression();
	return e.getKind() === SK.ThisKeyword;
};

// The module an expression's base identifier was imported from, if any.
const importModuleOf = (expr: Node, importMap?: ImportMap): string | null => {
	let base: Node = expr;
	while (Node.isPropertyAccessExpression(base)) base = base.getExpression();
	if (!Node.isIdentifier(base)) return null;
	return importMap?.get(base.getText()) ?? null;
};

// The module a MEMBER of an expression belongs to: `other.x`, `other().x`,
// `other.a.b` — the receiver is either an imported binding or the result of
// calling one (`requireRootStore().settings`). Null when the receiver is local.
const memberOwnerModule = (expr: Node, importMap?: ImportMap): string | null => {
	let base: Node = expr;
	while (Node.isPropertyAccessExpression(base) || Node.isElementAccessExpression(base)) base = base.getExpression();
	if (Node.isIdentifier(base)) return importMap?.get(base.getText()) ?? null;
	if (Node.isCallExpression(base)) return importModuleOf(base.getExpression(), importMap);
	return null;
};

// Is this member access the WHOLE expression on its side — not the inner hop of
// a longer chain, not the callee of a call (that is `call`), not the target of a
// write (that is `mutate`)? Only the outermost access becomes one `read` edge;
// otherwise `store.a.b.c` would be three.
const isInnerHop = (parent: Node, node: Node): boolean => {
	if (Node.isPropertyAccessExpression(parent) || Node.isElementAccessExpression(parent)) return parent.getExpression() === node;
	if (Node.isCallExpression(parent)) return parent.getExpression() === node;

	return false;
};

const isWholeRead = (node: Node): boolean => {
	const parent = node.getParent();
	if (!parent) return true;
	// The decision ("a read when none of the write/inner-hop verdicts fires") is
	// the shared gate; the verdicts are the AST's own.
	const isWriteTarget = (p: Node): boolean =>
		(Node.isBinaryExpression(p) && p.getLeft() === node) ||
		Node.isDeleteExpression(p) ||
		((Node.isPrefixUnaryExpression(p) || Node.isPostfixUnaryExpression(p)) && p.getOperand() === node);

	return admitsWhenNoneReject(parent, [(p) => isInnerHop(p, node), isWriteTarget]);
};

// Every member of ANOTHER module this file looks at: `requireRootStore().settings`,
// `Settings.debug`, `host.workspace`. Reads are what a view does, so they are a
// relation of their own — "may read the store" is a permission a role needs, and
// calling it a use made the permission impossible to state.
// The named declaration a node sits in — a function or a variable, the piece of
// code a role belongs to. Null at module level, where the file itself is the
// only thing there is.
const FUNCTION_PIECE_KINDS = new Set([SK.FunctionDeclaration, SK.ArrowFunction, SK.FunctionExpression, SK.MethodDeclaration]);

const enclosingPiece = (node: Node): string | null => {
	let cur: LooseNode | undefined = node.getParent();
	while (cur) {
		const kind = cur.getKind();
		if (FUNCTION_PIECE_KINDS.has(kind) || kind === SK.VariableDeclaration) {
			const name = cur.getName?.() ?? null;
			if (name) return name;
		}
		cur = cur.getParent?.();
	}
	return null;
};

const readsFact = (sf: SourceFile, importMap?: ImportMap): ReadFact[] => {
	const out: ReadFact[] = [];
	for (const node of sf.getDescendants()) {
		if (!Node.isPropertyAccessExpression(node) && !Node.isElementAccessExpression(node)) continue;
		if (!isWholeRead(node)) continue;
		const module = memberOwnerModule(node, importMap);
		if (!module) continue;
		out.push({ module, what: nodeText(node), line: node.getStartLineNumber(), piece: enclosingPiece(node) });
	}
	return out;
};

export { isPurePropertyPath, leftmostOrigin, lastMemberName, isThisChain, importModuleOf, readsFact, enclosingPiece };

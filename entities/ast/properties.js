"use strict";

// Property access: what an expression chain is rooted at (`getRoot(self).x` →
// "getRoot"), what member is actually used (`store.doX()` → "doX"), and which
// chains reach state through a configured accessor.

const { SK, nodeText } = require("./tree");

// Is this node a "pure property path" — dots only, rooted in an identifier?
// `a.b.c` → true; `arr[0].run` → false (element access); `f().x` → false (call).
const isPurePropertyPath = (node) => {
	const k = node.getKind();
	if (k === SK.Identifier) return true;
	if (k === SK.PropertyAccessExpression) return isPurePropertyPath(node.getExpression());

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
const leftmostOrigin = (expr) => {
	if (!expr) return null;
	let e = expr;
	while (e) {
		const ek = e.getKind();
		if (ek === SK.CallExpression) {
			const callee = e.getExpression();
			// Pure property path (a.b.c) → the full chain IS the function name.
			if (isPurePropertyPath(callee)) return nodeText(callee);
			// Otherwise (arr[0].run, new F().m, f().x) → recurse into the callee
			// to find the base object.
			e = callee;
			continue;
		}
		if (ek === SK.NewExpression) return `new ${nodeText(e.getExpression())}`;
		if (ek === SK.PropertyAccessExpression) {
			const base = e.getExpression();
			if (base.getKind() === SK.Identifier) return nodeText(e);
			e = base;
			continue;
		}
		if (ek === SK.ElementAccessExpression) return nodeText(e);
		if (ek === SK.Identifier) return nodeText(e);
		break;
	}

	return null;
};

// The rightmost member name of an expression chain: `store.doX` → "doX",
// `arr[0]` → null. null for a bare identifier (it is its own name).
const lastMemberName = (expr) => (expr && expr.getKind() === SK.PropertyAccessExpression ? expr.getName() : null);

// Is this expression `this.x…`? Writing there mutates the instance — the state
// of a component/service/store, in any framework.
const isThisChain = (expr) => {
	let e = expr;
	while (e && e.getKind() === SK.PropertyAccessExpression) e = e.getExpression();
	return Boolean(e && e.getKind() === SK.ThisKeyword);
};

// The module an expression's base identifier was imported from, if any.
const importModuleOf = (expr, importMap) => {
	let base = expr;
	while (base && base.getKind() === SK.PropertyAccessExpression) base = base.getExpression();
	if (!base || base.getKind() !== SK.Identifier) return null;
	return importMap?.get(base.getText()) ?? null;
};

// The module a MEMBER of an expression belongs to: `other.x`, `other().x`,
// `other.a.b` — the receiver is either an imported binding or the result of
// calling one (`requireRootStore().settings`). Null when the receiver is local.
const memberOwnerModule = (expr, importMap) => {
	let base = expr;
	while (base && (base.getKind() === SK.PropertyAccessExpression || base.getKind() === SK.ElementAccessExpression)) base = base.getExpression();
	if (!base) return null;
	if (base.getKind() === SK.Identifier) return importMap?.get(base.getText()) ?? null;
	if (base.getKind() === SK.CallExpression) return importModuleOf(base.getExpression(), importMap);
	return null;
};

// Is this member access the WHOLE expression on its side — not the inner hop of
// a longer chain, not the callee of a call (that is `call`), not the target of a
// write (that is `mutate`)? Only the outermost access becomes one `read` edge;
// otherwise `store.a.b.c` would be three.
const isWholeRead = (node) => {
	const parent = node.getParent();
	if (!parent) return true;
	const kind = parent.getKind();
	if ((kind === SK.PropertyAccessExpression || kind === SK.ElementAccessExpression) && parent.getExpression() === node) return false;
	if (kind === SK.CallExpression && parent.getExpression() === node) return false;
	if (kind === SK.BinaryExpression && parent.getLeft() === node) return false;
	if (kind === SK.DeleteExpression) return false;
	if ((kind === SK.PrefixUnaryExpression || kind === SK.PostfixUnaryExpression) && parent.getOperand() === node) return false;
	return true;
};

// Every member of ANOTHER module this file looks at: `requireRootStore().settings`,
// `Settings.debug`, `host.workspace`. Reads are what a view does, so they are a
// relation of their own — "may read the store" is a permission a role needs, and
// calling it a use made the permission impossible to state.
// The named declaration a node sits in — a function or a variable, the piece of
// code a role belongs to. Null at module level, where the file itself is the
// only thing there is.
const enclosingPiece = (node) => {
	for (let cur = node.getParent(); cur; cur = cur.getParent()) {
		const kind = cur.getKind();
		if (kind === SK.FunctionDeclaration || kind === SK.ArrowFunction || kind === SK.FunctionExpression || kind === SK.MethodDeclaration) {
			const name = cur.getName?.() ?? null;
			if (name) return name;
		}
		if (kind === SK.VariableDeclaration) {
			const name = cur.getName?.() ?? null;
			if (name) return name;
		}
	}
	return null;
};

const readsFact = (sf, importMap) => {
	const out = [];
	for (const node of sf.getDescendants()) {
		const kind = node.getKind();
		if (kind !== SK.PropertyAccessExpression && kind !== SK.ElementAccessExpression) continue;
		if (!isWholeRead(node)) continue;
		const module = memberOwnerModule(node, importMap);
		if (!module) continue;
		out.push({ module, what: nodeText(node), line: node.getStartLineNumber(), piece: enclosingPiece(node) });
	}
	return out;
};

module.exports = { isPurePropertyPath, leftmostOrigin, lastMemberName, isThisChain, importModuleOf, readsFact, enclosingPiece };

"use strict";

// Call expressions — `f()`, `new F()`, ``tag`…` ``. One entity for all three
// shapes: what is called, what it acts on, which module it comes from, and
// whether it hands the caller's own parameters straight through.

const { SK, kindName, isCallNode } = require("./tree");
const { isPurePropertyPath, leftmostOrigin, lastMemberName } = require("./properties");

// Every call the candidate makes:
//   kind       — the parser's kind of the call node
//   origin     — the origin of the called chain (`store.doX()` → "store",
//                `new F()` → "new F", `t.model(...)` → "t.model"); null when
//                the chain has no identifier root
//   action     — the member actually invoked (`doX` in `store.doX()`), or the
//                full expression text for a bare-identifier call
//   module     — the module the callee resolves to: for a bare identifier the
//                import it came from, for a member access the module of the
//                origin object
//   target     — `{ path, name }` when the call names an imported SYMBOL
const callsFact = (node, importMap) =>
	node
		.getDescendants()
		.filter(isCallNode)
		.map((c) => {
			const expr = c.getKind() === SK.TaggedTemplateExpression ? c.getTag() : c.getExpression();
			let module = null;
			if (expr) {
				let base = expr;
				while (base.getKind() === SK.PropertyAccessExpression) base = base.getExpression();
				if (base.getKind() === SK.Identifier) module = importMap.get(base.getText()) ?? null;
			}
			// origin = the base of the chain, action = the member actually invoked:
			// `store.doX()` → origin "store", action "doX";
			// `getRoot(self).store.doAction()` → origin "getRoot", action "doAction";
			// `new F()` → origin "new F", action "F".
			let origin, action;
			if (isPurePropertyPath(expr)) {
				const chain = expr.getText().split(".");
				origin = chain[0];
				action = chain[chain.length - 1];
			} else {
				origin = leftmostOrigin(expr);
				action = lastMemberName(expr) ?? expr.getText();
			}
			// `target` addresses the callee the same way `location` addresses
			// anything else in the architecture: `{ path }` is the module the symbol
			// was imported from, so a filter can say
			// `calls: { some: { target: { location: { node: "…" } } } }`.
			// Only a bare-identifier call names an imported SYMBOL; a member call
			// (`store.doX()`) names a property of an object, so its module says
			// nothing about where the member is declared.
			const target = module && origin === action ? { path: module, name: action } : null;

			return { kind: kindName(c), origin, action, module, target, receiverOnly: isReceiverOnly(c), bare: origin === action };
		});

// Is the call's RESULT used only as the object of a member access — `f().x`,
// `f()[i]`? Then the call is the RECEIVER of a read, not a use of its own:
// `requireRootStore().settings` reads `settings`, it does not call anything of
// the store's. Without this flag one line produced two edges to the same file.
const isReceiverOnly = (call) => {
	const parent = call.getParent();
	if (!parent) return false;
	const kind = parent.getKind();
	if (kind !== SK.PropertyAccessExpression && kind !== SK.ElementAccessExpression) return false;
	return parent.getExpression() === call;
};

module.exports = { callsFact };

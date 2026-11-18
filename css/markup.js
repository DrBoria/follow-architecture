"use strict";

// The class ATTRIBUTE of an element, whatever the framework calls it:
// `className` in React, `class` in Vue/Angular/HTML. The reading belongs to CSS —
// a class list is a declaration list written in a string — so the whole facet
// shares it: `frameworks/*` says which element is which, this says what it is
// styled with.
//
// Only a STATIC string is a declaration list. `{cn(...)}` is code, and guessing at
// it would invent facts.

const { SK } = require("../entities/ast/tree");
const { classAttributes } = require("../frameworks");
const { hostOf } = require("./index");
const { classFacts } = require("./tailwind");

// Every opening element, whichever spelling it uses. WHICH attribute holds the
// class list is the framework's own answer (`frameworks.*`), and "the value is a
// plain string" is the parser's (`getLiteralText` exists) — nothing here spells a
// framework's attribute name or compares kind numbers by hand.
//
// A class list may also be WRITTEN ONCE and named: `const cls = "flex p-4"` then
// `className={cls}`. That is still a static declaration list — the binding's
// initializer is a string literal the AST already recorded (`kind.initializer.
// value`), so the reading follows the NAME to the text instead of guessing at
// code. Only a same-file, module-scope, never-reassigned string binding is
// followed; `{cn(...)}`, a ternary, a reassigned `let` stay unread.
const staticStringOf = (candidates, expr) => {
	if (!expr || expr.getKind() !== SK.Identifier) return null;
	const name = expr.getText();
	const binding = (candidates ?? []).find((c) => c.name === name && c.kind?.own?.is === "VariableDeclaration" && !c.location?.nested);
	if (!binding || binding.mutable) return null;
	const value = binding.kind?.initializer?.value;
	return typeof value === "string" ? value : null;
};

const attachClasses = (candidates, { sf }) => {
	const names = classAttributes();

	for (const attribute of sf.getDescendantsOfKind(SK.JsxAttribute)) {
		const name = attribute.getNameNode?.()?.getText?.() ?? "";
		if (!names.has(name)) continue;

		// Only a static literal is a declaration list; `{cn(...)}` is code and
		// guessing at it would invent facts. A `{name}` expression is read only
		// when it resolves to a static string binding of this file.
		const initializer = attribute.getInitializer?.();
		let literal = typeof initializer?.getLiteralText === "function" ? initializer.getLiteralText() : null;
		if (!literal && initializer?.getKind() === SK.JsxExpression) {
			literal = staticStringOf(candidates, initializer.getExpression());
		}
		if (!literal) continue;

		const host = hostOf(candidates, attribute.getStartLineNumber?.() ?? null);
		if (!host) continue;

		host.css = host.css ?? {};
		// The attribute's own line travels with every class it carries: a report
		// can point at the exact line the class list is written on.
		const line = attribute.getStartLineNumber?.() ?? null;
		host.css.classes = [...(host.css.classes ?? []), ...classFacts(literal).map((fact) => ({ ...fact, line }))];
	}

	return candidates;
};

module.exports = { attachClasses };

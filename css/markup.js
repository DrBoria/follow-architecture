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
const attachClasses = (candidates, { sf }) => {
	const names = classAttributes();

	for (const attribute of sf.getDescendantsOfKind(SK.JsxAttribute)) {
		const name = attribute.getNameNode?.()?.getText?.() ?? "";
		if (!names.has(name)) continue;

		// Only a static literal is a declaration list; `{cn(...)}` is code and
		// guessing at it would invent facts.
		const initializer = attribute.getInitializer?.();
		const literal = typeof initializer?.getLiteralText === "function" ? initializer.getLiteralText() : null;
		if (!literal) continue;

		const host = hostOf(candidates, attribute.getStartLineNumber?.() ?? null);
		if (!host) continue;

		host.css = host.css ?? {};
		host.css.classes = [...(host.css.classes ?? []), ...classFacts(literal)];
	}

	return candidates;
};

module.exports = { attachClasses };

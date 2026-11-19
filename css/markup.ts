"use strict";

// The class ATTRIBUTE of an element, whatever the framework calls it:
// `className` in React, `class` in Vue/Angular/HTML. The reading belongs to CSS —
// a class list is a declaration list written in a string — so the whole facet
// shares it: `frameworks/*` says which element is which, this says what it is
// styled with.
//
// Only a STATIC string is a declaration list. `{cn(...)}` is code, and guessing at
// it would invent facts.

import { Node, type SourceFile, type JsxAttribute } from "ts-morph";
import { SK } from "../entities/ast/tree";
import { literalTextOf } from "../entities/ast/variables";
import type { Candidate } from "../entities/facts";
import { classAttributes } from "../frameworks";
import { resolveReference } from "../utils/resolve";
import { dispatchOn } from "../utils/dispatch";
import { hostOf } from "./host";
import { classFacts } from "./tailwind";

// A class list may be WRITTEN ONCE and named: `const cls = "flex p-4"` then
// `className={cls}`. That is still a static declaration list — the binding's
// initializer is a string literal the AST already recorded, so the reading
// follows the NAME to the text instead of guessing at code. The walk is the
// shared `resolveReference`; the table (this file's candidates) and the verdicts
// (a module-scope, never-reassigned string binding) are this reader's own.
const staticStringOf = (candidates: readonly Candidate[], expr: Node | undefined): string | null => {
	if (!expr || !Node.isIdentifier(expr)) return null;

	return resolveReference(
		expr.getText(),
		(name) => candidates.find((c) => c.name === name && c.kind?.own?.is === "VariableDeclaration" && !c.location?.nested),
		(binding) => {
			if (binding.mutable) return null;
			const value = binding.kind?.initializer?.value;

			return typeof value === "string" ? value : null;
		},
	);
};

// The attribute's value as a declaration list, dispatched on the parser's kind
// (the shared dispatch): a literal initializer is read by the AST's ONE
// literal-text reading (`literalTextOf` — a quoted string and a backtick string
// without substitutions are both static); a `{name}` expression is read only
// when it resolves to a static string binding of this file. `{cn(...)}`, a
// ternary, a reassigned `let` stay unread — guessing at code would invent facts.
const classLiteralOf = (candidates: readonly Candidate[], attribute: JsxAttribute): string | null => {
	const readers = new Map<number, (node: Node) => string | null>([
		[SK.StringLiteral, literalTextOf],
		[SK.NoSubstitutionTemplateLiteral, literalTextOf],
		[SK.JsxExpression, (node) => (Node.isJsxExpression(node) ? staticStringOf(candidates, node.getExpression()) : null)],
	]);

	return dispatchOn<Node, number, string | null>(attribute.getInitializer(), (node) => node.getKind(), readers, () => null);
};

// Attach one class list to the piece that declares it. The attribute's own line
// travels with every class it carries: a report can point at the exact line the
// class list is written on.
const attachClassList = (candidates: readonly Candidate[], attribute: JsxAttribute, literal: string): void => {
	const line = attribute.getStartLineNumber();
	const host = hostOf(candidates, line);
	if (!host) return;
	host.css = host.css ?? {};
	host.css.classes = [...(host.css.classes ?? []), ...classFacts(literal).map((fact) => ({ ...fact, line }))];
};

// Every opening element, whichever spelling it uses. WHICH attribute holds the
// class list is the framework's own answer (`frameworks.*`); nothing here spells
// a framework's attribute name.
const attachClasses = (candidates: Candidate[], { sf }: { sf: SourceFile }): Candidate[] => {
	const names = classAttributes();
	for (const attribute of sf.getDescendantsOfKind(SK.JsxAttribute)) {
		if (!names.has(attribute.getNameNode().getText())) continue;
		const literal = classLiteralOf(candidates, attribute);
		if (!literal) continue;
		attachClassList(candidates, attribute, literal);
	}

	return candidates;
};

export { attachClasses };

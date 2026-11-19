"use strict";

// The DOCUMENT reader: one postcss walk shared by every syntax. It is a FUNCTION
// of a `parse`, not a class — `.css`, `.scss`, a styled-components template after
// substitution, and anything added later differ only in the parser handed in.
//
// What it produces is the fact set a rule queries:
//   rules        selector (text + parsed AST), line, parent at-rule, the comment
//                above it, and the ORDER (`index`, `prev`, `next`) — order is a
//                fact, "must be sorted" is a policy written in the config
//   declarations prop, value, line, !important, the rule it belongs to, the
//                comment above it, the value's literals/vars/exprs, and the order
//   comments     every comment in the document, with its line
//   leading      the comment block immediately above the first node — the `@file`
//                style doc a stylesheet is expected to carry
//
// Nothing here knows about Tailwind, themes, or the architecture.

import * as postcss from "postcss";
import type { Root, Rule, Declaration, Comment, Node } from "postcss";
import selectorParser from "postcss-selector-parser";
import { classifyValue, type ValueParts } from "./values";
import { notice } from "../report/notices";
import { reasonOf } from "../utils/reason";
import { readOrFallback } from "../utils/try-read";
import type { TemplateExpr, CommentFact } from "./facts";

// A parser handed in by a syntax provider; the default reads plain CSS.
type ParseFn = (text: string) => Root;
const defaultParse: ParseFn = (text) => postcss.parse(text, { from: undefined });

// The comment immediately above a node, or null. `prev()` answers the node's own
// sibling; only a comment is a doc, anything else is code.
const commentAbove = (node: Node): CommentFact | null => {
	const prev = node.prev();
	if (!prev || prev.type !== "comment") return null;
	const comment: Comment = prev;

	return { text: comment.text, line: comment.source?.start?.line ?? null };
};

// One ordered item: a rule (keyed by selector) or a declaration (keyed by prop),
// plus its position among its siblings. `index`/`prev`/`next` are the ORDER facts.
type Ordered = { key: string | null; index?: number; prev?: string | null; next?: string | null };

const keyOf = (item: Ordered): string | null => item.key;

// Stamp the order facts onto a list, in place: each item learns its index and the
// keys of its neighbours. The list is the producer's own, freshly built.
const addOrder = <T extends Ordered>(list: T[]): T[] => {
	for (let index = 0; index < list.length; index += 1) {
		const item = list[index];
		item.index = index;
		item.prev = index > 0 ? keyOf(list[index - 1]) : null;
		item.next = index < list.length - 1 ? keyOf(list[index + 1]) : null;
	}

	return list;
};

// A document the parser rejects is not read at all — and the reader is told
// which one, so "no declarations found" never passes for a clean file. The
// guarded read is the shared one; the notice is this reader's own voice.
const parseOf = (text: string, parse?: ParseFn): Root | null =>
	readOrFallback(text, parse ?? defaultParse, null, (e) => {
		notice("a CSS document could not be parsed", reasonOf(e));
	});

// One parsed selector of a rule: its text and how many nodes it holds.
type SelectorFact = { text: string; nodes: number };

const selectorFacts = (selector: string): SelectorFact[] => {
	const parsed: SelectorFact[] = [];
	try {
		selectorParser((selectors) => {
			selectors.each((one) => {
				parsed.push({ text: String(one), nodes: one.nodes.length });
			});
		}).processSync(selector);
	} catch (error) {
		// A selector we cannot READ is still a selector: text only, and the reason
		// is reported.
		const e: { message?: string } = error;
		notice(`the selector \`${selector}\` could not be read`, reasonOf(e));
	}

	return parsed;
};

// A declaration value can quote TypeScript: `${({ theme }) => theme.colors.section}`.
// It is not part of the CSS text, so the link is made by POSITION: the
// substitution leaves the SAME NUMBER OF CHARACTERS where the expression was
// (blanks), so a declaration's own source offsets still point at the place the
// expression occupies. No marker is written into the value, and no line is
// guessed.
const readsIn = (exprs: readonly TemplateExpr[], from: number, to: number): TemplateExpr[] =>
	exprs.filter((expr) => expr.offset >= from && expr.offset < to);

// The container a rule sits in, as a fact: an at-rule reports its name (`media`,
// `supports`), anything else its own type. No word compared.
const parentOf = (rule: Rule): { type: string; name: string | null } | null => {
	const parent = rule.parent;
	if (!parent) return null;
	const name = "name" in parent ? parent.name : null;

	return { type: parent.type, name };
};

// One rule, as a fact.
type RuleFact = Ordered & {
	selector: string;
	selectors: SelectorFact[];
	line: number | null;
	comment: CommentFact | null;
	parent: { type: string; name: string | null } | null;
};

const ruleFact = (rule: Rule): RuleFact => ({
	key: rule.selector,
	selector: rule.selector,
	selectors: selectorFacts(rule.selector),
	line: rule.source?.start?.line ?? null,
	comment: commentAbove(rule),
	parent: parentOf(rule),
});

// One declaration, as a fact: the value reader's whole answer, spread whole, plus
// what only this reader knows — the rule it belongs to and what the value QUOTES.
type DeclarationFact = Ordered &
	ValueParts & {
		prop: string;
		value: string;
		line: number | null;
		important: boolean;
		rule: string | null;
		comment: CommentFact | null;
		reads: TemplateExpr[];
		parsed: boolean;
	};

// The rule a declaration belongs to, or null when it sits at the document root.
const ruleOf = (decl: Declaration): string | null => (decl.parent?.type === "rule" ? decl.parent.selector : null);

// The declaration's own span in the (elided) text — the same offsets the
// expressions were recorded at.
const spanOf = (decl: Declaration): { from: number; to: number } => {
	const from = decl.source?.start?.offset ?? 0;
	const to = decl.source?.end?.offset ?? from;

	return { from, to };
};

const declarationFact = (decl: Declaration, exprs: readonly TemplateExpr[]): DeclarationFact => {
	const value = String(decl.value);
	const line = decl.source?.start?.line ?? null;
	const classification = classifyValue(value, line);
	const { from, to } = spanOf(decl);

	return {
		key: decl.prop,
		prop: decl.prop,
		value,
		line,
		important: Boolean(decl.important),
		rule: ruleOf(decl),
		comment: commentAbove(decl),
		...classification,
		reads: readsIn(exprs, from, to),
	};
};

// The options a syntax provider hands the document reader.
type DocumentOptions = { exprs?: TemplateExpr[]; parse?: ParseFn; syntax?: string };

// THE document fact set — the base shape every syntax provider produces. A
// multi-producer contract, so it stays explicit; a provider that enriches it
// (SCSS's variables/mixins) returns a wider type.
type DocumentFacts = {
	syntax: string;
	parsed: boolean;
	rules: RuleFact[];
	declarations: DeclarationFact[];
	comments: CommentFact[];
	leading: CommentFact | null;
	literals: (ValueParts["literals"][number] & { prop: string })[];
	vars: string[];
	exprs: TemplateExpr[];
};

const documentFacts = (text: string, { exprs = [], parse, syntax = "css" }: DocumentOptions = {}): DocumentFacts => {
	const root = parseOf(text, parse);
	const quoted = exprs ?? [];

	// A document the parser REJECTS is not CSS: the facts are empty, and `parsed`
	// says so. Reading it anyway would report declarations nobody wrote.
	if (!root) {
		return { syntax, parsed: false, rules: [], declarations: [], comments: [], leading: null, literals: [], vars: [], exprs: quoted };
	}

	const comments: CommentFact[] = [];
	root.walkComments((comment) => {
		comments.push({ text: comment.text, line: comment.source?.start?.line ?? null });
	});

	const rules: RuleFact[] = [];
	root.walkRules((rule) => {
		rules.push(ruleFact(rule));
	});

	const declarations: DeclarationFact[] = [];
	const literals: (ValueParts["literals"][number] & { prop: string })[] = [];
	const vars: string[] = [];
	root.walkDecls((decl) => {
		const fact = declarationFact(decl, quoted);
		declarations.push(fact);
		literals.push(...fact.literals.map((literal) => ({ ...literal, prop: decl.prop })));
		vars.push(...fact.vars);
	});

	return {
		syntax,
		parsed: true,
		rules: addOrder(rules),
		declarations: addOrder(declarations),
		comments,
		leading: comments[0] ?? null,
		literals,
		vars: [...new Set(vars)],
		exprs: quoted,
	};
};

export { documentFacts, defaultParse, commentAbove, addOrder, selectorFacts };
export type { DocumentFacts, DocumentOptions, ParseFn, RuleFact, DeclarationFact, SelectorFact };

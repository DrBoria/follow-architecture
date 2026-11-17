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

const postcss = require("postcss");
const { classifyValue } = require("./values");
const { notice } = require("../report/notices");

const defaultParse = (text) => postcss.parse(text, { from: undefined });

const commentAbove = (node) => {
	const prev = node.prev?.();
	if (!prev || prev.type !== "comment") return null;

	return { text: prev.text, line: prev.source?.start?.line ?? null };
};

const keyOf = (item) => item.key ?? item.prop ?? null;

const addOrder = (list) => {
	for (let index = 0; index < list.length; index += 1) {
		const item = list[index];
		item.index = index;
		item.prev = index > 0 ? keyOf(list[index - 1]) : null;
		item.next = index < list.length - 1 ? keyOf(list[index + 1]) : null;
	}

	return list;
};

const parseOf = (text, parse) => {
	try {
		return (parse ?? defaultParse)(text);
	} catch (error) {
		// A document the parser rejects is not read at all — and the reader is told
		// which one, so "no declarations found" never passes for a clean file.
		notice("a CSS document could not be parsed", error && error.message ? error.message : String(error));

		return null;
	}
};

const selectorFacts = (selector) => {
	const parsed = [];
	try {
		require("postcss-selector-parser")((selectors) => {
			selectors.each((one) => parsed.push({ text: String(one), nodes: one.nodes.length }));
		}).processSync(selector);
	} catch (error) {
		// A selector we cannot READ is still a selector: text only, and the reason
		// is reported.
		notice(`the selector \`${selector}\` could not be read`, error && error.message ? error.message : String(error));
	}

	return parsed;
};

// A declaration value can quote TypeScript: `${({ theme }) => theme.colors.section}`.
// It is not part of the CSS text, so the link is made by POSITION: the
// substitution leaves the SAME NUMBER OF CHARACTERS where the expression was
// (blanks), so a declaration's own source offsets still point at the place the
// expression occupies. No marker is written into the value, and no line is
// guessed.
const readsIn = (exprs, from, to) =>
	(exprs ?? []).filter((expr) => expr.offset != null && expr.offset >= from && expr.offset < to);

const documentFacts = (text, { exprs = [], parse, syntax = "css" } = {}) => {
	const root = parseOf(text, parse);

	const rules = [];
	const declarations = [];
	const comments = [];
	const literals = [];
	const vars = [];

	// A document the parser REJECTS is not CSS: the facts are empty, and `parsed`
	// says so. Reading it anyway would report declarations nobody wrote.
	if (!root) {
		return { syntax, parsed: false, rules: [], declarations: [], comments: [], leading: null, literals: [], vars: [], exprs: exprs ?? [] };
	}

	root.walkComments((comment) => {
		comments.push({ text: comment.text, line: comment.source?.start?.line ?? null });
	});

	root.walkRules((rule) => {
		rules.push({
			key: rule.selector,
			selector: rule.selector,
			selectors: selectorFacts(rule.selector),
			line: rule.source?.start?.line ?? null,
			comment: commentAbove(rule),
			// Whatever the parser says the container is: an at-rule reports its name
			// (`media`, `supports`), anything else its own type. No word compared.
			parent: rule.parent ? { type: rule.parent.type, name: rule.parent.name ?? null } : null,
		});
	});

	root.walkDecls((decl) => {
		const value = String(decl.value);
		const line = decl.source?.start?.line ?? null;
		const classification = classifyValue(value, line);
		// The declaration's own span in the (elided) text — the same offsets the
		// expressions were recorded at.
		const from = decl.source?.start?.offset ?? 0;
		const to = decl.source?.end?.offset ?? from;
		declarations.push({
			key: decl.prop,
			prop: decl.prop,
			value,
			line,
			important: Boolean(decl.important),
			rule: decl.parent?.type === "rule" ? decl.parent.selector : null,
			comment: commentAbove(decl),
			// Everything the VALUE reader answered, as it answered it (`parsed`, and the
			// literals/vars/functions that follow from it) — one shape, spread whole.
			...classification,
			// …plus the one thing only this reader knows: what the value QUOTES.
			reads: readsIn(exprs, from, to),
		});
		literals.push(...classification.literals.map((literal) => ({ ...literal, prop: decl.prop })));
		vars.push(...classification.vars);
	});

	return {
		syntax,
		rules: addOrder(rules),
		declarations: addOrder(declarations),
		comments,
		leading: comments[0] ?? null,
		literals,
		vars: [...new Set(vars)],
		exprs: exprs ?? [],
	};
};

module.exports = { documentFacts, defaultParse, commentAbove, addOrder, selectorFacts };

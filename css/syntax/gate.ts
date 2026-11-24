"use strict";

// The CONTENT GATE: is a substituted template's text CSS at all? The question
// belongs to the syntax that reads CSS — the grammar's own property dictionary
// is the vocabulary, not a list of tag names — so it lives with the `css`
// provider. A template whose text is SQL, GraphQL, JSON or prose is rejected by
// this reading, whatever its tag is called; a `$var` is another syntax's
// declaration, not a CSS property.

import type { Root } from "postcss";
import { cssTree } from "../core/css-tree";
import { admitsWhenNoneReject } from "../../utils/gate";
import { readOrFallback } from "../../utils/try-read";
import { readWhen } from "../../utils/read-when";
import { byId } from "./index";

// A property is CSS when the grammar knows it: a custom property (`--x`), or a
// name (vendor prefix and hack stripped by the parser) in css-tree's dictionary.
const knownProperty = (raw: string): boolean => {
	if (/^--[\w-]+$/.test(raw)) return true;
	if (raw.startsWith("$")) return false;
	try {
		const parsed = cssTree.property(raw);
		if (parsed.custom) return true;
		const properties = cssTree.lexer.properties ?? {};

		return Object.hasOwn(properties, parsed.basename);
	} catch {
		return false;
	}
};

// What one document walk counts: the structure, and how much of it the grammar
// recognises. An empty selector, or one opening with a brace/quote/bracket, is a
// data format's block (JSON, an INI section) — not a CSS selector.
const shapeOf = (root: Root): { declarations: number; known: number; rules: number; badSelector: number } => {
	const shape = { declarations: 0, known: 0, rules: 0, badSelector: 0 };
	root.walkDecls((decl) => {
		shape.declarations += 1;
		if (knownProperty(decl.prop)) shape.known += 1;
	});
	root.walkRules((rule) => {
		shape.rules += 1;
		const selector = String(rule.selector ?? "").trim();
		if (!selector || /^[[{"']/.test(selector)) shape.badSelector += 1;
	});

	return shape;
};

// The counted shape — derived from its ONE producer.
type DocumentShape = ReturnType<typeof shapeOf>;

// The verdicts over the counted shape: nothing structured is not a stylesheet
// (an empty template, a comment); a data-format selector is another language;
// declarations the grammar does not know at all (YAML, a variable-only SCSS
// fragment) are a different syntax's business, not this facet's. The decision
// ("admit when none rejects") is the shared gate; the verdicts are CSS's own.
const noStructure = ({ declarations, rules }: DocumentShape): boolean => !declarations && !rules;
const hasBadSelector = ({ badSelector }: DocumentShape): boolean => badSelector > 0;
const noKnownProperty = ({ declarations, known }: DocumentShape): boolean => declarations > 0 && known === 0;

const isCssShape = (shape: DocumentShape): boolean => admitsWhenNoneReject(shape, [noStructure, hasBadSelector, noKnownProperty]);

// One document's parse: the shared guarded read (a text the parser rejects is
// simply not CSS — silence, because a SQL template reaching here is normal).
const parseOrNull = (text: string): Root | null => {
	const provider = byId("css");
	if (!provider) return null;

	return readOrFallback(text, provider.parse, null);
};

// A document is read only when it parsed — the shared qualified read; the
// shape verdicts are CSS's own. The registered `css` provider does the parsing,
// so a consumer that replaces the provider replaces the gate's reading too.
const isCssDocument = (text: string): boolean => {
	const root = parseOrNull(text);

	return readWhen(root, (parsed) => parsed !== null, (parsed) => isCssShape(shapeOf(parsed)), false);
};

export { isCssDocument };

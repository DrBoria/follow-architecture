"use strict";

// One VALUE, as the parser sees it — no vocabulary of ours anywhere.
//
// css-tree knows the CSS value grammar, so a node's TYPE is the fact: a `Dimension`
// is a number with a unit, a `Hash` is a `#…` token, a `Function` is a call whose
// NAME is reported as written (`rgb`, `clamp`, `color-mix`, `light-dark`, a
// project's own `hex(…)`). This file has no list of colour or math functions to
// fall behind: whether a call paints a colour, does arithmetic or is somebody's
// SCSS helper is a question for the architecture config, which filters by `name`.
//
// SCSS is NOT CSS: `$gap`, `#{$gap}`, `math.div($a, 2)`, `map-get($m, k)` do not
// parse as a CSS value at all. Returning nothing for them would say "this value
// has no literals", which is a LIE — so a value the grammar rejects is scanned as
// TOKENS instead, and `parsed: false` records which reading produced the facts.
//
// Tailwind needs no separate path: by the time a class reaches this module it is a
// value (`0.875rem`, `--tw-space-y-reverse`), and Tailwind's own generator is what
// produced it (see `tailwind.ts`).

import { cssTree, type CssNode } from "./css-tree";

// The parts ONE value reading collects. Both readings (the grammar's and the
// token fallback) produce this same shape, so a consumer never asks which reading
// ran — only `parsed` says, and the lists are read the same way either way.
type ValueParts = {
	literals: { kind: string; text: string; line: number | null; unit: string | null }[];
	vars: string[];
	functions: { name: string; text: string; line: number | null }[];
	interpolations: { text: string; line: number | null }[];
};

const emptyParts = (): ValueParts => ({ literals: [], vars: [], functions: [], interpolations: [] });

// The fallback reading: a value the CSS grammar rejects is still text with the
// same kinds of parts. Nothing here interprets — it RECORDS:
//   $name / --name      a variable reference (`vars`)
//   #rrggbb / #rgb      a colour literal
//   `#{ … }`            an interpolation — a COMPUTED value, not a literal
//   number + unit       a dimension
//   name(               a call, name as written
//   "…" / '…'           a string literal
const TOKEN_RE = /#\{[^}]*\}|[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*\(|(?:\d*\.\d+|\d+)(?:%|[a-zA-Z]+)?|\$[\w-]+|--[\w-]+|#[\da-fA-F]{3,8}\b|"[^"]*"|'[^']*'/g;

const NUMBER_RE = /^(?:\d*\.\d+|\d+)(?:%|[a-zA-Z]+)?$/;
const UNIT_RE = /(%|[a-zA-Z]+)$/;

// The kind a written number is, by its unit: none → a number, `%` → a percentage,
// anything else → a dimension. One helper, no nested ternary.
const numberKind = (unit: string | null): string => {
	if (unit === null) return "number";
	if (unit === "%") return "percentage";
	return "dimension";
};

// One token, classified by its own spelling. A named helper per kind keeps the
// dispatch flat and each reading honest.
const tokenLiteral = (token: string, line: number | null): ValueParts["literals"][number] | null => {
	if (token.startsWith("#")) return { kind: "hash", text: token, line, unit: null };
	if (!NUMBER_RE.test(token)) return null;
	const unit = token.match(UNIT_RE)?.[1] ?? null;
	return { kind: numberKind(unit), text: token, line, unit };
};

const tokenFacts = (value: string, line: number | null): ValueParts => {
	const out = emptyParts();

	for (const match of value.matchAll(TOKEN_RE)) {
		const token = match[0];
		const at = { text: token, line };

		if (token.startsWith("#{")) out.interpolations.push(at);
		else if (token.startsWith("$") || token.startsWith("--")) out.vars.push(token);
		else if (token.endsWith("(")) out.functions.push({ ...at, name: token.slice(0, -1) });
		else {
			const literal = tokenLiteral(token, line);
			if (literal) out.literals.push(literal);
		}
	}

	return out;
};

// A LEAF that is more than punctuation is a written value. The test is on what
// the parser generated, not on a list of node types: `,` and whitespace are
// separators, `16px`/`#fff`/`100%` are values. An `Identifier` is the parser's
// own word for a KEYWORD (`solid`, `block`), and a keyword is not a value.
const leafLiteral = (node: CssNode, text: string, line: number | null): ValueParts["literals"][number] | null => {
	const hasChildren = Boolean(node.children?.first);
	const isKeyword = node.type === "Identifier";
	// A value has a letter or a digit in it: operators (`-`, `/`), commas and
	// whitespace do not, and they are what a `calc()`/`clamp()` is made of.
	const hasValue = /[A-Za-z0-9]/.test(text);
	if (hasChildren || isKeyword || !hasValue) return null;

	return { kind: node.type.toLowerCase(), text, line, unit: node.unit ?? null };
};

// A CALL is a node with children and a name; a bare identifier is a keyword,
// which is not a call and is not a value. `var(--x)` reads a NAME; every other
// call is reported by its own name.
const callFact = (node: CssNode, text: string, line: number | null, out: ValueParts): void => {
	if (!node.children?.first || node.name === undefined) return;
	const name = node.name;
	const first = node.children.first;
	if (name.toLowerCase() === "var" && first?.type === "Identifier" && first.name !== undefined) out.vars.push(first.name);
	else out.functions.push({ name, text, line });
};

// Walk the parsed value: every literal by node type, every call by name, and the
// variables a value reads. A call's ARGUMENTS are values of their own, so the walk
// goes INTO them (`color-mix(in srgb, #fff 40%, var(--a))` holds a hash, a
// percentage and a read) — nothing is skipped, nothing is interpreted.
const parsedFacts = (ast: CssNode, line: number | null): ValueParts => {
	const out = emptyParts();

	cssTree.walk(ast, {
		enter(node) {
			const text = cssTree.generate(node);
			const literal = leafLiteral(node, text, line);
			if (literal) out.literals.push(literal);
			callFact(node, text, line, out);
		},
	});

	return out;
};

const classifyValue = (value: string, line: number | null): ValueParts & { parsed: boolean } => {
	const text = String(value);

	try {
		return { parsed: true, ...parsedFacts(cssTree.parse(text, { context: "value", positions: true }), line) };
	} catch {
		// Not CSS: SCSS, or a value in a syntax we have no grammar for. `parsed:
		// false` is the answer — the tokens below are what the reader could still
		// find, and the flag says which reading produced them. (This is called for
		// every string a theme holds, so `"x.ts"` reaching it is normal, not an
		// error to report.)
		return { parsed: false, ...tokenFacts(text, line) };
	}
};

export { classifyValue };
export type { ValueParts };

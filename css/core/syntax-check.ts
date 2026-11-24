"use strict";

// THE SYNTAX VERDICT on one concrete value, as STRUCTURED facts — never a
// sentence. css-tree owns the property grammar and the math-function grammar;
// the one gap its property matcher leaves is that it accepts a broken math
// function (`calc(2+)`, `min()`, `clamp(1px)`) — it parses `calc()` lazily and
// never looks inside. So every MATH function call is walked and matched against
// the grammar of its own function type (`calc()`, `min()`, `max()`, `clamp()`,
// … — whatever css-tree defines as a math function), and only then is the whole
// value matched against the property.
//
// A problem carries a KIND and a SPAN into the value; the report layer composes
// the sentence. An unknown property, or a custom property, has no property
// verdict: `valid: null` (custom: `true`) says "not checkable", which is
// different from "wrong".

import { cssTree, type CssNode, type MatchError, type TypeSyntaxNode } from "./css-tree";
import type { Span } from "./pieces";

// What kind of grammar problem was found. `math` is a malformed math function
// call; `property` is the value not fitting the property's grammar; `unknown`
// is a property the grammar does not know (no verdict to give).
type ProblemKind = "math" | "property" | "unknown";

// One problem: the kind, the span it occupies in the value, and the raw grammar
// message (the parser's own words, kept only as a detail — prose is the report's).
type ValueProblem = { kind: ProblemKind; span: Span; detail: string | null };

// A verdict: valid / invalid / not-checkable, and the problems behind a `false`.
type Verdict = { valid: boolean | null; problems: ValueProblem[] };

// The first line of the grammar's multi-line message — the line naming the
// syntax, not the caret drawing.
const firstLine = (text: string): string => text.split("\n")[0].trim();

const wholeValue = (value: string): Span => ({ start: 0, end: value.length });

// Does a grammar syntax tree (transitively) build on `calc-sum`? That is the
// grammar's OWN word for "a math function", so recognising one needs no list of
// names: `calc`, `min`, `max`, `clamp`, `round`, `hypot`, `abs`, `sin` … all
// reference `calc-sum`; `blur`, `rgb`, `var` do not. A new math function in the
// grammar is recognised the moment css-tree knows it.
const referencesCalcSum = (node: TypeSyntaxNode, seen: Set<TypeSyntaxNode> = new Set()): boolean => {
	if (seen.has(node)) return false;
	seen.add(node);
	if (node.type === "Type" && node.name === "calc-sum") return true;

	return [node.term, node.syntax, ...(node.terms ?? [])].some((child) => child !== undefined && referencesCalcSum(child, seen));
};

// The math function names, read once from the grammar's type dictionary.
let mathNames: Set<string> | null = null;
const mathFunctionNames = (): Set<string> => {
	if (mathNames) return mathNames;
	const names = new Set<string>();
	for (const [typeName, definition] of Object.entries(cssTree.lexer.types ?? {})) {
		if (typeName.endsWith("()") && referencesCalcSum(definition.syntax)) names.add(typeName.slice(0, -2));
	}
	mathNames = names;

	return names;
};

const spanOfNode = (node: CssNode, value: string): Span => {
	const loc = node.loc;
	if (!loc) return wholeValue(value);

	return { start: loc.start.offset, end: loc.end.offset };
};

// Walk the parsed value: every math function call is matched against its OWN
// function-type grammar. The property matcher accepts a broken call — this is
// the gap that fills. A call mentioning `var()` has an argument only
// substitution can settle, so it is left unjudged; a broken call is not
// descended into (the spanning problem already covers everything inside it).
const mathProblems = (node: CssNode, value: string, out: ValueProblem[]): void => {
	if (node.type === "Function" && node.name && mathFunctionNames().has(node.name)) {
		const text = cssTree.generate(node);
		if (!text.includes("var(")) {
			const match = cssTree.lexer.matchType(`${node.name}()`, text);
			if (match.error) {
				out.push({ kind: "math", span: spanOfNode(node, value), detail: firstLine(match.error.message ?? "") });

				return;
			}
		}
	}
	node.children?.forEach((child) => mathProblems(child, value, out));
};

// The span a property mismatch points at: `mismatchOffset`/`mismatchLength`
// bound the offending token; a grammar that names no token spans the value.
const mismatchSpan = (error: MatchError, value: string): Span => {
	const start = Math.min(Math.max(error.mismatchOffset ?? error.offset ?? 0, 0), value.length);
	const length = Math.max(error.mismatchLength ?? 0, 0);
	const end = length > 0 ? Math.min(start + length, value.length) : value.length;

	return { start, end };
};

const parseValue = (value: string): CssNode | null => {
	try {
		return cssTree.parse(value, { context: "value", positions: true });
	} catch {
		return null;
	}
};

// Check one concrete value against CSS syntax. A custom property has no property
// verdict (`valid: true`) but its math calls are still checked. An unknown
// property is "not checkable" (`valid: null`), reported as an `unknown` problem
// so the fact is explicit — never guessed in either direction.
const checkValue = (property: string, value: string): Verdict => {
	const text = String(value);
	const problems: ValueProblem[] = [];
	const ast = parseValue(text);
	if (ast) mathProblems(ast, text, problems);
	if (problems.length) return { valid: false, problems };
	if (property.startsWith("--")) return { valid: true, problems: [] };
	try {
		const match = cssTree.lexer.matchProperty(property, text);
		if (!match.error) return { valid: true, problems: [] };
		const detail = firstLine(match.error.message ?? "");
		if (/unknown property|not applicable/i.test(detail)) return { valid: null, problems: [{ kind: "unknown", span: wholeValue(text), detail }] };

		return { valid: false, problems: [{ kind: "property", span: mismatchSpan(match.error, text), detail }] };
	} catch (error) {
		const detail = firstLine(error instanceof Error ? error.message : String(error));

		return { valid: null, problems: [{ kind: "unknown", span: wholeValue(text), detail }] };
	}
};

export { checkValue };
export type { Span, ProblemKind, ValueProblem, Verdict };

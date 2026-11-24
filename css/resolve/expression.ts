"use strict";

// ONE TypeScript expression, folded to concrete text. A template may quote a
// theme path, a local `const`, a literal, a template of its own, a string
// concatenation — each is answered the same way: the concrete value, or the
// reason it has none. A call is never guessed.
//
// An expression may also BRANCH: a conditional (`a ? b : c`), a logical chain
// (`a && b`, `a ?? b`), dynamic indexing over a theme object
// (`theme.zIndex[$zIndex]`), `.map(...)` over a static array. Every reachable
// leaf is ENUMERATED — the branch chosen at runtime is not the resolver's
// business, so all of them are readings. A branch that genuinely cannot be read
// (a call with an unknown result) is a reported problem NEXT TO the readings
// that did resolve, never instead of them.

import { Node, type Block, type ConditionalExpression } from "ts-morph";
import { initializerOf, literalTextOf, unwrap, type ProviderReading } from "./theme-value";
import { isDirective } from "./directive";
import { pathAnswer } from "./path-answer";
import { NO_BINDINGS, DYNAMIC_PLACEHOLDER, firstLine, oneValue, noValue, block, dynamicValue, combine, ARITHMETIC, arithmeticValues, type Bindings, type ValueAnswer } from "./answers";
import type { Scope } from "../core/scope-types";
import type { BranchProblem } from "../core/pieces";

// An expression whose meaning is a nested style block rather than a value is
// answered by `./directive`; the fold below only checks `isDirective` once.

// The path answers (name, theme path, local value, indexed object, dynamic value)
// live in `./path-answer`.

// Fold a template literal that is itself an expression (`` `${n}px` ``): every
// quoted expression is resolved, then the values are concatenated. A span that
// resolves through several readings multiplies the readings; a span that resolves
// to nothing fails the whole template (a composition needs every part).
const templateExpressionAnswer = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer => {
	if (!Node.isTemplateExpression(node)) return noValue({ kind: "unresolved-expr", text: firstLine(node.getText()) });
	let values: ProviderReading[] = [{ text: node.getHead().getLiteralText(), origin: null }];
	const problems: BranchProblem[] = [];
	for (const span of node.getTemplateSpans()) {
		const answer = expressionAnswer(span.getExpression(), scope, bindings);
		if (!answer.values.length) return noValue(answer.problems[0] ?? { kind: "unresolved-expr", text: firstLine(span.getExpression().getText()) });
		problems.push(...answer.problems);
		const literal = span.getLiteral().getLiteralText();
		values = values.flatMap((left) => answer.values.map((right) => ({ text: left.text + right.text + literal, origin: left.origin ?? right.origin, dynamic: left.dynamic || right.dynamic })));
	}

	return { values, problems, dynamic: values.some((value) => value.dynamic) ? true : undefined };
};

// `a ?? b` / `a || b`: the LEFT reading wins when it reaches anything; only an
// unreadable or empty left falls through to the right. A fallback COVERS the
// providers the left branch is `absent` in (README §3.4: a missing status key
// falls back to the zone), so the absent list is dropped here — never reported
// as an incomplete provider when the fallback paints it.
const fallbackAnswer = (left: Node, right: Node, scope: Scope, bindings: Bindings): ValueAnswer => {
	const first = expressionAnswer(left, scope, bindings);
	// A dynamic left is not a reading to keep (its placeholder is a shape, not a
	// value): the fallback is still read, and the dynamic arm stays beside it.
	if (first.dynamic) return combine(expressionAnswer(right, scope, bindings), first);
	if (first.values.length) return { values: first.values, problems: [], absent: first.absent };

	return expressionAnswer(right, scope, bindings);
};

// `a && b`: the RIGHT side when `a` is a readable value (both readings possible),
// or the right side alone when `a` is the runtime condition (`$x && theme.color`
// — `$x` picks whether a colour is painted, it is not the colour).
const andAnswer = (left: Node, right: Node, scope: Scope, bindings: Bindings): ValueAnswer => {
	const first = expressionAnswer(left, scope, bindings);
	const second = expressionAnswer(right, scope, bindings);
	if (first.values.length) return { values: [...first.values, ...second.values], problems: second.problems, absent: first.absent };

	return second;
};

// The numeric result of `a <op> b` over two readings is appended by
// `./arithmetic`; this file only decides WHICH operators are foldable.

// The logical operators, whose arms are alternatives: a fallback covers the
// providers its left arm is absent in, `&&` reads both sides' values.
const logicalAnswer = (op: string, node: Node, scope: Scope, bindings: Bindings): ValueAnswer | null => {
	if (!Node.isBinaryExpression(node)) return null;
	if (op === "??" || op === "||") return fallbackAnswer(node.getLeft(), node.getRight(), scope, bindings);
	if (op === "&&") return andAnswer(node.getLeft(), node.getRight(), scope, bindings);

	return null;
};

// `a + b`: strings concatenate, two numbers add. `-`, `*`, `/` are arithmetic
// over numbers only. Anything else is a guess, so it is reported instead.
const binaryAnswer = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer => {
	if (!Node.isBinaryExpression(node)) return noValue({ kind: "unresolved-expr", text: firstLine(node.getText()) });
	const op = node.getOperatorToken().getText();
	const logical = logicalAnswer(op, node, scope, bindings);
	if (logical) return logical;
	if (op !== "+" && !ARITHMETIC.has(op)) return noValue({ kind: "unresolved-expr", text: firstLine(node.getText()) });
	const left = expressionAnswer(node.getLeft(), scope, bindings);
	const right = expressionAnswer(node.getRight(), scope, bindings);
	if (left.problems.length || right.problems.length) return { values: [], problems: [...left.problems, ...right.problems] };
	const values = arithmeticValues(op, left.values, right.values);
	if (!values) return noValue({ kind: "unresolved-expr", text: firstLine(node.getText()) });

	return { values, problems: [], dynamic: values.some((value) => value.dynamic) ? true : undefined };
};

// `cond ? a : b` — BOTH arms are reachable, so both are enumerated (recursively:
// nested ternaries flatten into their leaves). The condition is runtime and is
// not evaluated; only its consequences are read.
const conditionalAnswer = (node: ConditionalExpression, scope: Scope, bindings: Bindings): ValueAnswer =>
	combine(expressionAnswer(node.getWhenTrue(), scope, bindings), expressionAnswer(node.getWhenFalse(), scope, bindings));

const firstReturnExpression = (body: Block): Node | undefined => {
	const statement = body.getStatements().find((candidate) => Node.isReturnStatement(candidate));
	if (!statement || !Node.isReturnStatement(statement)) return undefined;

	return statement.getExpression() ?? undefined;
};

const blockAnswer = (body: Block, scope: Scope, bindings: Bindings): ValueAnswer => {
	const expression = firstReturnExpression(body);
	if (!expression) return noValue({ kind: "no-return" });
	if (Node.isTemplateExpression(expression) || Node.isNoSubstitutionTemplateLiteral(expression)) return noValue({ kind: "template-block" });

	return expressionAnswer(expression, scope, bindings);
};

// The body of a function-like expression, if it has one.
const bodyOf = (node: Node): Node | null => {
	if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) return node.getBody();

	return null;
};

// A function expression used in value position: its return value is the value.
// A body that builds a template BLOCK is not a value — its declarations are read
// as a template of their own, not guessed.
const functionAnswer = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer => {
	const body = bodyOf(node);
	if (!body) return noValue({ kind: "not-a-value" });
	if (Node.isBlock(body)) return blockAnswer(body, scope, bindings);

	return expressionAnswer(body, scope, bindings);
};

// The elements of a static array literal, or null. A `const` naming one is
// followed to its initializer; anything runtime (a prop array) is null.
const staticElements = (node: Node): string[] | null => {
	const current = unwrap(node);
	if (Node.isArrayLiteralExpression(current)) {
		const values = current.getElements().map((element) => literalTextOf(element));

		return values.every((value): value is string => value !== null) ? values : null;
	}
	if (Node.isIdentifier(current)) {
		const initializer = initializerOf(current);

		return initializer ? staticElements(initializer) : null;
	}

	return null;
};

// The fixed inputs of one `.map(...)` fold: the callback, its parameter, and the
// scope/bindings its body is folded in. One bag so the helpers stay ≤2 params.
type MapFold = { callback: Node; paramName: string; scope: Scope; bindings: Bindings };

// One map callback's answer for one element: the callback is folded with its
// parameter bound to the element's text.
const callbackAnswer = (fold: MapFold, element: string): ValueAnswer => {
	const { callback, paramName, scope, bindings } = fold;
	const body = Node.isArrowFunction(callback) || Node.isFunctionExpression(callback) ? callback.getBody() : null;
	if (!body) return noValue({ kind: "no-callback-body" });
	const next = new Map(bindings);
	next.set(paramName, element);
	if (Node.isBlock(body)) {
		const expression = firstReturnExpression(body);

		return expression ? expressionAnswer(expression, scope, next) : noValue({ kind: "no-callback-return" });
	}

	return expressionAnswer(body, scope, next);
};

// `.map(cb)` over a static array literal → one answer per element, unioned. The
// callback's parameter is bound to each element in turn, so `.map((n) => \`${n}px\`)`
// reaches every `Npx`.
// A map over a DYNAMIC collection (`$colsRatio.map((col) => `${col}`)`): the
// elements are runtime values, so the callback is folded once with a placeholder
// element — the SHAPE it produces (`1fr`, `1%`, `url(1)`) is what the grammar
// checks.
const dynamicMapAnswer = (fold: MapFold): ValueAnswer => {
	const shaped = callbackAnswer(fold, DYNAMIC_PLACEHOLDER);
	if (!shaped.values.length) return dynamicValue();

	return { values: shaped.values.map((value) => ({ ...value, dynamic: true })), problems: [], dynamic: true };
};

// A map over a static array: the callback is folded once per element, and the
// answers are unioned.
const staticMapAnswer = (fold: MapFold, elements: string[]): ValueAnswer => {
	const out: ValueAnswer = { values: [], problems: [] };
	for (const element of elements) {
		const answer = callbackAnswer(fold, element);
		out.values.push(...answer.values);
		out.problems.push(...answer.problems);
	}
	out.dynamic = out.values.some((value) => value.dynamic) ? true : undefined;

	return out;
};

// eslint-disable-next-line md-code-utils/utils-uniqueness -- reads a `.map(...)` call, not a write
const mapAnswers = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer | null => {
	const call = unwrap(node);
	if (!Node.isCallExpression(call)) return null;
	const callee = unwrap(call.getExpression());
	if (!Node.isPropertyAccessExpression(callee) || callee.getName() !== "map") return null;
	const callback = call.getArguments()[0];
	if (!callback || !(Node.isArrowFunction(callback) || Node.isFunctionExpression(callback))) return null;
	const paramName = callback.getParameters()[0]?.getName();
	if (!paramName) return null;
	const elements = staticElements(callee.getExpression());
	const fold: MapFold = { callback, paramName, scope, bindings };

	return elements ? staticMapAnswer(fold, elements) : dynamicMapAnswer(fold);
};

// The joined text of a mapped value, or null when the separator is unreadable or
// the readings carry provider labels (the providers disagree on the sequence).
const joinedText = (mapped: ValueAnswer, call: Node): string | null => {
	if (!Node.isCallExpression(call) || mapped.values.some((value) => value.origin !== null)) return null;
	const separator = call.getArguments()[0];
	const text = separator ? literalTextOf(separator) : null;
	if (separator && text === null) return null;

	return mapped.values.map((value) => value.text).join(text ?? ",");
};

// `.map(cb).join(sep)` over a static array literal → the readings joined by the
// literal separator. Provider-labelled readings cannot be joined into one text,
// so that shape stays unresolved.
const joinAnswer = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer | null => {
	const call = unwrap(node);
	if (!Node.isCallExpression(call)) return null;
	const callee = unwrap(call.getExpression());
	if (!Node.isPropertyAccessExpression(callee) || callee.getName() !== "join") return null;
	const mapped = mapAnswers(callee.getExpression(), scope, bindings);
	if (!mapped) return null;
	if (mapped.problems.length || !mapped.values.length) return { values: [], problems: mapped.problems.length ? mapped.problems : [{ kind: "empty-map" }] };
	const text = joinedText(mapped, call);
	if (text === null) return null;

	return { values: [{ text, origin: null, dynamic: mapped.dynamic }], problems: [], dynamic: mapped.dynamic };
};

// The branch/collection shapes, tried before the plain path walk: a conditional,
// logical or arithmetic expression, or a `.map`/`.join` collection. Null when the
// node names none of them.
const branchAnswer = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer | null => {
	if (Node.isConditionalExpression(node)) return conditionalAnswer(node, scope, bindings);
	if (Node.isBinaryExpression(node)) return binaryAnswer(node, scope, bindings);
	if (Node.isTemplateExpression(node)) return templateExpressionAnswer(node, scope, bindings);

	return mapAnswers(node, scope, bindings) ?? joinAnswer(node, scope, bindings);
};

// One expression, folded to concrete text. Theme paths are tried first (a local
// `colors` would otherwise shadow one), then local consts, then literals; the
// branch shapes (conditional, logical, map/join) are enumerated before the plain
// path walk.
const expressionAnswer = (node: Node, scope: Scope, bindings: Bindings = NO_BINDINGS): ValueAnswer => {
	const current = unwrap(node);
	if (isDirective(current)) return block();
	if (Node.isArrowFunction(current) || Node.isFunctionExpression(current)) return functionAnswer(current, scope, bindings);
	const literal = literalTextOf(current);
	if (literal !== null) return oneValue(literal);

	return branchAnswer(current, scope, bindings) ?? pathAnswer(current, scope, bindings);
};

export { expressionAnswer, firstLine };
export type { ValueAnswer };

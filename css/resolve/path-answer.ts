"use strict";

// THE PATH answers: what a NAME or a member chain folds to — a map's own bound
// variable, a theme path (the providers), a local value, an indexed theme object,
// or a runtime-dynamic value. Split out of `expression.ts` (which keeps the
// branch/collection dispatch) because this block depends on no folding logic.
//
// A provider path is handled BEFORE the dynamic test, so `theme.colors.typo` is a
// reported problem, not a silently dynamic value.

import { Node } from "ts-morph";
import { chainPath, initializerOf, providerAnswer, providerMemberValues, providerValueOf, rootIdentifierOf, unwrap } from "./theme-value";
import { nameRootOf } from "./directive";
import { firstLine, oneValue, noValue, dynamicValue, absentValue, type Bindings, type ValueAnswer } from "./answers";
import type { Scope } from "../core/scope-types";

// A local value: a `const`'s literal initializer, or a path through a local
// object literal (`const sizes = {...}; sizes.desktop.width`). Only statically
// readable shapes qualify; anything else is answered with `null`.
const ownValueAnswer = (node: Node): ValueAnswer | null => {
	const path = chainPath(node);
	const root = nameRootOf(node);
	if (!path || !root) return null;
	const value = providerValueOf(initializerOf(root), path.slice(1), new Set());

	return value === null ? null : oneValue(value);
};

// Dynamic indexing: `theme.zIndex[$zIndex]` has no static key, so EVERY member of
// the indexed theme object is a possible reading. Enumerating them is the answer;
// a static-string key is a plain path and is handled by `chainPath`.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- reads a member index, not a write
const indexedAnswer = (node: Node, scope: Scope): ValueAnswer | null => {
	if (!Node.isElementAccessExpression(node)) return null;
	const argument = node.getArgumentExpression();
	if (!argument || Node.isStringLiteral(argument) || Node.isNumericLiteral(argument)) return null;
	const path = chainPath(unwrap(node.getExpression()));
	if (!path) return null;
	const readings = providerMemberValues(path, scope);
	if (!readings.length) return noValue({ kind: "index-unreadable", text: firstLine(node.getText()) });

	return { values: readings, problems: [] };
};

// Is this name bound at runtime — a parameter, a destructured prop — rather than
// a value the file declares? A styled interpolation hands such names; what they
// hold is the runtime's business.
const runtimeBound = (identifier: Node): boolean =>
	Boolean(identifier.getSymbol()?.getDeclarations()?.some((declaration) => Node.isParameterDeclaration(declaration) || Node.isBindingElement(declaration)));

// A local name whose initializer computes a value (`encodeURIComponent(x).replace(…)`)
// is runtime data too: the resolver cannot fold a call, but it is not an error.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- a shape probe, not a mutability check
const computedLocal = (identifier: Node): boolean => {
	if (!Node.isIdentifier(identifier)) return false;
	const initializer = initializerOf(identifier);
	if (!initializer) return false;
	const node = unwrap(initializer);

	return !(Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node) || Node.isNumericLiteral(node) || Node.isObjectLiteralExpression(node) || Node.isArrayLiteralExpression(node) || Node.isArrowFunction(node) || Node.isFunctionExpression(node) || Node.isClassExpression(node));
};

// A value only the runtime knows: a bare prop (`${$percentage}`), a chain rooted
// at a transient prop (`$colsRatio[…].map(…)`), or a locally computed name.
const isDynamicNode = (node: Node): boolean => {
	const current = unwrap(node);
	if (Node.isIdentifier(current)) return runtimeBound(current) || computedLocal(current);
	const root = rootIdentifierOf(current);

	return Node.isIdentifier(root) && (root.getText().startsWith("$") || computedLocal(root));
};

// The named readings in priority order: a map's own variable
// (`.map((col) => \`${col}\`)`), a theme path, then a local value. Null when the
// node names none of them.
const namedAnswer = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer | null => {
	const path = chainPath(node);
	if (!path) return null;
	if (path.length === 1 && bindings.has(path[0])) return oneValue(bindings.get(path[0]) ?? "");
	const themed = providerAnswer(path, scope);
	if (themed) return absentValue(themed);

	return ownValueAnswer(node);
};

const pathAnswer = (node: Node, scope: Scope, bindings: Bindings): ValueAnswer => {
	const named = namedAnswer(node, scope, bindings);
	if (named) return named;
	const indexed = indexedAnswer(node, scope);
	if (indexed) return indexed;
	if (isDynamicNode(node)) return dynamicValue();
	if (Node.isCallExpression(node) || Node.isNewExpression(node)) return noValue({ kind: "call", text: firstLine(node.getText()) });

	return noValue({ kind: "unresolved-expr", text: firstLine(node.getText()) });
};

export { pathAnswer };

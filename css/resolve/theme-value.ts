"use strict";

// A THEME PATH read out of the project's object literals. A styled expression
// returns `theme.colors.section`; that is a PATH, and the value at the bottom is
// whatever literal the project declared at that path. Nothing here knows which
// variable is "the theme" — the path is matched against every object literal the
// project declares, and the literals that carry it are the theme variants.

import { Node, type ObjectLiteralExpression, type Symbol as MorphSymbol } from "ts-morph";
import { SK } from "../../entities/ast/tree";
import type { Scope, ProviderLiteral } from "../core/scope-types";

// One concrete reading of a path, and the literal it came from. `dynamic` marks a
// PLACEHOLDER reading (a runtime prop): its text is a shape, not a value.
type ProviderReading = { text: string; origin: string | null; dynamic?: boolean };

// Strip the wrappers that do not change a value: `(x)`, `x as T`, `x!`, `x satisfies T`.
const unwrap = (node: Node): Node => {
	let current = node;
	for (;;) {
		if (Node.isParenthesizedExpression(current) || Node.isAsExpression(current) || Node.isNonNullExpression(current) || Node.isSatisfiesExpression(current)) {
			current = current.getExpression();
			continue;
		}
		if (Node.isTypeAssertion(current)) {
			current = current.getExpression();
			continue;
		}

		return current;
	}
};

// The property names of a member chain, as written: `p.theme.colors.section` →
// ["p", "theme", "colors", "section"]. A computed access with a non-literal key
// has no static path.
const chainPath = (node: Node): string[] | null => {
	const current = unwrap(node);
	if (Node.isIdentifier(current)) return [current.getText()];
	if (Node.isPropertyAccessExpression(current)) {
		const head = chainPath(current.getExpression());
		if (!head) return null;

		return [...head, current.getName()];
	}
	if (Node.isElementAccessExpression(current)) {
		const argument = current.getArgumentExpression();
		if (!argument || !Node.isStringLiteral(argument)) return null;
		const head = chainPath(current.getExpression());
		if (!head) return null;

		return [...head, argument.getLiteralText()];
	}

	return null;
};

// The leftmost expression of a member chain — the identifier the chain starts
// from. `p.theme.colors.section` → `p`.
const rootIdentifierOf = (node: Node): Node => {
	let current = unwrap(node);
	for (;;) {
		if (Node.isPropertyAccessExpression(current) || Node.isElementAccessExpression(current)) {
			current = unwrap(current.getExpression());
			continue;
		}

		return current;
	}
};

// The value a literal node spells, as text; a number is its spelling (`8`), so
// `${theme.size}px` concatenates the way the template intended.
const literalTextOf = (node: Node): string | null => {
	const current = unwrap(node);
	if (Node.isStringLiteral(current) || Node.isNoSubstitutionTemplateLiteral(current)) return current.getLiteralText();
	if (Node.isNumericLiteral(current)) return current.getText();
	if (Node.isPrefixUnaryExpression(current) && current.getOperatorToken() === SK.MinusToken && Node.isNumericLiteral(current.getOperand())) return `-${current.getOperand().getText()}`;

	return null;
};

// The initializer of the variable a name is bound to, whatever file declares it.
// The symbol walk is ts-morph's (imports followed), so a theme imported from
// another module is read the same way as one declared above the template.
const declarationInitializer = (declarations: readonly Node[]): Node | null => {
	for (const declaration of declarations) {
		if (Node.isVariableDeclaration(declaration)) return declaration.getInitializer() ?? null;
		// A default export is not a variable declaration: `export default {…}`
		// and `export default name` carry the value in an export assignment, so
		// following the import must read that expression (a theme part exported
		// as a default object is exactly this shape).
		if (Node.isExportAssignment(declaration)) return declaration.getExpression();
	}

	return null;
};

// A shorthand property (`{ elements }`) binds its VALUE through the property
// symbol, not the name: ask the checker what the shorthand's value symbol is,
// so the import/const behind it is followed like any other name.
const valueSymbol = (symbol: MorphSymbol): MorphSymbol => {
	for (const declaration of symbol.getDeclarations() ?? []) {
		if (!Node.isShorthandPropertyAssignment(declaration)) continue;
		const resolved = declaration.getProject().getTypeChecker().getShorthandAssignmentValueSymbol(declaration);
		if (resolved) return resolved;
	}

	return symbol;
};

const initializerOf = (node: Node): Node | null => {
	const current = unwrap(node);
	if (!Node.isIdentifier(current)) return null;
	const raw = current.getSymbol();
	if (!raw) return null;
	const symbol = valueSymbol(raw);
	const own = declarationInitializer(symbol.getDeclarations() ?? []);
	if (own) return own;
	// The name is an IMPORT: follow it to the declaration in its own module, so
	// a theme composed from imported parts (`offsets`, `baseTheme`) is readable.
	const aliased = symbol.getAliasedSymbol?.() ?? symbol;
	if (aliased === symbol) return null;

	return declarationInitializer(aliased.getDeclarations() ?? []);
};

// A property's own key, without the quotes a string key is written with.
const UNQUOTED_KEY = /^["']|["']$/g;
const keyOf = (name: string): string => name.replace(UNQUOTED_KEY, "");

// One property of an object literal, matched against the path's head. A spread
// is not a named property: it is followed and the SAME path is searched there
// (`{...baseTheme, colors}` keeps the base's values).
const propertyValueOf = (property: Node, path: readonly string[], seen: Set<Node>): string | null => {
	if (Node.isPropertyAssignment(property) && keyOf(property.getName()) === path[0]) return providerValueOf(property.getInitializer(), path.slice(1), seen);
	if (Node.isShorthandPropertyAssignment(property) && keyOf(property.getName()) === path[0]) return providerValueOf(property.getNameNode(), path.slice(1), seen);
	if (Node.isSpreadAssignment(property)) return providerValueOf(property.getExpression(), path, seen);

	return null;
};

const objectValueOf = (literal: ObjectLiteralExpression, path: readonly string[], seen: Set<Node>): string | null => {
	for (const property of literal.getProperties()) {
		const found = propertyValueOf(property, path, new Set([...seen, property]));
		if (found !== null) return found;
	}

	return null;
};

// A chain whose head is a name (`sizes: baseTheme.font.sizes`): follow the name
// to its initializer, then walk the rest of the chain plus the remaining path.
const chainedValueOf = (node: Node, path: readonly string[], seen: Set<Node>): string | null => {
	if (Node.isIdentifier(node)) return providerValueOf(initializerOf(node), path, new Set([...seen, node]));
	if (!Node.isPropertyAccessExpression(node) && !Node.isElementAccessExpression(node)) return null;
	const rest = chainPath(node);
	const root = rootIdentifierOf(node);
	if (!rest || !Node.isIdentifier(root)) return null;

	return providerValueOf(initializerOf(root), [...rest.slice(1), ...path], new Set([...seen, node]));
};

// A theme value is not always a bare literal: the rhythm is spelled as
// arithmetic over its origin (`basicOffset * 2`, `basicOffset / 2`), and a
// value may point at another path. Fold those shapes to the literal they
// reach; anything non-numeric is left to the path walkers.
const ARITHMETIC: ReadonlyMap<string, (left: number, right: number) => number> = new Map([
	["+", (left, right) => left + right],
	["-", (left, right) => left - right],
	["*", (left, right) => left * right],
	["/", (left, right) => left / right],
]);

// One arithmetic operand as a number, or null when it is not numeric.
const numericOperand = (node: Node, seen: Set<Node>): number | null => {
	const text = valueTextOf(node, seen);
	const value = text === null ? Number.NaN : Number(text);

	return Number.isFinite(value) ? value : null;
};

const arithmeticTextOf = (current: Node, seen: Set<Node>): string | null => {
	if (Node.isPrefixUnaryExpression(current) && current.getOperatorToken() === SK.MinusToken) {
		const operand = numericOperand(current.getOperand(), seen);

		return operand === null ? null : String(-operand);
	}
	if (!Node.isBinaryExpression(current)) return null;
	const combine = ARITHMETIC.get(current.getOperatorToken().getText());

	return combine ? combineOperands(combine, current, seen) : null;
};

const combineOperands = (combine: (left: number, right: number) => number, binary: Node, seen: Set<Node>): string | null => {
	if (!Node.isBinaryExpression(binary)) return null;
	const left = numericOperand(binary.getLeft(), seen);
	const right = numericOperand(binary.getRight(), seen);
	if (left === null || right === null) return null;
	const result = combine(left, right);

	return Number.isFinite(result) ? String(result) : null;
};

// A theme value is not always a bare literal: the rhythm is spelled as
// arithmetic over its origin (`basicOffset * 2`, `basicOffset / 2`), and a
// value may point at another path. Fold those shapes to the literal they
// reach; anything else is left to the path walkers.
const valueTextOf = (node: Node, seen: Set<Node>): string | null => {
	const current = unwrap(node);
	const literal = literalTextOf(current);
	if (literal !== null) return literal;
	const arithmetic = arithmeticTextOf(current, seen);

	return arithmetic === null ? chainedValueOf(current, [], seen) : arithmetic;
};

// The literal at the bottom of a path. A leaf is not always a literal: a theme
// may compute it (`basicOffset * 2`) or point at another object's member
// (`height: screens.tabletHeight`), so both shapes are folded here.
const leafValueOf = (node: Node, seen: Set<Node>): string | null => valueTextOf(node, seen);

// One way to read a node at a path. The readers are chosen by the node's shape
// and by whether a path remains; `providerValueOf` itself only unwraps and guards.
type PathReader = (node: Node, path: readonly string[], seen: Set<Node>) => string | null;

const leafReader: PathReader = (node, _path, seen) => leafValueOf(node, seen);

const objectReader: PathReader = (node, path, seen) => (Node.isObjectLiteralExpression(node) ? objectValueOf(node, path, seen) : null);

const chainReader: PathReader = (node, path, seen) => chainedValueOf(node, path, seen);

const readerFor = (node: Node, path: readonly string[]): PathReader => {
	if (path.length === 0) return leafReader;
	if (Node.isObjectLiteralExpression(node)) return objectReader;

	return chainReader;
};

// Walk an object literal by a property path and read the literal at the bottom.
// A visited set makes a cyclic literal terminate instead of overflow.
const providerValueOf = (node: Node | null | undefined, path: readonly string[], seen: Set<Node>): string | null => {
	if (!node) return null;
	const current = unwrap(node);
	if (seen.has(current)) return null;

	return readerFor(current, path)(current, path, new Set([...seen, current]));
};

// What reading a provider path answered: the concrete values it reached (each
// labelled with its provider when the providers DISAGREE) and the providers
// whose literal does NOT carry the path — a fixed path missing in SOME provider
// is an incomplete provider, not a broken read.
type ProviderAnswer = { readings: ProviderReading[]; absent: string[] };

// A provider path is resolved by SUFFIX, longest first: `p.theme.colors.section`
// has the provider path `colors.section`, and `theme.colors.section` has the
// same one. No provider is named — whichever suffix the literals actually carry
// is the path. Every provider is asked: those that carry the path supply a
// reading, those that do not are reported `absent` (so a fixed path missing in
// one theme blames that theme).
const providerAnswer = (path: readonly string[], scope: Scope): ProviderAnswer | null => {
	for (let start = 0; start < path.length; start += 1) {
		const suffix = path.slice(start);
		const hits = scope.providers.map((provider: ProviderLiteral) => ({ name: provider.name, value: providerValueOf(provider.node, suffix, new Set()) }));
		const present = hits.filter((hit): hit is { name: string; value: string } => hit.value !== null);
		if (!present.length) continue;
		const absent = hits.filter((hit) => hit.value === null).map((hit) => hit.name);
		const distinct = [...new Map(present.map((hit) => [hit.value, hit])).values()];

		return { readings: distinct.map((hit) => ({ text: hit.value, origin: distinct.length > 1 ? hit.name : null })), absent };
	}

	return null;
};

// The object literal at the bottom of a path, or null. Same suffix-tolerant walk
// as `providerValueOf`, but it stops at the OBJECT instead of a leaf — dynamic
// indexing (`theme.zIndex[key]`) needs every member, not one value.
const objectLiteralAt = (node: Node | null | undefined, path: readonly string[], seen: Set<Node>): ObjectLiteralExpression | null => {
	if (!node) return null;
	const current = unwrap(node);
	if (seen.has(current)) return null;
	const next = new Set([...seen, current]);
	if (path.length === 0) return Node.isObjectLiteralExpression(current) ? current : null;
	if (Node.isObjectLiteralExpression(current)) {
		for (const property of current.getProperties()) {
			if (Node.isPropertyAssignment(property) && keyOf(property.getName()) === path[0]) return objectLiteralAt(property.getInitializer(), path.slice(1), next);
			// A spread keeps the base's members: the same path is searched there.
			if (Node.isSpreadAssignment(property)) {
				const found = objectLiteralAt(property.getExpression(), path, next);
				if (found) return found;
			}
		}

		return null;
	}
	if (Node.isIdentifier(current)) return objectLiteralAt(initializerOf(current), path, next);
	if (Node.isPropertyAccessExpression(current) || Node.isElementAccessExpression(current)) {
		const rest = chainPath(current);
		const root = rootIdentifierOf(current);
		if (!rest || !Node.isIdentifier(root)) return null;

		return objectLiteralAt(initializerOf(root), [...rest.slice(1), ...path], next);
	}

	return null;
};

// Every leaf value a literal's own members spell, spreads followed. A member that
// is itself an object is not a value: dynamic indexing enumerates the VALUES a
// reading can land on, and an object is a shape, not a CSS reading.
const memberLeavesOf = (literal: ObjectLiteralExpression, seen: Set<Node>): string[] => {
	const values: string[] = [];
	for (const property of literal.getProperties()) {
		if (Node.isPropertyAssignment(property)) {
			const value = valueTextOf(property.getInitializer(), new Set([...seen, property]));
			if (value !== null) values.push(value);
			continue;
		}
		if (Node.isShorthandPropertyAssignment(property)) {
			const value = valueTextOf(property.getNameNode(), new Set([...seen, property]));
			if (value !== null) values.push(value);
			continue;
		}
		if (Node.isSpreadAssignment(property)) {
			const spread = unwrap(property.getExpression());
			if (Node.isObjectLiteralExpression(spread)) values.push(...memberLeavesOf(spread, new Set([...seen, property])));
		}
	}

	return [...new Set(values)];
};

// Every member VALUE of the object literal at `path`, per provider. A dynamic
// key (`theme.zIndex[$zIndex]`) has no single reading, so each member is a
// possible one — the enumeration is the answer, not a guess. Providers are
// labelled only when they DISAGREE (the same rule as `providerAnswer`).
const providerMemberValues = (path: readonly string[], scope: Scope): ProviderReading[] => {
	for (let start = 0; start < path.length; start += 1) {
		const suffix = path.slice(start);
		const hits = scope.providers.map((provider: ProviderLiteral) => {
			const literal = objectLiteralAt(provider.node, suffix, new Set());

			return { name: provider.name, values: literal ? memberLeavesOf(literal, new Set()) : [] };
		});
		const present = hits.filter((hit) => hit.values.length);
		if (!present.length) continue;
		const label = present.length > 1;

		return present.flatMap((hit) => hit.values.map((value) => ({ text: value, origin: label ? hit.name : null })));
	}

	return [];
};

export { unwrap, chainPath, rootIdentifierOf, literalTextOf, initializerOf, providerValueOf, providerAnswer, providerMemberValues };
export type { ProviderReading, ProviderAnswer };

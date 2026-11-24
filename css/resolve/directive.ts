"use strict";

// An expression whose meaning is a nested STYLE BLOCK rather than a value. The
// check follows the SAME names the value resolver follows: a tagged template is
// a block; a name is whatever its initializer is; a short-circuit/conditional
// whose arm is a block is a block. A plain template literal is a VALUE (a media
// query, a concatenation), never a directive.
//
// Split out of `expression.ts` so the value fold stays under the file-length
// budget; it depends only on the theme-path readers, never on the fold itself.

import { Node } from "ts-morph";
import { chainPath, initializerOf, rootIdentifierOf, unwrap } from "./theme-value";

const DIRECTIVE_OPERATORS = new Set(["&&", "||", "??"]);

// The identifier a member chain starts from, when the whole chain is a static
// path (`sizes.desktop.width` → `sizes`); otherwise there is no name to follow.
const nameRootOf = (node: Node): Node | null => {
	const path = chainPath(node);
	const root = rootIdentifierOf(node);

	return path && Node.isIdentifier(root) ? root : null;
};

const directiveOfFunction = (node: Node, seen: Set<Node>): boolean => {
	const body = Node.isArrowFunction(node) || Node.isFunctionExpression(node) ? node.getBody() : null;

	return body === null ? false : !Node.isBlock(body) && isDirective(body, seen);
};

const directiveOfBinary = (node: Node, seen: Set<Node>): boolean => {
	if (!Node.isBinaryExpression(node) || !DIRECTIVE_OPERATORS.has(node.getOperatorToken().getText())) return false;

	return isDirective(node.getLeft(), seen) || isDirective(node.getRight(), seen);
};

const directiveOfConditional = (node: Node, seen: Set<Node>): boolean =>
	Node.isConditionalExpression(node) && (isDirective(node.getWhenTrue(), seen) || isDirective(node.getWhenFalse(), seen));

const directiveOfName = (node: Node, seen: Set<Node>): boolean => {
	const root = nameRootOf(node);
	const initializer = root === null ? null : initializerOf(root);

	return initializer !== null && isDirective(initializer, seen);
};

// Which reader answers which node kind. A tagged template is the block itself;
// the others either contain one or name one.
const DIRECTIVE_READERS: ReadonlyMap<string, (node: Node, seen: Set<Node>) => boolean> = new Map([
	["TaggedTemplateExpression", () => true],
	["ArrowFunction", directiveOfFunction],
	["FunctionExpression", directiveOfFunction],
	["BinaryExpression", directiveOfBinary],
	["ConditionalExpression", directiveOfConditional],
	["Identifier", directiveOfName],
	["PropertyAccessExpression", directiveOfName],
	["ElementAccessExpression", directiveOfName],
]);

const isDirective = (node: Node, seen: Set<Node> = new Set()): boolean => {
	const current = unwrap(node);
	if (seen.has(current)) return false;
	const reader = DIRECTIVE_READERS.get(current.getKindName());

	return reader ? reader(current, new Set([...seen, current])) : false;
};

export { isDirective, nameRootOf };

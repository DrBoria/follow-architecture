"use strict";

// What a declaration is SPELLED with: `export`, `abstract`, `declare`, `async`,
// `static`, `readonly`, `accessor`, `override`, the visibility words — and the
// decorators above it. Facts, not verdicts: a rule decides what they mean.

import { Node } from "ts-morph";
import { SK, startLine } from "./tree";
import { lastMemberName } from "./properties";
import type { LooseNode } from "./loose";
import type { DecoratorFact } from "../facts";

// A variable's words live on the STATEMENT that declares it: `export const x`
// and `declare const x` are written on `VariableStatement`, and the declaration
// node itself carries none. Asking only the node answered "nothing" for every
// `const`, while `exported` said the opposite about the same file.
// The declaration sits inside a `VariableDeclarationList`, and the list inside the
// statement — so the owner is a grandparent, not a parent.
const spelledBy = (node: LooseNode): LooseNode =>
	node.getKind?.() === SK.VariableDeclaration
		? (node.getFirstAncestorByKind?.(SK.VariableStatement) ?? node)
		: node;

// `modifiersOf` answers with the words as written, in source order.
const modifiersOf = (node: LooseNode): string[] => {
	const owner = spelledBy(node);

	return (typeof owner.getModifiers === "function" ? owner.getModifiers() : []).map((m) => m.getText());
};

// Decorators by the NAME a filter can match: `@Component({…})` → "Component",
// `@core.Input()` → "Input". Framework-agnostic — any decorator, any framework.
const decoratorsOf = (node: LooseNode): DecoratorFact[] =>
	(typeof node.getDecorators === "function" ? node.getDecorators() : []).map((d) => {
		const expr = d.getExpression();
		const name = Node.isCallExpression(expr) ? (lastMemberName(expr.getExpression()) ?? expr.getExpression().getText()) : (lastMemberName(expr) ?? expr.getText());

		return { name, full: expr.getText(), line: startLine(d) };
	});

export { modifiersOf, decoratorsOf };

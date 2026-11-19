"use strict";

// An `enum` is a declaration with a shape: a closed set of names, each bound to
// a value. It is a candidate like a type — a node may host it, a rule may count
// its members — and `const`/`declare` are its modifiers.

import { declarationFact } from "./declaration";
import type { Node } from "ts-morph";
import type { LooseNode } from "./loose";
import type { Candidate, AnyMember } from "../facts";

const membersOf = (node: LooseNode): AnyMember[] =>
	(node.getMembers?.() ?? []).map((m) => {
		const initializer = m.getInitializer?.();
		const name = m.getName?.() ?? null;

		return { name, value: initializer ? initializer.getText() : null, line: m.getStartLineNumber() };
	});

const isEnumNode = (n: Node): boolean => n.getKindName() === "EnumDeclaration";

// `const enum` is a MODIFIER, and `kind` carries every modifier.
const enumFact = (node: LooseNode, rel: string): Candidate => declarationFact(node, rel, membersOf(node));

export { enumFact, isEnumNode };

"use strict";

// Class entities: members, decorators, base class, implemented interfaces and
// constructor parameters. That is what makes an Angular component / Nest
// provider / TypeORM entity expressible as a code role at all — and equally a
// plain model. The engine knows nothing about what `@Component` means.

import { type ClassDeclaration, type ClassExpression } from "ts-morph";
import { kindName, startLine, nodeText } from "./tree";
import { decoratorsOf } from "./modifiers";
import type { LooseNode } from "./loose";
import type { Candidate, AnyMember, ConstructorParam } from "../facts";

type ClassNode = ClassDeclaration | ClassExpression;

// The declared type of a member, else the text of its initializer — what a
// filter reads as the member's `type`.
const memberType = (m: LooseNode): string | null => {
	const typeNode = typeof m.getTypeNode === "function" ? m.getTypeNode() : null;
	if (typeNode) return typeNode.getText();
	const initializer = typeof m.getInitializer === "function" ? m.getInitializer() : null;

	return initializer ? initializer.getText() : null;
};

// The visibility word a member carries, when it carries one.
const VISIBILITY = ["private", "protected", "public"];

// What a member IS, beyond its name: a `#private` field, a `static` one, a
// `readonly`/`accessor` one, the visibility word, its type and the fact that a
// `static {}` block runs at class definition.
const memberFact = (m: LooseNode): AnyMember => {
	const name = m.getName?.() ?? null;
	const words = (typeof m.getModifiers === "function" ? m.getModifiers() : []).map((x) => x.getText());

	return {
		name,
		is: kindName(m),
		// `#value` is a name the language keeps private: `name` starts with `#`.
		private: Boolean(name?.startsWith("#")),
		static: Boolean(m.isStatic?.()),
		readonly: words.includes("readonly"),
		accessor: words.includes("accessor"),
		visibility: words.find((w) => VISIBILITY.includes(w)) ?? null,
		type: memberType(m),
		decorators: decoratorsOf(m),
		line: startLine(m),
	};
};

const constructorParamsOf = (ctor: LooseNode | null): ConstructorParam[] =>
	(ctor?.getParameters?.() ?? []).map((p) => ({ name: p.getName?.() ?? "", type: p.getTypeNode?.()?.getText() ?? null, decorators: decoratorsOf(p) }));

// A class is a candidate like any other, so it receives every generic candidate
// fact (location, lines, kind, calls, assignments …) and adds only what a
// class has and nothing else does.
const classFact = (node: ClassNode, base: Candidate): Candidate => {
	const ctor = node.getConstructors()[0] ?? null;
	const members = node.getMembers();
	const baseExpr = node.getExtends();

	return {
		...base,
		members: members.map(memberFact),
		// `static { … }` runs once, at class definition — not a member, but code.
		// The parser spells it `ClassStaticBlockDeclaration`.
		staticBlocks: members.filter((m) => kindName(m).includes("StaticBlock")).length,
		extends: baseExpr ? nodeText(baseExpr) : null,
		implements: node.getImplements().map(nodeText),
		constructorParams: constructorParamsOf(ctor),
		hasConstructor: Boolean(ctor),
	};
};

export { classFact };

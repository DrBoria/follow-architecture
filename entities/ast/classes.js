"use strict";

// Class entities: members, decorators, base class, implemented interfaces and
// constructor parameters. That is what makes an Angular component / Nest
// provider / TypeORM entity expressible as a code role at all — and equally a
// plain model. The engine knows nothing about what `@Component` means.

const { SK, kindName, startLine, nodeText } = require("./tree");
const { lastMemberName } = require("./properties");

// Decorators on a node, by the NAME a filter can match: `@Component({…})` →
// "Component", `@core.Input()` → "Input". Framework-agnostic — any decorator,
// any framework.
const decoratorsOf = (node) =>
	(node.getDecorators?.() ?? []).map((d) => {
		const expr = d.getExpression();
		const name = expr.getKind() === SK.CallExpression ? (lastMemberName(expr.getExpression()) ?? nodeText(expr.getExpression())) : (lastMemberName(expr) ?? nodeText(expr));

		return { name, full: expr.getText(), line: startLine(d) };
	});

// What a member IS, beyond its name: a `#private` field, a `static` one, a
// `readonly`/`accessor` one, the visibility word, its type and the fact that a
// `static {}` block runs at class definition.
const memberFact = (m) => {
	const name = m.getName?.() ?? null;
	const typeNode = typeof m.getTypeNode === "function" ? m.getTypeNode() : null;
	const initializer = typeof m.getInitializer === "function" ? m.getInitializer() : null;
	const words = (typeof m.getModifiers === "function" ? m.getModifiers() : []).map((x) => x.getText());

	return {
		name,
		is: kindName(m),
		// `#value` is a name the language keeps private: `name` starts with `#`.
		private: Boolean(name?.startsWith("#")),
		static: Boolean(m.isStatic?.()),
		readonly: words.includes("readonly"),
		accessor: words.includes("accessor"),
		visibility: words.find((w) => ["private", "protected", "public"].includes(w)) ?? null,
		type: typeNode ? typeNode.getText() : (initializer ? initializer.getText() : null),
		decorators: decoratorsOf(m),
		line: startLine(m),
	};
};

// A class is a candidate like any other, so it receives every generic candidate
// fact (location, lines, kind, calls, assignments …) and adds only what a
// class has and nothing else does.
const classFact = (node, base) => {
	const ctor = node.getConstructors()[0] ?? null;
	const members = node.getMembers();

	return {
		...base,
		members: members.map(memberFact),
		// `static { … }` runs once, at class definition — not a member, but code.
		staticBlocks: members.filter((m) => String(m.getKindName?.() ?? "").includes("StaticBlock")).length,
				extends: node.getExtends() ? nodeText(node.getExtends()) : null,
				implements: node.getImplements().map(nodeText),
		constructorParams: ctor ? ctor.getParameters().map((p) => ({ name: p.getName(), type: p.getTypeNode()?.getText() ?? null, decorators: decoratorsOf(p) })) : [],
		hasConstructor: Boolean(ctor),
	};
};

module.exports = { classFact };

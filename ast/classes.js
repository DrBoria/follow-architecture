"use strict";

// Class entities: members, decorators, base class, implemented interfaces and
// constructor parameters. That is what makes an Angular component / Nest
// provider / TypeORM entity expressible as a code role at all — and equally a
// plain model. The engine knows nothing about what `@Component` means.

const { SK, kindName, startLine } = require("./tree");
const { lastMemberName } = require("./properties");

// Decorators on a node, by the NAME a filter can match: `@Component({…})` →
// "Component", `@core.Input()` → "Input". Framework-agnostic — any decorator,
// any framework.
const decoratorsOf = (node) =>
	(node.getDecorators?.() ?? []).map((d) => {
		const expr = d.getExpression();
		const name = expr.getKind() === SK.CallExpression ? lastMemberName(expr.getExpression()) ?? expr.getExpression().getText() : lastMemberName(expr) ?? expr.getText();

		return { name, full: expr.getText(), line: startLine(d) };
	});

// A class is a candidate like any other, so it receives every generic candidate
// fact (location, lines, kind, calls, assignments …) and adds only what a
// class has and nothing else does.
const classFact = (node, base) => {
	const ctor = node.getConstructors()[0] ?? null;

	return {
		...base,
		members: node.getMembers().map((m) => ({
			name: m.getName?.() ?? null,
			is: kindName(m),
			static: Boolean(m.isStatic?.()),
			decorators: decoratorsOf(m),
			line: startLine(m),
		})),
		decorators: decoratorsOf(node),
		extends: node.getExtends()?.getText() ?? null,
		implements: node.getImplements().map((i) => i.getText()),
		constructorParams: ctor ? ctor.getParameters().map((p) => ({ name: p.getName(), type: p.getTypeNode()?.getText() ?? null, decorators: decoratorsOf(p) })) : [],
		hasConstructor: Boolean(ctor),
	};
};

module.exports = { classFact };

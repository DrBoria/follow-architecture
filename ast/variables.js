"use strict";

// Variable declarations — what a variable is initialised with. That is the whole
// question: whether the binding may be reassigned is `mutable` (ast/tree.js),
// and who may write into the value is the `assign`/`mutate` relation.

const { SK, kindName, memberFacts } = require("./tree");
const { leftmostOrigin } = require("./properties");

// The initializer, in the same shape as `kind.initializer`: the parser's kind of
// the expression, its origin (`t.model(...)` → "t.model"), and — for an object
// literal — raw per-member facts.
const variableInitializer = (node) => {
	const init = node.getKind() === SK.VariableDeclaration ? node.getInitializer() : null;
	if (!init) return null;

	return {
		is: kindName(init),
		origin: leftmostOrigin(init),
		members: init.getKind() === SK.ObjectLiteralExpression ? memberFacts(init) : [],
	};
};

module.exports = { variableInitializer };

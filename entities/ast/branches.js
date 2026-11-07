"use strict";

// Control flow inside ONE piece: `if`, `?:`, `switch`/`case`, `try`/`catch`,
// `throw`, `break`/`continue`, `await`/`yield`. Facts, not verdicts — "does this
// branch?" is a query over the list.
//
// A branch is what a name can hide: `if (!ok) return;` and `return ok;` have the
// same `returns` count, and only the branch fact tells them apart.

const { SK, inThisPiece } = require("./tree");

const CONTROL_KINDS = new Map([
	[SK.IfStatement, "IfStatement"],
	[SK.ConditionalExpression, "ConditionalExpression"],
	[SK.SwitchStatement, "SwitchStatement"],
	[SK.CaseClause, "CaseClause"],
	[SK.DefaultClause, "DefaultClause"],
	[SK.TryStatement, "TryStatement"],
	[SK.CatchClause, "CatchClause"],
	[SK.ThrowStatement, "ThrowStatement"],
	[SK.BreakStatement, "BreakStatement"],
	[SK.ContinueStatement, "ContinueStatement"],
	[SK.AwaitExpression, "AwaitExpression"],
	[SK.YieldExpression, "YieldExpression"],
	[SK.VoidExpression, "VoidExpression"],
]);

// `{ is, line }` per control-flow node the piece runs itself. `is` is the parser's
// kind name, so a rule says `branches: { any: { is: { in: [IfStatement, …] } } }`.
const branchesFact = (node) =>
	node
		.getDescendants()
		.filter((d) => CONTROL_KINDS.has(d.getKind()) && inThisPiece(node, d))
		.map((d) => ({ is: CONTROL_KINDS.get(d.getKind()), line: d.getStartLineNumber() }));

module.exports = { branchesFact };

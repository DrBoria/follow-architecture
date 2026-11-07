"use strict";

// The entry point of the AST layer. Every entity module collects facts about
// ONE kind of node; this file puts them together into a candidate — the unit a
// role classifies — and hands back the public API the pipeline uses.
//
// Facts are plain data: no comparisons, no predicates, no project rules. The
// YAML pairs a fact with a filter (entities/queries.js) to express any rule.
// Nothing here names a project, a framework, or a role.
//
// A candidate describes a PIECE of code with four things and nothing else:
//   location    — where it is: `path` (the file) and `piece` (the piece it sits
//                 in, null at module scope)
//   lines       — the lines it spans, as one array: start, everything inside, end
//   parameters  — what it receives
//   actions     — what it does: `calls` here (running code), `assignments`
//                 (writing into a value), `returns` (the value it yields). The
//                 relations those actions form are produced in entities/kinds.js.

const { SK, isFunctionNode, isClassNode, linesOf, isExported, isMutable } = require("./tree");
const { createTsProject, loadSourceFile, importNameModules, collectFileFacts, repoRelative } = require("./file");
const { callsFact } = require("./calls");
const { returnsFact, parametersFact, nameOf, nearestFunction } = require("./functions");
const { branchesFact } = require("./branches");
const { variableInitializer } = require("./variables");
const { assignmentsFact } = require("./assignments");
const { classFact } = require("./classes");
const { typeFact, isTypeNode } = require("./types");
const { enumFact, isEnumNode } = require("./enums");
const { kindOf } = require("./kind");
const { usageFact } = require("./usage");
const { commentsOf } = require("./comments");

// Raw facts about a single candidate node. `rel` is the repo-relative file path
// — carried on the fact so location-aware operators (e.g. `location`) can match
// the candidate's position against node declarations.
const collectCandidateFacts = (node, sf, importMap, rel, repoRoot) => {
	const isFn = isFunctionNode(node);
	const enclosing = nearestFunction(node);

	return {
		name: isFn ? nameOf(node) : (node.getName ? node.getName() : null),
		// Where the code is: ONE fact. `path` is the file, `piece` the piece it is
		// nested in — `piece: null` means module scope, a fact and not a special case.
		// `nested` separates "no enclosing function" from "an enclosing function
		// without a name": a `const` inside `function () {…}` is still a LOCAL, and
		// reading its `piece: null` as module scope made the report ask the reader to
		// give a role to a one-line alias.
		location: { path: rel ?? null, piece: enclosing ? (nameOf(enclosing) ?? null) : null, nested: Boolean(enclosing) },
		lines: linesOf(node),
		// What it is, what is around and below it, and what it is SPELLED with.
		kind: kindOf(node, isFn ? null : variableInitializer(node)),
		returns: isFn ? returnsFact(node) : [],
		calls: isFn ? callsFact(node, importMap, sf, repoRoot) : [],
		// The control flow this piece runs ITSELF: a branch is what a name can hide.
		branches: isFn ? branchesFact(node) : [],
		assignments: assignmentsFact(node, sf, importMap, repoRoot, rel),
		parameters: isFn ? parametersFact(node, sf, repoRoot) : [],
		// Two facts about a DECLARATION that no action can express: is it
		// published, and may the binding be reassigned. Both are what the
		// language says, not a verdict.
		exported: isExported(node),
		mutable: isMutable(node),
		// ts-morph beyond the tree: who USES the name, who IMPLEMENTS the shape.
		// Not `kind`: these are answers from the checker, not the node's shape.
		...usageOf(node, sf, repoRoot),
	};
};

// Every classification candidate in the file (function-like nodes, variable
// declarations, classes and type declarations, and the comments), in document
// order.
//
// A comment is a candidate because a project may want to say things about it —
// this kind must carry a reason, that banner must separate sections, no comment
// may sit outside an action. Those are the same questions `location`, `lines`
// and `kind` already answer for code, so nothing new is invented for it: it is
// collected as a candidate and the YAML gives it a role like anything else.
const collectCandidates = (sf, importMap, rel, repoRoot) => {
	const declarations = sf
		.getDescendants()
		.filter((n) => isFunctionNode(n) || n.getKind() === SK.VariableDeclaration || isTypeNode(n) || isClassNode(n) || isEnumNode(n))
		.map((n) => {
			if (isClassNode(n)) return classFact(n, collectCandidateFacts(n, sf, importMap, rel, repoRoot));
			if (isEnumNode(n)) return { ...enumFact(n, rel), ...usageOf(n, sf, repoRoot) };

			if (isTypeNode(n)) return { ...typeFact(n, rel), ...usageOf(n, sf, repoRoot) };

			return collectCandidateFacts(n, sf, importMap, rel, repoRoot);
		});

	return [...declarations, ...commentsOf(sf, rel)].sort((a, b) => (a.lines[0] ?? 0) - (b.lines[0] ?? 0));
};

// ts-morph beyond the tree: who USES the name, and who implements the shape.
// Asked only for published names — a local binding's reach is its own file. The
// paths a use lives in are repo-relative, so a rule can ask WHERE it is used.
const usageOf = (node, sf, repoRoot) =>
	usageFact(node, sf, { exported: isExported(node), relOf: (p) => repoRelative(p, repoRoot) });

module.exports = { createTsProject, loadSourceFile, importNameModules, collectFileFacts, collectCandidates };

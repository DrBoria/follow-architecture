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

const { SK, isFunctionNode, isClassNode, kindFact, linesOf, isExported, isMutable } = require("./tree");
const { createTsProject, loadSourceFile, importNameModules, collectFileFacts } = require("./file");
const { callsFact } = require("./calls");
const { returnsFact, parametersFact, nameOf, nearestFunction } = require("./functions");
const { variableInitializer } = require("./variables");
const { assignmentsFact } = require("./assignments");
const { classFact } = require("./classes");
const { typeFact, isTypeNode } = require("./types");

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
		location: { path: rel ?? null, piece: enclosing ? (nameOf(enclosing) ?? null) : null },
		lines: linesOf(node),
		// What it is and what is around and below it — structure in one fact.
		kind: kindFact(node, isFn ? null : variableInitializer(node)),
		returns: isFn ? returnsFact(node) : [],
		calls: isFn ? callsFact(node, importMap) : [],
		assignments: assignmentsFact(node, sf, importMap, repoRoot, rel),
		parameters: isFn ? parametersFact(node, sf, repoRoot) : [],
		// Two facts about a DECLARATION that no action can express: is it
		// published, and may the binding be reassigned. Both are what the
		// language says, not a verdict.
		exported: isExported(node),
		mutable: isMutable(node),
	};
};

// Every classification candidate in the file (function-like nodes, variable
// declarations, classes and type declarations, in document order).
const collectCandidates = (sf, importMap, rel, repoRoot) =>
	sf
		.getDescendants()
		.filter((n) => isFunctionNode(n) || n.getKind() === SK.VariableDeclaration || isTypeNode(n) || isClassNode(n))
		.map((n) => {
			if (isClassNode(n)) return classFact(n, collectCandidateFacts(n, sf, importMap, rel, repoRoot));

			return isTypeNode(n) ? typeFact(n, rel) : collectCandidateFacts(n, sf, importMap, rel, repoRoot);
		});

module.exports = { createTsProject, loadSourceFile, importNameModules, collectFileFacts, collectCandidates };

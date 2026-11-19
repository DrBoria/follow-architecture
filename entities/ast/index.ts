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

import { Node, type SourceFile } from "ts-morph";
import { SK, isFunctionNode, isClassNode, linesOf, isExported, isMutable } from "./tree";
import { createTsProject, loadSourceFile, importNameModules, collectFileFacts, repoRelative } from "./file";
import { callsFact } from "./calls";
import { returnsFact, parametersFact, nameOf, nearestFunction } from "./functions";
import { branchesFact } from "./branches";
import { variableInitializer } from "./variables";
import { assignmentsFact } from "./assignments";
import { classFact } from "./classes";
import { typeFact, isTypeNode } from "./types";
import { enumFact, isEnumNode } from "./enums";
import { kindOf } from "./kind";
import { usageFact } from "./usage";
import { commentsOf } from "./comments";
import type { LooseNode } from "./loose";
import type { Candidate } from "../facts";
import type { FacetContext } from "../../frameworks/facet";

type ImportMap = ReadonlyMap<string, string>;

// Where one candidate's facts are collected: the facet's own per-file view
// (parsed file + place), with the file and anchor present, plus the import map
// the call/read facts resolve modules through.
type CandidateCtx = Required<Pick<FacetContext, "sf" | "rel" | "repoRoot">> & { importMap: ImportMap };

// ts-morph beyond the tree: who USES the name, and who implements the shape.
// Asked only for published names — a local binding's reach is its own file. The
// paths a use lives in are repo-relative, so a rule can ask WHERE it is used.
const usageOf = (node: LooseNode, sf: SourceFile, repoRoot: string): { references: Candidate["references"]; implementations: Candidate["implementations"] } =>
	usageFact(node, sf, { exported: isExported(node), relOf: (p) => repoRelative(p, repoRoot) ?? p });

// The name a candidate carries: a function-like node answers its own (an arrow
// takes its binding's name); anything else is its declaration's name.
const candidateName = (node: LooseNode, isFn: boolean): string | null => {
	if (isFn) return nameOf(node);

	return node.getName?.() ?? null;
};

// Raw facts about a single candidate node. `rel` is the repo-relative file path
// — carried on the fact so location-aware operators (e.g. `location`) can match
// the candidate's position against node declarations.
const collectCandidateFacts = (node: LooseNode, { sf, importMap, rel, repoRoot }: CandidateCtx): Candidate => {
	const isFn = isFunctionNode(node);
	const enclosing = nearestFunction(node);

	return {
		name: candidateName(node, isFn),
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
		assignments: assignmentsFact(node, sf, importMap, { repoRoot, rel }),
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

// Is this node a classification candidate? Function-like nodes, variable
// declarations, classes, types and enums — plus an export assignment that
// publishes a value with no binding of its own (`export default { … }`;
// `export default name` publishes an EXISTING piece, already a candidate).
const isCandidateNode = (n: Node): boolean => {
	if (n.getKind() === SK.ExportAssignment) return Node.isExportAssignment(n) && n.getExpression()?.getKind() !== SK.Identifier;

	return isFunctionNode(n) || n.getKind() === SK.VariableDeclaration || isTypeNode(n) || isClassNode(n) || isEnumNode(n);
};

// One declaration's facts: a class/type/enum adds only what its syntax has;
// everything else answers the generic candidate questions.
const declarationCandidate = (n: Node, ctx: CandidateCtx): Candidate => {
	if (Node.isClassDeclaration(n) || Node.isClassExpression(n)) return classFact(n, collectCandidateFacts(n, ctx));
	if (isEnumNode(n)) return { ...enumFact(n, ctx.rel ?? ""), ...usageOf(n, ctx.sf, ctx.repoRoot) };
	if (isTypeNode(n)) return { ...typeFact(n, ctx.rel ?? ""), ...usageOf(n, ctx.sf, ctx.repoRoot) };
	const facts = collectCandidateFacts(n, ctx);
	// An export assignment has no name node; the file's default export is
	// what a reader (and an import map) calls it.
	if (n.getKind() === SK.ExportAssignment && !facts.name) facts.name = "default";

	return facts;
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
const collectCandidates = (sf: SourceFile, importMap: ImportMap, rel: string | null, repoRoot: string): Candidate[] => {
	const ctx: CandidateCtx = { sf, importMap, rel, repoRoot };
	const declarations = sf
		.getDescendants()
		.filter(isCandidateNode)
		.map((n) => declarationCandidate(n, ctx));

	return [...declarations, ...commentsOf(sf, rel)].sort((a, b) => (a.lines?.[0] ?? 0) - (b.lines?.[0] ?? 0));
};

export { createTsProject, loadSourceFile, importNameModules, collectFileFacts, collectCandidates };

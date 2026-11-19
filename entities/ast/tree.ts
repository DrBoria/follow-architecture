"use strict";

// The syntax tree: what a node IS, what it is called, and where it sits.
// Everything here is a question about ONE node — never about a project, a role
// or a folder. Names come from ts-morph itself (`getKindName`), so the engine
// speaks exactly the vocabulary of the parser.

import { SyntaxKind as SK, Node, type SourceFile } from "ts-morph";
import { notice } from "../../report/notices";
import type { Descriptor, DescendantFact, MemberFact, KindFact, Initializer } from "../facts";
import type { LooseNode } from "./loose";

// Declarations that ARE an import: the parser's own names for the three forms.
// One list, because three passes ask the same question (`file.js` twice,
// `assignments.js` once) and an import is recognised the same way in all of them.
const IMPORT_DECL_KINDS = new Set(["ImportSpecifier", "ImportClause", "NamespaceImport"]);
const isImportDecl = (decl?: LooseNode): boolean => IMPORT_DECL_KINDS.has(decl?.getKindName?.());

// Function-like nodes — the candidates for any function-shaped role.
const FUNCTION_KINDS = new Set([
	SK.FunctionDeclaration,
	SK.FunctionExpression,
	SK.ArrowFunction,
	SK.MethodDeclaration,
	SK.GetAccessor,
	SK.SetAccessor,
]);

// Loops — body shape, not a verdict: "this body is a loop" is a rule's question.
const LOOP_KINDS = new Set([SK.ForStatement, SK.ForOfStatement, SK.ForInStatement, SK.WhileStatement, SK.DoStatement]);

// Call targets.
const CALL_KINDS = new Set([SK.CallExpression, SK.NewExpression, SK.TaggedTemplateExpression]);

// The name of a node's kind, as the parser spells it ("FunctionDeclaration").
const kindName = (node: Node): string => node.getKindName();

// A node's text as an IDENTITY, not as formatting. A fact is compared to what
// the architecture writes by hand (`origin: { equals: "t.model" }`,
// `source: { equals: "./x" }`), so the source LAYOUT must not leak into it: a
// chain broken across lines is the same callee, and roles silently stopped
// matching the moment it was not.
//
// Two rules, one helper:
//   • a LITERAL denotes its VALUE — `'./x'` names the module `./x`, quotes are
//     syntax and the import map holds the value; `Base<'a b'>` keeps its space;
//   • everything else is its spelling with the whitespace removed — whitespace
//     can never sit inside an identifier, a dot or `[0]`.
const QUOTED_OR_SPACE = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\s+/g;
const stripLayout = (text: string): string => text.replace(QUOTED_OR_SPACE, (match: string) => (/^["'`]/.test(match) ? match : ""));
const nodeText = (node: LooseNode | null): string => {
	if (!node) return "";
	const value = typeof node.getLiteralText === "function" ? node.getLiteralText() : null;
	if (typeof value === "string") return value;

	return stripLayout(String(node.getText?.() ?? ""));
};

const isFunctionNode = (n: Node): boolean => FUNCTION_KINDS.has(n.getKind());
const isLoopNode = (n: Node): boolean => LOOP_KINDS.has(n.getKind());
const isCallNode = (n: Node): boolean => CALL_KINDS.has(n.getKind());

// A class declaration or expression — a candidate like any other.
const isClassNode = (n: Node): boolean => n.getKind() === SK.ClassDeclaration || n.getKind() === SK.ClassExpression;

// Does a descendant belong to THIS piece, and not to a function nested inside
// it? A nested function is a candidate of its own, so what it does there is ITS
// work: counting it here too would attribute one line to two pieces.
const inThisPiece = (node: Node, d: Node): boolean => {
	for (let cur = d.getParent(); cur && cur !== node; cur = cur.getParent()) if (isFunctionNode(cur)) return false;

	return true;
};

// Unwrap parenthesized expressions: `() => ({...})` yields a
// ParenthesizedExpression whose `getExpression()` is the real ObjectLiteral.
const unwrapParens = (node: Node): Node => {
	let n = node;
	while (Node.isParenthesizedExpression(n)) n = n.getExpression();
	return n;
};

// ── One node: name, line, depth, members ────────────────────────────────────

// A type as the parser reads it, or "any".
const typeText = (node: Node): string | null => {
	try {
		const t = node.getType();
		return t.isAny() ? "any" : t.getText();
	} catch (error) {
		// The checker fails on an import it cannot resolve (a broken path, a package
		// that is not installed). That is NOT a type: the fact is UNKNOWN, and an
		// unknown type must not take the analysis of the whole run down with it. The
		// reason is reported, so a partial answer never passes for a clean one.
		const file = node.getSourceFile?.()?.getFilePath?.() ?? "?";
		const e: { message?: string } = error;
		notice(`a type could not be read (${file})`, e.message ?? String(e));

		return null;
	}
};

// Raw per-member facts of an object literal: `[{name, is, type}]`. The engine
// records DATA, not verdicts — "does this literal have methods?" is a query
// (`members: { some: { is: { equals: "MethodDeclaration" } } }`).
// A property whose initializer is a LITERAL also carries the VALUE it was written
// with (`'#182022'`, `12`, `0`). That is what makes a theme's `colors: { section:
// '#182022' }` readable as a COLOUR — a property of the thing itself, not of the
// folder it sits in.
const literalValueOf = (property: LooseNode): string | number | null => {
	const init = property.getInitializer?.();
	if (!init) return null;
	if (Node.isNumericLiteral(init)) return Number(init.getLiteralText());
	if (Node.isStringLiteral(init) || Node.isNoSubstitutionTemplateLiteral(init)) return init.getLiteralText();

	return null;
};

// A member whose initializer is ANOTHER object literal carries its own members —
// that is what makes `theme.colors.section` reachable as a fact. The walk stops at
// MAX_MEMBER_DEPTH so a pathological literal cannot turn a report into a full tree
// walk; what is NOT an object literal (`new Map(…)`, a call, a method shorthand)
// simply has no `members`, instead of an empty list that would read like "none".
const MAX_MEMBER_DEPTH = 4;

const memberFacts = (objLit: { getProperties(): LooseNode[] }, depth = 0): MemberFact[] =>
	objLit.getProperties().map((p) => {
		const init = p.getInitializer?.() ?? null;
		const nested = depth < MAX_MEMBER_DEPTH && init !== null && Node.isObjectLiteralExpression(init) ? init : null;

		return {
			name: typeof p.getName === "function" ? p.getName() : null,
			is: kindName(p),
			type: typeText(p),
			value: literalValueOf(p),
			...(nested ? { members: memberFacts(nested, depth + 1) } : {}),
		};
	});

// A descendant is meaningful when it is not a SyntaxList and not a punctuation
// token. Keywords (NumberKeyword, …) are kept — they are meaningful.
const isMeaningful = (d: Node): boolean => {
	if (d.getKind() === SK.SyntaxList) return false;
	const k = d.getKind();
	if (k >= SK.FirstToken && k <= SK.LastToken) return d.getKindName().endsWith("Keyword");

	return true;
};

const startLine = (n: Node): number => n.getSourceFile().getLineAndColumnAtPos(n.getStart()).line;

// A candidate's OWN IDENTITY: where it starts — file, line and column, as one
// comparable value. A name is not an identity (three files have a `run`), a line
// is not one either (a `const` and its arrow start on the same line), so every
// fact that points at a piece can point at this instead of at a name that
// aliases.
const selfOf = (rel: string, sf: SourceFile, pos: number): string => {
	const { line, column } = sf.getLineAndColumnAtPos(pos);

	return `${rel ?? ""}:${line}:${column}`;
};

// Depth of a node below `root` (0 = a direct child of the root).
const depthOf = (n: Node, root: Node): number => {
	let depth = 0;
	let p = n.getParent();
	while (p && p !== root) {
		depth += 1;
		p = p.getParent();
	}

	return depth;
};

// A node's own name. `getName()` throws on a destructured parameter
// (`({ a, b }) => …`): ts-morph's `getNameNode()` is undefined for a binding
// pattern, so the pattern's own text is what names it.
const nameOfNode = (node: LooseNode): string | null => {
	if (typeof node.getNameNode === "function") {
		const nameNode = node.getNameNode();

		return nameNode ? String(nameNode.getText()) : null;
	}

	return typeof node.getName === "function" ? (node.getName() ?? null) : null;
};

// Raw facts for ONE node, as the `kind` fact describes it. Every facet of
// `kind` — own, parent, ancestors, children, siblings, descendants — answers
// with this same descriptor; the extras (`depth`, `nested`, `members`, …) are
// what that particular facet knows on top of it.
const descriptor = (node: LooseNode): Descriptor => ({
	is: kindName(node),
	name: nameOfNode(node),
	line: startLine(node),
});

// Raw facts for one descendant node, relative to `root` (a file or a
// candidate). `nested` is set on function-like / loop nodes: true when another
// function-like node sits between the node and `root`.
const descendantFact = (d: LooseNode, root: Node, depth = 0): DescendantFact => {
	const f: DescendantFact = { ...descriptor(d), depth, snippet: d.getText().trim().slice(0, 120) };
	// A short, reportable label: the node's name when it has one, otherwise its
	// (trimmed) source text. Feeds the `{what}` / `{snippet}` report vars.
	f.snippet = d.getText().trim().slice(0, 120);
	if (d.getKind() === SK.AsExpression) {
		// The cast target as written; "is it `unknown`?" is the rule's question.
		f.type = d.getTypeNode()?.getText() ?? null;
	}
	if (Node.isObjectLiteralExpression(d)) f.members = memberFacts(d);
	if (isFunctionNode(d) || isLoopNode(d)) f.nested = isNestedIn(d, root) || (isFunctionNode(root) && d !== root);
	return f;
};

// Is a function-like descendant nested inside another function-like node that
// is itself inside the candidate?
const isNestedIn = (fn: Node, candidate: Node): boolean => {
	let n = fn.getParent();
	while (n && n !== candidate) {
		if (isFunctionNode(n)) return true;
		n = n.getParent();
	}

	return false;
};

// The lines a node spans, as ONE fact: `lines[0]` is where it starts,
// `lines[lines.length - 1]` where it ends, and everything the node contains is
// between them. A line count is `lines.length` — there is no second field for it.
const endLine = (n: Node): number => n.getSourceFile().getLineAndColumnAtPos(n.getEnd()).line;

// The consecutive lines `first..last` inclusive, as a plain array — the one
// spelling of "a span of lines" shared by `linesOf` (a node) and `linesOfRange`
// (a comment's trivia range).
const rangeLines = (first: number, last: number): number[] => {
	const out: number[] = [];
	for (let i = first; i <= last; i += 1) out.push(i);
	return out;
};

const linesOf = (node: Node): number[] => rangeLines(startLine(node), endLine(node));

// Is the declaration published? `export` sits on the STATEMENT, never on the
// value: for `export const f = () => …` it is written on the variable statement,
// so the search walks up to the node that carries it.
const isExported = (node: Node): boolean => {
	let target: LooseNode = node;
	while (target.getParent) {
		if (typeof target.getModifiers === "function" && target.getModifiers().some((m) => m.getKind() === SK.ExportKeyword)) return true;
		const parent = target.getParent();
		if (!parent || parent.getKind() === SK.Block || parent.getKind() === SK.SourceFile) break;
		target = parent;
	}
	return false;
};

// May the binding be reassigned? That is the `let`/`var` token and nothing else.
const isMutable = (node: Node): boolean => {
	if (!Node.isVariableDeclaration(node)) return false;
	const list = node.getParent();
	if (!Node.isVariableDeclarationList(list)) return false;
	const kind = String(list.getDeclarationKind());

	return kind === "let" || kind === "var";
};

// ── The `kind` fact: a node's place in the tree ─────────────────────────────
//
// ONE fact for the node's position, and ONE shape for every entry in it. A rule
// that says "a function" is almost always too wide — a function is a
// declaration, a field of an object literal, a callback, a class method…
//
//   kind.own         — the node itself
//   kind.parent      — what holds it
//   kind.ancestors   — everything above it, nearest first
//   kind.children    — its direct children
//   kind.siblings    — the nodes next to it
//   kind.descendants — everything below it, flat
//   kind.initializer — what a declaration is initialised with
//
// Every entry is the SAME descriptor — `{ is, name, line }` — plus whatever that
// node has on top (`depth`, `nested`, `members`, …). One interface means one set
// of filters: `is`, `origin`, `members`, `depth` are queried with `equals` /
// `in` / `any` / … like any other fact, and no entry needs its own vocabulary.
// "What is around and below this node" is ONE question with ONE answer.
// The docs the parser attached to this declaration. A function carries its own;
// a binding does not — its doc hangs on the STATEMENT that declares it, and a
// function expression is what that binding is initialised WITH, so it is the
// same statement's doc. The climb goes through those wrappers only: never to an
// enclosing function, whose doc says nothing about this node.
const isVariableHolder = (n: LooseNode): boolean => {
	const kind = n.getKind();

	return kind === SK.VariableDeclaration || kind === SK.VariableDeclarationList;
};

const jsDocsOf = (n: LooseNode): Node[] => n.getJsDocs?.() ?? [];
const parentOf = (n: LooseNode): LooseNode | undefined => n.getParent?.();

const holdsAsInitializer = (parent: LooseNode | undefined, child: LooseNode): boolean =>
	parent !== undefined && parent.getKind() === SK.VariableDeclaration && parent.getInitializer?.() === child;

const docsOf = (node: LooseNode): Node[] => {
	let holder: LooseNode = node;
	while (holder.getKind() !== SK.VariableStatement) {
		const parent = parentOf(holder);
		if (!isVariableHolder(holder) && !holdsAsInitializer(parent, holder)) break;
		holder = parent;
	}
	const docs = jsDocsOf(holder);

	return docs.length ? docs : jsDocsOf(node);
};

// Everything below the node: no SyntaxList, no punctuation tokens — and the
// node's own documentation, which the parser keeps beside it rather than inside
// it. A doc block is a node like any other, so "what is written above this
// declaration" is a query over the same list, told apart by `is`.
const descendantsOf = (node: LooseNode): DescendantFact[] => {
	const seen = new Set<string>();
	const nodes = [...docsOf(node), ...node.getDescendants()].filter((d) => {
		// Identity is kind + span, not `getPos()`: several nodes start at the same
		// position (a statement, its declaration list and its first keyword all
		// begin together), and keying by position dropped the whole statement.
		const id = `${d.getKind()}:${d.getStart()}:${d.getEnd()}`;
		if (seen.has(id)) return false;
		seen.add(id);

		return isMeaningful(d);
	});

	return nodes.map((d) => descendantFact(d, node, depthOf(d, node)));
};

const ancestorsOf = (n: LooseNode): Descriptor[] => {
	const ancestors: Descriptor[] = [];
	let cur: LooseNode | undefined = n.getParent?.();
	for (let depth = 0; cur !== undefined && depth < 8; depth += 1) {
		ancestors.push(descriptor(cur));
		cur = cur.getParent?.();
	}

	return ancestors;
};

const initializerFact = (initializer: Initializer | null): Initializer | null => {
	if (!initializer) return null;

	return { is: initializer.is, origin: initializer.origin, members: initializer.members ?? [], ...(initializer.value !== undefined ? { value: initializer.value } : {}) };
};

const kindFact = (n: LooseNode, initializer: Initializer | null = null): KindFact => {
	const parent: LooseNode | null = n.getParent?.() ?? null;

	return {
		own: descriptor(n),
		parent: parent ? descriptor(parent) : null,
		ancestors: ancestorsOf(n),
		children: (n.getChildren?.() ?? []).map(descriptor),
		siblings: (parent?.getChildren?.() ?? []).filter((c) => c !== n).map(descriptor),
		descendants: descendantsOf(n),
		initializer: initializerFact(initializer),
	};
};

export { SK, kindName, isImportDecl, nameOfNode, nodeText, isFunctionNode, isCallNode, isClassNode, inThisPiece, unwrapParens, typeText, memberFacts, isMeaningful, startLine, selfOf, linesOf, rangeLines, isExported, isMutable, depthOf, descriptor, descendantFact, descendantsOf, kindFact };

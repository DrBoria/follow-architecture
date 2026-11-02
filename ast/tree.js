"use strict";

// The syntax tree: what a node IS, what it is called, and where it sits.
// Everything here is a question about ONE node — never about a project, a role
// or a folder. Names come from ts-morph itself (`getKindName`), so the engine
// speaks exactly the vocabulary of the parser.

const { SyntaxKind: SK } = require("ts-morph");

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
const LOOP_KINDS = new Set([SK.ForStatement, SK.ForOfStatement, SK.ForInStatement, SK.WhileStatement, SK.DoStatement, SK.DoWhileStatement]);

// Call targets.
const CALL_KINDS = new Set([SK.CallExpression, SK.NewExpression, SK.TaggedTemplateExpression]);

// The name of a node's kind, as the parser spells it ("FunctionDeclaration").
const kindName = (node) => node.getKindName();

const isFunctionNode = (n) => FUNCTION_KINDS.has(n.getKind());
const isLoopNode = (n) => LOOP_KINDS.has(n.getKind());
const isCallNode = (n) => CALL_KINDS.has(n.getKind());

// A class declaration or expression — a candidate like any other.
const isClassNode = (n) => n.getKind() === SK.ClassDeclaration || n.getKind() === SK.ClassExpression;

// Unwrap parenthesized expressions: `() => ({...})` yields a
// ParenthesizedExpression whose `getExpression()` is the real ObjectLiteral.
const unwrapParens = (node) => {
	let n = node;
	while (n != null && n.getKind() === SK.ParenthesizedExpression) n = n.getExpression();
	return n;
};

// ── One node: name, line, depth, members ────────────────────────────────────

// A type as the parser reads it, or "any".
const typeText = (node) => {
	const t = node.getType();
	return t.isAny() ? "any" : t.getText();
};

// Raw per-member facts of an object literal: `[{name, is, type}]`. The engine
// records DATA, not verdicts — "does this literal have methods?" is a query
// (`members: { some: { is: { equals: "MethodDeclaration" } } }`).
const memberFacts = (objLit) =>
	objLit.getProperties().map((p) => ({
		name: typeof p.getName === "function" ? p.getName() : null,
		is: kindName(p),
		type: typeText(p),
	}));

// A descendant is meaningful when it is not a SyntaxList and not a punctuation
// token. Keywords (NumberKeyword, …) are kept — they are meaningful.
const isMeaningful = (d) => {
	if (d.getKind() === SK.SyntaxList) return false;
	const k = d.getKind();
	if (k >= SK.FirstToken && k <= SK.LastToken) return d.getKindName().endsWith("Keyword");

	return true;
};

const startLine = (n) => n.getSourceFile().getLineAndColumnAtPos(n.getStart()).line;

// Depth of a node below `root` (0 = a direct child of the root).
const depthOf = (n, root) => {
	let depth = 0;
	let p = n.getParent();
	while (p && p !== root) {
		depth += 1;
		p = p.getParent();
	}

	return depth;
};

// Raw facts for ONE node, as the `kind` fact describes it. Every facet of
// `kind` — own, parent, ancestors, children, siblings, descendants — answers
// with this same descriptor; the extras (`depth`, `nested`, `members`, …) are
// what that particular facet knows on top of it.
const descriptor = (node) => ({
	is: kindName(node),
	name: node.getName ? (node.getName() ?? null) : null,
	line: startLine(node),
});

// Raw facts for one descendant node, relative to `root` (a file or a
// candidate). `nested` is set on function-like / loop nodes: true when another
// function-like node sits between the node and `root`.
const descendantFact = (d, root, depth = 0) => {
	const f = { ...descriptor(d), depth };
	// A short, reportable label: the node's name when it has one, otherwise its
	// (trimmed) source text. Feeds the `{what}` / `{snippet}` report vars.
	f.snippet = d.getText().trim().slice(0, 120);
	if (d.getKind() === SK.AsExpression) {
		// The cast target as written; "is it `unknown`?" is the rule's question.
		f.type = d.getTypeNode()?.getText() ?? null;
	}
	if (d.getKind() === SK.ObjectLiteralExpression) f.members = memberFacts(d);
	if (isFunctionNode(d) || isLoopNode(d)) f.nested = isNestedIn(d, root) || (isFunctionNode(root) && d !== root);
	return f;
};

// Is a function-like descendant nested inside another function-like node that
// is itself inside the candidate?
const isNestedIn = (fn, candidate) => {
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
const endLine = (n) => n.getSourceFile().getLineAndColumnAtPos(n.getEnd()).line;

const linesOf = (node) => {
	const first = startLine(node);
	const last = endLine(node);
	const out = [];
	for (let i = first; i <= last; i += 1) out.push(i);
	return out;
};

// Is the declaration published? `export` sits on the STATEMENT, never on the
// value: for `export const f = () => …` it is written on the variable statement,
// so the search walks up to the node that carries it.
const isExported = (node) => {
	let target = node;
	while (target.getParent) {
		if (typeof target.getModifiers === "function" && target.getModifiers().some((m) => m.getKind() === SK.ExportKeyword)) return true;
		const parent = target.getParent();
		if (!parent || parent.getKind() === SK.Block || parent.getKind() === SK.SourceFile) break;
		target = parent;
	}
	return false;
};

// May the binding be reassigned? That is the `let`/`var` token and nothing else.
const isMutable = (node) => (node.getKind() === SK.VariableDeclaration ? node.getParent()?.getDeclarationKind?.() === "let" || node.getParent()?.getDeclarationKind?.() === "var" : false);

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
// Everything below the node: no SyntaxList, no punctuation tokens.
const descendantsOf = (node) => node.getDescendants().filter(isMeaningful).map((d) => descendantFact(d, node, depthOf(d, node)));

const kindFact = (n, initializer) => {
	const parent = n.getParent?.() ?? null;
	const ancestors = [];
	for (let cur = parent, depth = 0; cur && depth < 8; cur = cur.getParent?.() ?? null, depth += 1) ancestors.push(descriptor(cur));
	return {
		own: descriptor(n),
		parent: parent ? descriptor(parent) : null,
		ancestors,
		children: (n.getChildren?.() ?? []).map(descriptor),
		siblings: (parent?.getChildren?.() ?? []).filter((c) => c !== n).map(descriptor),
		// The whole subtree, flat. Same descriptors as every other facet — "what is
		// around and below this node" is ONE fact, not six.
		descendants: descendantsOf(n),
		// Same descriptor as every other facet: `is` says what it is, and an
		// initializer adds where it comes from and what it is made of.
		initializer: initializer ? { is: initializer.is, origin: initializer.origin, members: initializer.members ?? [] } : null,
	};
};

module.exports = {
	SK,
	kindName,
	isFunctionNode,
	isCallNode,
	isClassNode,
	unwrapParens,
	typeText,
	memberFacts,
	isMeaningful,
	startLine,
	linesOf,
	isExported,
	isMutable,
	depthOf,
	descriptor,
	descendantFact,
	descendantsOf,
	kindFact,
};

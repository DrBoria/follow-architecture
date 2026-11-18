"use strict";

// The syntax tree: what a node IS, what it is called, and where it sits.
// Everything here is a question about ONE node — never about a project, a role
// or a folder. Names come from ts-morph itself (`getKindName`), so the engine
// speaks exactly the vocabulary of the parser.

const { SyntaxKind: SK } = require("ts-morph");
const { notice } = require("../../report/notices");

// Declarations that ARE an import: the parser's own names for the three forms.
// One list, because three passes ask the same question (`file.js` twice,
// `assignments.js` once) and an import is recognised the same way in all of them.
const IMPORT_DECL_KINDS = new Set(["ImportSpecifier", "ImportClause", "NamespaceImport"]);
const isImportDecl = (decl) => IMPORT_DECL_KINDS.has(decl?.getKindName?.());

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
const stripLayout = (text) => text.replace(QUOTED_OR_SPACE, (match) => (/^["'`]/.test(match) ? match : ""));
const nodeText = (node) => {
	if (!node) return "";
	const value = typeof node.getLiteralText === "function" ? node.getLiteralText() : null;
	if (typeof value === "string") return value;

	return stripLayout(String(node.getText?.() ?? ""));
};

const isFunctionNode = (n) => FUNCTION_KINDS.has(n.getKind());
const isLoopNode = (n) => LOOP_KINDS.has(n.getKind());
const isCallNode = (n) => CALL_KINDS.has(n.getKind());

// A class declaration or expression — a candidate like any other.
const isClassNode = (n) => n.getKind() === SK.ClassDeclaration || n.getKind() === SK.ClassExpression;

// Does a descendant belong to THIS piece, and not to a function nested inside
// it? A nested function is a candidate of its own, so what it does there is ITS
// work: counting it here too would attribute one line to two pieces.
const inThisPiece = (node, d) => {
	for (let cur = d.getParent(); cur && cur !== node; cur = cur.getParent()) if (isFunctionNode(cur)) return false;

	return true;
};

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
	try {
		const t = node.getType();
		return t.isAny() ? "any" : t.getText();
	} catch (error) {
		// The checker fails on an import it cannot resolve (a broken path, a package
		// that is not installed). That is NOT a type: the fact is UNKNOWN, and an
		// unknown type must not take the analysis of the whole run down with it. The
		// reason is reported, so a partial answer never passes for a clean one.
		const file = node.getSourceFile?.()?.getFilePath?.() ?? "?";
		notice(`a type could not be read (${file})`, error && error.message ? error.message : String(error));

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
const literalValueOf = (property) => {
	const init = property.getInitializer?.();
	if (!init) return null;
	const kind = init.getKind?.();
	const isLiteral = kind === SK.StringLiteral || kind === SK.NoSubstitutionTemplateLiteral || kind === SK.NumericLiteral;
	if (!isLiteral) return null;

	return kind === SK.NumericLiteral ? Number(init.getLiteralText?.()) : String(init.getLiteralText?.());
};

// A member whose initializer is ANOTHER object literal carries its own members —
// that is what makes `theme.colors.section` reachable as a fact. The walk stops at
// MAX_MEMBER_DEPTH so a pathological literal cannot turn a report into a full tree
// walk; what is NOT an object literal (`new Map(…)`, a call, a method shorthand)
// simply has no `members`, instead of an empty list that would read like "none".
const MAX_MEMBER_DEPTH = 4;

const memberFacts = (objLit, depth = 0) =>
	objLit.getProperties().map((p) => {
		const init = p.getInitializer?.() ?? null;
		const nested = depth < MAX_MEMBER_DEPTH && init?.getKind?.() === SK.ObjectLiteralExpression;

		return {
			name: typeof p.getName === "function" ? p.getName() : null,
			is: kindName(p),
			type: typeText(p),
			value: literalValueOf(p),
			...(nested ? { members: memberFacts(init, depth + 1) } : {}),
		};
	});

// A descendant is meaningful when it is not a SyntaxList and not a punctuation
// token. Keywords (NumberKeyword, …) are kept — they are meaningful.
const isMeaningful = (d) => {
	if (d.getKind() === SK.SyntaxList) return false;
	const k = d.getKind();
	if (k >= SK.FirstToken && k <= SK.LastToken) return d.getKindName().endsWith("Keyword");

	return true;
};

const startLine = (n) => n.getSourceFile().getLineAndColumnAtPos(n.getStart()).line;

// A candidate's OWN IDENTITY: where it starts — file, line and column, as one
// comparable value. A name is not an identity (three files have a `run`), a line
// is not one either (a `const` and its arrow start on the same line), so every
// fact that points at a piece can point at this instead of at a name that
// aliases.
const selfOf = (rel, sf, pos) => {
	const { line, column } = sf.getLineAndColumnAtPos(pos);

	return `${rel ?? ""}:${line}:${column}`;
};

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

// A node's own name. `getName()` throws on a destructured parameter
// (`({ a, b }) => …`): ts-morph's `getNameNode()` is undefined for a binding
// pattern, so the pattern's own text is what names it.
const nameOfNode = (node) => {
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
const descriptor = (node) => ({
	is: kindName(node),
	name: nameOfNode(node),
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
// The docs the parser attached to this declaration. A function carries its own;
// a binding does not — its doc hangs on the STATEMENT that declares it, and a
// function expression is what that binding is initialised WITH, so it is the
// same statement's doc. The climb goes through those wrappers only: never to an
// enclosing function, whose doc says nothing about this node.
const docsOf = (node) => {
	let holder = node;
	while (holder && holder.getKind() !== SK.VariableStatement) {
		const kind = holder.getKind();
		const isBinding = kind === SK.VariableDeclaration || kind === SK.VariableDeclarationList;
		const parent = holder.getParent?.();
		const isInitializer = parent?.getKind?.() === SK.VariableDeclaration && parent.getInitializer?.() === holder;
		if (!isBinding && !isInitializer) break;
		holder = parent;
	}
	const docs = holder?.getJsDocs?.() ?? [];

	return docs.length ? docs : (node.getJsDocs?.() ?? []);
};

// Everything below the node: no SyntaxList, no punctuation tokens — and the
// node's own documentation, which the parser keeps beside it rather than inside
// it. A doc block is a node like any other, so "what is written above this
// declaration" is a query over the same list, told apart by `is`.
const descendantsOf = (node) => {
	const seen = new Set();
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
		// initializer adds where it comes from and what it is made of. A static
		// string initializer keeps its text (`value`) — a class list written once
		// as `const cls = "flex p-4"` is readable through its name.
		initializer: initializer ? { is: initializer.is, origin: initializer.origin, members: initializer.members ?? [], ...(initializer.value !== undefined ? { value: initializer.value } : {}) } : null,
	};
};

module.exports = {
	SK,
	kindName,
	isImportDecl,
	nameOfNode,
	nodeText,
	isFunctionNode,
	isCallNode,
	isClassNode,
	inThisPiece,
	unwrapParens,
	typeText,
	memberFacts,
	isMeaningful,
	startLine,
	selfOf,
	linesOf,
	isExported,
	isMutable,
	depthOf,
	descriptor,
	descendantFact,
	descendantsOf,
	kindFact,
};

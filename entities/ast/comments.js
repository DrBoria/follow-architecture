"use strict";

// A COMMENT IS A PLACE, NOT A NOTE ABOUT A PLACE.
//
// It occupies lines in a file, it sits inside (or outside) a declaration, and a
// project may want to say things about it: this kind has to carry a reason, that
// banner has to separate sections, no comment may appear outside an action. All
// of that is already the vocabulary the engine speaks — `location`, `lines`,
// `kind` — so a comment is collected as a CANDIDATE, exactly like a function or
// a type, and the architecture gives it a role the same way.
//
// What is a fact here: which syntactic form the comment has, its raw text, the
// lines it covers and where it sits. What is NOT: whether the comment is wanted,
// long, or in the right place — that is a role and a rule in the YAML.

const { SK, isFunctionNode, isClassNode, kindFact } = require("./tree");
const { spelled } = require("./kind");
const { nameOf } = require("./functions");

// The three forms the language distinguishes. The doc form is not a separate
// trivia kind to the compiler — it is a block comment whose text opens with
// `*` — but it is a separate thing to every reader and to the tooling, so it is
// named as its own kind instead of leaving the YAML to slice strings.
const kindOf = (range, text) => {
	if (range.getKind() === SK.SingleLineCommentTrivia) return "SingleLineCommentTrivia";

	return text.startsWith("/**") ? "JSDocComment" : "MultiLineCommentTrivia";
};

// Every comment in the file, each once, in document order. A comment is trivia
// of the token that follows it, so the walk asks every node for the comments
// around it and keeps them by position — the file itself carries the ones above
// the first token.
const rangesOf = (sf) => {
	const text = sf.getFullText();
	const byPos = new Map();
	for (const node of [sf, ...sf.getDescendants()]) {
		const ranges = [...(node.getLeadingCommentRanges?.() ?? []), ...(node.getTrailingCommentRanges?.() ?? [])];
		for (const range of ranges) if (!byPos.has(range.getPos())) byPos.set(range.getPos(), range);
	}

	return [...byPos.values()].sort((a, b) => a.getPos() - b.getPos()).map((range) => ({ pos: range.getPos(), end: range.getEnd(), kind: kindOf(range, text.slice(range.getPos(), range.getEnd())) }));
};

// A comment is TRIVIA — text between tokens — but the parser still builds a node
// for a doc block, and that node has a subtree of its own: `JSDocParameterTag`
// (with the parameter's name), `JSDocReturnTag`, `JSDocTypeExpression`… So the
// inside of a doc block is described by the SAME machinery as any other node —
// no `tags` field, no list of known tag names, nothing to keep in sync with the
// language. Any comment that has no node of its own simply has no subtree.
const nodesByPos = (sf) => {
	const byPos = new Map();
	for (const node of sf.getDescendants()) if (!byPos.has(node.getStart())) byPos.set(node.getStart(), node);

	return byPos;
};

// The lines a comment covers. `end` is exclusive, so the last line is the one
// the last character sits on — a block that ends with `*/` belongs to its own
// last line, not to the one after it.
const linesOfRange = (sf, pos, end) => {
	const first = sf.getLineAndColumnAtPos(pos).line;
	const last = sf.getLineAndColumnAtPos(Math.max(pos, end - 1)).line;
	const out = [];
	for (let line = first; line <= last; line += 1) out.push(line);

	return out;
};

// The deepest function or class a comment sits inside. A doc block above a
// declaration is NOT inside it (it starts before the declaration does), which is
// the distinction a rule needs to say "no comments outside the action".
const pieceAt = (sf, pos) => {
	let best = null;
	for (const node of sf.getDescendants()) {
		if (!isFunctionNode(node) && !isClassNode(node)) continue;
		if (node.getStart() > pos || node.getEnd() < pos) continue;
		if (!best || node.getStart() > best.getStart()) best = node;
	}

	return best;
};

// The candidates. Each one carries the same facts every other candidate carries
// (where it is, the lines it spans, what kind it is) plus what only a comment
// has: its text, markers included — the markers are what tells a doc block from
// a plain block, and stripping them would throw that away.
const commentsOf = (sf, rel) => {
	const text = sf.getFullText();
	const nodes = nodesByPos(sf);

	return rangesOf(sf).map(({ pos, end, kind }) => {
		const piece = pieceAt(sf, pos);
		const own = text.slice(pos, end);
		const node = nodes.get(pos);

		return {
			name: null,
			location: { path: rel ?? null, piece: piece ? (nameOf(piece) ?? null) : null, nested: Boolean(piece) },
			lines: linesOfRange(sf, pos, end),
			// Same descriptor every other candidate uses for "what this is": the
			// comment's own syntactic form — and, when the parser has a node for it, the
			// node's whole neighbourhood and subtree: `JSDocParameterTag` with the
			// parameter's name, `JSDocReturnTag`, `JSDocTypeExpression`… The inside of a
			// doc block is read through `is`, like any other code, so a rule never needs
			// a list of tag names kept in sync with the language.
			kind: node ? { ...kindFact(node), ...spelled(kind), own: { is: kind } } : spelled(kind),
			text: own,
			// A comment has no actions: it runs nothing, writes nothing, yields
			// nothing. Stated, because every candidate answers every question.
			returns: [],
			calls: [],
			branches: [],
			assignments: [],
			parameters: [],
			exported: false,
			mutable: false,
			references: null,
			implementations: null,
		};
	});
};

module.exports = { commentsOf };

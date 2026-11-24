"use strict";

// A declaration value as PIECES: the literal text the template wrote, and the
// expressions it quoted. The split is a POSITION, not a marker — an expression
// is replaced by blanks of its own length in the text, so its offset still
// points at the place it occupies, and a resolver can walk back to the
// TypeScript node it came from.

import type { TemplateExpr } from "../styled/facts";

// A declaration value, split at the expressions it quoted. An expression is a
// QUESTION for TypeScript, kept as an index into the template's expression list.
type Piece = { kind: "text"; text: string } | { kind: "expr"; index: number; text: string };

// A range inside a value's text — a problem's SPAN, what the report highlights.
// eslint-disable-next-line md-code-entities/entities-uniqueness -- a bare range; the report's highlight adds its text and kind
type Span = { start: number; end: number };

// A problem the resolver hit on ONE branch: a KIND (a stable identifier the
// report layer matches on) plus the data the kind carries (a variable name, the
// text it applied to). Never prose — the sentence is composed in the report
// layer from the kind.
type BranchProblem = { kind: string; name?: string; text?: string };

// One partial reading while the pieces are folded together. `problems` is not a
// verdict about the CSS — it is "this branch could not be finished". `directive`
// marks a piece that is not a VALUE at all: a nested style block / keyframes that
// expands to declarations of its own (checked in the template that wrote it), so
// an empty directive branch is "nothing to judge", not an unresolved value.
// `absent` carries the providers a fixed path was missing in. `dynamic` marks a
// branch whose value is only known at runtime: its text is a placeholder SHAPE.
type Branch = { text: string; provider: string | null; media: string | null; problems: BranchProblem[]; directive?: boolean; dynamic?: boolean; absent?: { provider: string; text: string }[] };

// The pieces of `span` in `text`, using the ABSOLUTE offsets the expressions
// were recorded at. Both readings (a whole template, or one value string) use
// this one walk; `base` is the offset `text` starts at.
const literalPiece = (text: string, from: number, to: number, base: number): Piece[] => (from < to ? [{ kind: "text", text: text.slice(from - base, to - base) }] : []);

const piecesOfRange = (text: string, exprs: readonly TemplateExpr[], span: { from: number; to: number; base: number }): Piece[] => {
	const next = [...exprs].filter((expr) => expr.offset >= span.from && expr.offset < span.to).sort((a, b) => a.offset - b.offset)[0];
	if (!next) return literalPiece(text, span.from, span.to, span.base);

	return [
		...literalPiece(text, span.from, next.offset, span.base),
		{ kind: "expr", index: next.index, text: next.text },
		...piecesOfRange(text, exprs, { from: next.offset + next.text.length, to: span.to, base: span.base }),
	];
};

// What the declaration wrote, with each expression spelled back as `${…}` so a
// report can quote it. This is a FACT, not a template: the blanks are gone.
const rawValueOf = (pieces: Piece[]): string => pieces.map((piece) => (piece.kind === "text" ? piece.text : `\${${piece.text}}`)).join("");

// Whitespace in a substituted value is layout, not content: blanks and the
// spacing around them collapse to one space.
const collapseSpaces = (text: string): string => text.replace(/\s+/g, " ").trim();

export { piecesOfRange, rawValueOf, collapseSpaces };
export type { Piece, Branch, BranchProblem, Span };

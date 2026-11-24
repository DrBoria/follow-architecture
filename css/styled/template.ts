"use strict";

// The TEMPLATE reader: a tagged template's CSS text, plus the map back to the
// TypeScript expressions it quotes. This is syntax-agnostic — it reads the
// template's literal parts and spans, whatever the tag is called. The CONTENT
// gate (is this CSS at all?) lives with the `css` syntax provider
// (`syntax/gate`); this only reads what is there.

import { Node, type Expression, type TaggedTemplateExpression } from "ts-morph";
import { SK } from "../../entities/ast/tree";
import { climbFrom } from "../../entities/ast/climb";

// One expression a template quotes, with the position its blanks occupy in the
// substituted text. The link back to TypeScript is a POSITION, not a marker.
type TemplateExpr = { index: number; text: string; line: number; offset: number };
type TemplateSource = { text: string; exprs: TemplateExpr[] };
// The template node itself — either a plain literal or a substitution template.
type TemplateLiteralNode = ReturnType<TaggedTemplateExpression["getTemplate"]>;

// The template as parseable CSS plus the map back to the expressions it quotes.
// An expression contributes NOTHING to the CSS text: it is not a value, it is a
// question for TypeScript. It is REPLACED by blanks of its own length, so the
// text stays parseable and every declaration's source offsets still point at the
// place the expression occupies — the link is a position, not a marker and not a
// guess.
const templateLiteralSource = (template: TemplateLiteralNode): TemplateSource => {
	if (Node.isNoSubstitutionTemplateLiteral(template)) return { text: template.getLiteralText(), exprs: [] };

	const head = template.getHead();
	const spans = template.getTemplateSpans();
	let text = head.getLiteralText();
	const exprs: TemplateExpr[] = [];
	for (const [index, span] of spans.entries()) {
		const expression = span.getExpression();
		const source = expression.getText();
		const literal = span.getLiteral().getLiteralText();
		exprs.push({ index, text: source, line: expression.getStartLineNumber(), offset: text.length });
		text += " ".repeat(source.length) + literal;
	}

	return { text, exprs };
};

const templateSource = (node: TaggedTemplateExpression): TemplateSource => templateLiteralSource(node.getTemplate());

// The TypeScript expressions a template quotes, in the SAME order as
// `TemplateExpr.index` — the resolver's way from a blank back to its question.
const expressionNodesOf = (template: TemplateLiteralNode): Expression[] => (Node.isNoSubstitutionTemplateLiteral(template) ? [] : template.getTemplateSpans().map((span) => span.getExpression()));

// The comment a declaration is documented by, read from the TypeScript source
// (above the template, above the `const`) — because a styled template's own
// comment lives outside the CSS text.
// A template literal carries no comment of its own: the doc of `const Title =
// styled.h2`…`` hangs on the STATEMENT, so the climb goes through the binding —
// the shared climb (`entities/ast/climb`), with this reader's own wrappers.
const TEMPLATE_HOLDERS = new Set([SK.TaggedTemplateExpression, SK.VariableDeclaration, SK.VariableDeclarationList]);

const commentHolder = (node: TaggedTemplateExpression): Node =>
	climbFrom(node, {
		isHolder: (holder) => holder.getKind() === SK.VariableStatement,
		passesThrough: (holder) => TEMPLATE_HOLDERS.has(holder.getKind()),
	}).node;

const leadingCommentOf = (node: TaggedTemplateExpression): { text: string; line: number | null } | null => {
	const holder = commentHolder(node);
	const ranges = holder.getLeadingCommentRanges();
	if (!ranges.length) return null;
	const last = ranges[ranges.length - 1];
	const line = last.getPos() >= 0 ? node.getSourceFile().getLineAndColumnAtPos(last.getPos()).line : null;

	return { text: last.getText().replace(/^\/\*\*?|\*\/$/g, "").trim(), line };
};

export { templateSource, templateLiteralSource, expressionNodesOf, leadingCommentOf };
export type { TemplateExpr, TemplateSource, TemplateLiteralNode };

"use strict";

// CSS as a FACT SOURCE, next to `ast` (which is the language). The engine has no
// opinion about styles: it says what is written — which declarations, which
// values were typed by hand, which `var(--x)` and which `theme.*` were read — and
// the rules decide what that means.
//
// The facet is FUNCTIONS over a SYNTAX, never a closed implementation:
//
//   values.js      one value, classified (css-tree) — syntax-agnostic
//   document.js    one postcss walk, parameterised by a parser
//   syntax/        providers: `css`, `scss` (and whatever registers next)
//   tailwind.js    class names, read through Tailwind itself
//   markup.js      the class attribute of one element, in any framework
//   index.js       this file: the entry points the pipeline calls
//
// Adding SCSS or Less is a `syntax.register()`, not a change here; a rule written
// against `css.declarations` keeps working because the SHAPE is the contract.
//
// CSS-in-JS is the same pipeline over a substituted template: `${expr}` becomes
// `md_expr_N`, the placeholder→node map keeps the link back to TypeScript, so a
// declaration value can be reported as "read from theme" or "typed by hand".

const { documentFacts } = require("./document");
const { classifyValue } = require("./values");
const syntax = require("./syntax");

// ── the template ────────────────────────────────────────────────────────────

// `styled.button<Props>\`…\`` / `css\`…\`` / `styled(Button)\`…\`` — the tag is a
// name, not a rule: every consumer spells it the same way.
const isStyledTag = (tag) => {
	const text = String(tag ?? "");

	return /^styled(\.|$|\()/.test(text) || text === "css" || /^styled\.[A-Za-z]/.test(text);
};

// The template as parseable CSS plus the map back to the expressions it quotes.
const templateSource = (node) => {
	const template = node.getTemplate?.();
	if (!template) return { text: "", exprs: [] };
	const spans = typeof template.getTemplateSpans === "function" ? template.getTemplateSpans() : [];
	const head = typeof template.getHead === "function" ? template.getHead() : null;
	if (!head) return { text: template.getLiteralText?.() ?? "", exprs: [] };

	// An expression contributes NOTHING to the CSS text: it is not a value, it is a
	// question for TypeScript. It is REPLACED by blanks of its own length, so the
	// text stays parseable and every declaration's source offsets still point at
	// the place the expression occupies — the link is a position, not a marker and
	// not a guess.
	let text = head.getLiteralText();
	const exprs = [];
	for (const [index, span] of spans.entries()) {
		const expression = span.getExpression();
		const source = expression.getText();
		const literal = span.getLiteral()?.getLiteralText() ?? "";
		exprs.push({ index, text: source, line: expression.getStartLineNumber(), offset: text.length });
		text += " ".repeat(source.length) + literal;
	}

	return { text, exprs };
};

// ── entry points ────────────────────────────────────────────────────────────

// The comment a declaration is documented by, read from the TypeScript source
// (above the template, above the `const`) — because a styled template's own
// comment lives outside the CSS text.
const leadingCommentOf = (node) => {
	// A template literal carries no comment of its own: the doc of `const Title =
	// styled.h2`…`` hangs on the STATEMENT, so the climb goes through the binding —
	// the same walk `docsOf` in the AST module does, for the same reason.
	let holder = node;
	while (holder && holder.getKind?.() !== require("../entities/ast/tree").SK.VariableStatement) {
		const parent = holder.getParent?.();
		const kind = holder.getKind?.();
		if (kind !== require("../entities/ast/tree").SK.TaggedTemplateExpression && kind !== require("../entities/ast/tree").SK.VariableDeclaration && kind !== require("../entities/ast/tree").SK.VariableDeclarationList) break;
		holder = parent;
	}
	const ranges = holder?.getLeadingCommentRanges?.() ?? node.getLeadingCommentRanges?.() ?? [];
	if (!ranges.length) return null;
	const last = ranges[ranges.length - 1];

	return { text: String(last.getText()).replace(/^\/\*\*?|\*\/$/g, "").trim(), line: last.getPos() >= 0 ? node.getSourceFile().getLineAndColumnAtPos(last.getPos()).line : null };
};

// Facts for one styled/CSS template held by a candidate. The substituted template
// is plain CSS, so it is read by the `css` provider whatever file it sits in —
// `syntax` in the facts says which provider produced them.
const templateFacts = (node) => {
	const { text, exprs } = templateSource(node);
	const facts = syntax.byId("css").facts(text, { exprs });

	return {
		tag: node.getTag?.().getText() ?? "",
		line: node.getStartLineNumber?.() ?? null,
		comment: leadingCommentOf(node),
		...facts,
	};
};

// Facts for a whole stylesheet file — the same shape, so one rule reads both. The
// provider is chosen by extension; a syntax nobody registered produces nothing
// instead of being read as CSS.
const stylesheetFacts = (rel, text) => {
	const provider = syntax.forFile(rel);
	if (!provider) return null;

	return provider.facts(text);
};

// ── attaching to candidates ─────────────────────────────────────────────────

// Every styled/CSS template in the file, as its own fact set.
const styledTemplates = (sf) => {
	const { SK } = require("../entities/ast/tree");

	return sf
		.getDescendantsOfKind(SK.TaggedTemplateExpression)
		.filter((node) => isStyledTag(node.getTag?.().getText?.() ?? ""));
};

// The piece that DECLARES something the CSS facet read: the candidate whose line
// span contains it, the tightest one when several do. A decorated wrapper must not
// swallow its inner declaration, and when a one-line file makes two spans
// identical (`const X = () => …` yields the declaration AND the arrow), the CODE
// one wins — the class list belongs to the function, not to the binding.
// "Is this piece code?" is asked of the SHAPE the AST module recorded: a function
// carries `parameters` and `returns`, a binding does not. No list of kind names.
// When two candidates share a span (`const X = () => …` is the binding AND the
// arrow), the code one is the one emitted LATER by the AST module — its own
// candidate comes after the declaration it is initialised in. No list of kinds:
// the order is the fact.
const isLater = (a, b, list) => list.indexOf(b) - list.indexOf(a);

const hostOf = (candidates, line) =>
	(candidates ?? [])
		.filter((c) => Array.isArray(c.lines) && c.lines.length && c.lines[0] <= line && line <= c.lines[c.lines.length - 1])
		.sort((a, b) => a.lines.length - b.lines.length || isLater(a, b, candidates))[0];

const attachToCandidates = (candidates, { sf }) => {
	for (const template of styledTemplates(sf).map(templateFacts)) {
		const host = hostOf(candidates, template.line);
		if (!host) continue;
		host.css = host.css && Array.isArray(host.css.templates) ? host.css : { templates: [] };
		host.css.templates.push(template);
	}

	// …and the class lists, which are CSS written in an attribute rather than in a
	// template. Same facet, same call: a caller attaches `css.*` once.
	require("./markup").attachClasses(candidates, { sf });

	return candidates;
};

// A class list is a list of TOKENS: one entry per whitespace-separated class, as
// written. `md:hover:grid-cols-3` is ONE class with variants — splitting it would
// turn a class into three things that are not classes. What a token MEANS
// (variants, utility, value) is `tailwind.js`'s question, not the list's.
const classList = (text) => [...new Set(String(text ?? "").trim().split(/\s+/).filter(Boolean))];

// The surface the rest of the tool uses — nothing else. The readers themselves are
// modules (`document`, `values`, `syntax/*`, `tailwind`, `markup`); the pipeline
// attaches facts through `attachToCandidates`, and anything that needs a whole file
// asks `stylesheetFacts`. A function that is not on this list is internal, and a
// consumer that needs one requires its module directly — so there is no second
// "public" API to keep in step with the first.
module.exports = {
	// The one entry point the pipeline calls: attach `css.*` to the candidates.
	attachToCandidates,
	// A whole stylesheet, by the provider its extension claims.
	stylesheetFacts,
	// One template, for a caller that already has the AST node.
	templateFacts,
	// Shared by the facets that need to say WHERE a fact belongs.
	hostOf,
	classList,
	// The registry: adding a syntax is a call, not a change here.
	syntax,
};

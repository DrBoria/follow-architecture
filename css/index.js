"use strict";

// CSS as a FACT SOURCE, next to `ast` (which is the language). The engine has no
// opinion about styles: it says what is written — which declarations, which
// values were typed by hand, which `var(--x)` and which `theme.*` were read — and
// the rules decide what that means.
//
// Three parsers, each for the thing it is actually good at:
//   postcss                 the DOCUMENT: rules, declarations, comments, order,
//                           source positions (css-tree drops comments from its AST)
//   css-tree                the VALUE grammar: `16px` is a Dimension, `#fff` a Hash,
//                           `calc(...)`/`rgb(...)` a Function — so "hardcoded" is a
//                           typed node, not a regular expression
//   postcss-selector-parser the SELECTOR: `&:disabled` and `div > span` are trees,
//                           which is what "do these rules overlap" needs
//
// CSS-in-JS is the same pipeline over a substituted template: `${expr}` becomes
// `md_expr_N`, the placeholder→node map keeps the link back to TypeScript, so a
// declaration value can be reported as "read from theme" or "typed by hand".

const postcss = require("postcss");
const selectorParser = require("postcss-selector-parser");
const cssTree = require("css-tree");

// A CSS identifier, so `padding: md_expr_0;` parses as an Identifier instead of
// breaking the value grammar.
const PLACEHOLDER = (i) => `md_expr_${i}`;
const PLACEHOLDER_RE = /md_expr_(\d+)/g;

const COLOR_FUNCTIONS = new Set(["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color", "color-mix", "light-dark"]);
const MATH_FUNCTIONS = new Set(["calc", "min", "max", "clamp", "round", "mod", "rem", "sin", "cos", "tan", "pow", "sqrt", "hypot"]);

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

	let text = head.getLiteralText();
	const exprs = spans.map((span, index) => {
		const expression = span.getExpression();
		text += PLACEHOLDER(index);
		const entry = { index, text: expression.getText(), line: expression.getStartLineNumber() };
		text += span.getLiteral()?.getLiteralText() ?? "";

		return entry;
	});

	return { text, exprs };
};

// ── values ──────────────────────────────────────────────────────────────────

// What was TYPED into the value: a colour, a length, a bare number, an
// arithmetic/colour function, or a `var(--x)`. Keywords (`flex`, `none`) are not
// values a theme owns, so they are not listed.
const classifyValue = (value, line) => {
	const out = { literals: [], vars: [], exprs: [], selectors: [] };
	let ast = null;
	try {
		ast = cssTree.parse(String(value), { context: "value", positions: true });
	} catch {
		// A value css-tree cannot read is still text: no classification, no lie.
		return out;
	}

	cssTree.walk(ast, {
		enter(node) {
			switch (node.type) {
				case "Dimension":
					out.literals.push({ kind: "length", text: `${node.value}${node.unit}`, unit: node.unit, line });
					return cssTree.walk.skip;
				case "Percentage":
					out.literals.push({ kind: "percentage", text: `${node.value}%`, line });
					return cssTree.walk.skip;
				case "Hash":
					out.literals.push({ kind: "color", text: `#${node.value}`, line });
					return cssTree.walk.skip;
				case "Number":
					out.literals.push({ kind: "number", text: String(node.value), line });
					return cssTree.walk.skip;
				case "Function": {
					const name = String(node.name ?? "").toLowerCase();
					if (name === "var") {
						const first = node.children.first;
						if (first && first.type === "Identifier") out.vars.push(first.name);
					} else if (COLOR_FUNCTIONS.has(name)) {
						out.literals.push({ kind: "color", text: cssTree.generate(node), line });
					} else if (MATH_FUNCTIONS.has(name)) {
						out.exprs.push({ kind: "math", text: cssTree.generate(node), line });
					} else {
						out.exprs.push({ kind: "function", text: cssTree.generate(node), line });
					}
					return cssTree.walk.skip;
				}
				case "Url":
					return cssTree.walk.skip;
				default:
					return undefined;
			}
		},
	});

	return out;
};

// ── the document ────────────────────────────────────────────────────────────

const rootOf = (text) => {
	try {
		return postcss.parse(text, { from: undefined });
	} catch {
		return null;
	}
};

const commentAbove = (node) => {
	const prev = node.prev?.();
	if (!prev || prev.type !== "comment") return null;

	return { text: prev.text, line: prev.source?.start?.line ?? null };
};

// Every declaration with the rule it belongs to, the comment above both, and the
// classification of its value. Selector nodes are kept as AST for the rules that
// ask about overlap, and as text for everything else.
const documentFacts = (text, exprs) => {
	const root = rootOf(text);
	if (!root) return { rules: [], declarations: [], literals: [], vars: [], themeReads: [], exprs: [] };

	const rules = [];
	const declarations = [];
	const literals = [];
	const vars = [];

	root.walkRules((rule) => {
		const parsed = [];
		try {
			selectorParser((selectors) => {
				selectors.each((selector) => parsed.push({ text: String(selector), nodes: selector.nodes.length }));
			}).processSync(rule.selector);
		} catch {
			// A selector we cannot read is still a selector: text only.
		}
		rules.push({
			selector: rule.selector,
			selectors: parsed,
			line: rule.source?.start?.line ?? null,
			comment: commentAbove(rule),
			parent: rule.parent?.type === "atrule" ? rule.parent.name : null,
		});
	});

	root.walkDecls((decl) => {
		const value = String(decl.value);
		const line = decl.source?.start?.line ?? null;
		const classification = classifyValue(value, line);
		const entry = {
			prop: decl.prop,
			value,
			line,
			important: Boolean(decl.important),
			rule: decl.parent?.type === "rule" ? decl.parent.selector : null,
			comment: commentAbove(decl),
			literals: classification.literals,
			vars: classification.vars,
			exprs: classification.exprs,
		};
		declarations.push(entry);
		literals.push(...classification.literals.map((l) => ({ ...l, prop: decl.prop })));
		vars.push(...classification.vars);
	});

	// `md_expr_N` inside a value is a THEME read only when the expression behind it
	// reads `theme` — the placeholder alone says "something was quoted", not what.
	const themeReads = [];
	for (const expr of exprs ?? []) {
		if (/\btheme\b/.test(expr.text)) themeReads.push(expr);
	}

	return {
		rules,
		declarations,
		literals,
		vars: [...new Set(vars)],
		themeReads,
		exprs: exprs ?? [],
	};
};

// ── entry points ────────────────────────────────────────────────────────────

// Facts for one styled/CSS template held by a candidate:
//   { tag, line, rules, declarations, literals, vars, themeReads, exprs }
const templateFacts = (node) => {
	const { text, exprs } = templateSource(node);
	const facts = documentFacts(text, exprs);

	return {
		tag: node.getTag?.().getText() ?? "",
		line: node.getStartLineNumber?.() ?? null,
		...facts,
	};
};

// Facts for a whole `.css` file — the same shape, so one rule reads both.
const stylesheetFacts = (text) => documentFacts(text, []);

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
const CODE_KINDS = new Set(["FunctionDeclaration", "ArrowFunction", "FunctionExpression", "MethodDeclaration"]);

const hostOf = (candidates, line) =>
	(candidates ?? [])
		.filter((c) => Array.isArray(c.lines) && c.lines.length && c.lines[0] <= line && line <= c.lines[c.lines.length - 1])
		.sort((a, b) => a.lines.length - b.lines.length || (CODE_KINDS.has(b.kind?.own?.is) ? 1 : 0) - (CODE_KINDS.has(a.kind?.own?.is) ? 1 : 0))[0];

const attachToCandidates = (candidates, { sf }) => {
	for (const template of styledTemplates(sf).map(templateFacts)) {
		const host = hostOf(candidates, template.line);
		if (!host) continue;
		host.css = host.css && Array.isArray(host.css.templates) ? host.css : { templates: [] };
		host.css.templates.push(template);
	}

	return candidates;
};

// Tailwind classes: `className="flex p-4 …"` is a list of utilities, and a rule
// may compare/reject them; the SEMANTICS of `p-4` belong to tailwind itself, so
// this module only splits and normalizes the list.
const classList = (text) => {
	const raw = String(text ?? "").trim();
	if (!raw) return [];
	const classes = [];
	for (const chunk of raw.split(/\s+/)) {
		for (const part of chunk.split(":")) if (part) classes.push(part);
	}

	return [...new Set(classes)];
};

module.exports = {
	PLACEHOLDER,
	isStyledTag,
	templateSource,
	classifyValue,
	documentFacts,
	templateFacts,
	stylesheetFacts,
	classList,
	hostOf,
	styledTemplates,
	attachToCandidates,
};

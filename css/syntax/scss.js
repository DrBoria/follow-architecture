"use strict";

// SCSS: the same document, read with a parser that understands `$vars`, nesting
// and `//` comments — PLUS the facts only this syntax has.
//
// This provider is the proof that the facet is extensible: it adds two things
// (`variables`, `mixins`) and inherits every rule written against
// `css.declarations`, `css.rules`, `css.literals`. Nothing in the engine knows
// SCSS exists; a rule that asks about `$gap` asks because THIS file says the
// syntax has variables.

const postcssScss = require("postcss-scss");
const { documentFacts } = require("../document");

const parse = (text) => postcssScss.parse(text, { from: undefined });

// `$gap: 4px;` is a declaration whose prop is a variable; `@mixin x` / `@include x`
// are at-rules. Both are what a "theme lives in variables" rule needs.
const variablesOf = (root) => {
	const variables = [];
	if (!root?.walkDecls) return variables;

	root.walkDecls((decl) => {
		if (!decl.prop?.startsWith("$")) return;
		variables.push({
			name: decl.prop.slice(1),
			value: String(decl.value),
			line: decl.source?.start?.line ?? null,
		});
	});

	return variables;
};

const mixinsOf = (root) => {
	const mixins = [];
	if (!root?.walkAtRules) return mixins;

	root.walkAtRules((atRule) => {
		if (atRule.name !== "mixin" && atRule.name !== "function") return;
		mixins.push({ kind: atRule.name, name: String(atRule.params).trim(), line: atRule.source?.start?.line ?? null });
	});

	return mixins;
};

module.exports = {
	id: "scss",
	exts: [".scss", ".sass"],
	parse,
	facts: (text, options = {}) => {
		const facts = documentFacts(text, { ...options, parse, syntax: "scss" });
		const root = parse(text);
		const variables = variablesOf(root);

		return {
			...facts,
			variables,
			mixins: mixinsOf(root),
			// `$gap` is a variable reference in a value, not a `var()` call — the
			// reading says so, the rule decides whether that is allowed.
			vars: [...new Set([...facts.vars, ...facts.declarations.flatMap((decl) => [...String(decl.value).matchAll(/\$([\w-]+)/g)].map((m) => `$${m[1]}`))])],
		};
	},
};

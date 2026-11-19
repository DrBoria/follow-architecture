"use strict";

// SCSS: the same document, read with a parser that understands `$vars`, nesting
// and `//` comments — PLUS the facts only this syntax has.
//
// This provider is the proof that the facet is extensible: it adds two things
// (`variables`, `mixins`) and inherits every rule written against
// `css.declarations`, `css.rules`, `css.literals`. Nothing in the engine knows
// SCSS exists; a rule that asks about `$gap` asks because THIS file says the
// syntax has variables.

import * as postcssScss from "postcss-scss";
import type { Root, Declaration, AtRule } from "postcss";
import { documentFacts, type DocumentFacts, type DocumentOptions } from "../document";
import type { Located } from "../../entities/facts";

const id = "scss";
const exts = [".scss", ".sass"];
const parse = (text: string): Root => postcssScss.parse(text, { from: undefined });

// `$gap: 4px;` is a declaration whose prop is a variable. Both readings below are
// what a "theme lives in variables" rule needs. A named, located thing — the
// canonical `Located` shape, plus the value a variable holds.
const variablesOf = (root: Root): (Located & { name: string; line: number | null; value: string })[] => {
	const variables: ScssVariable[] = [];
	root.walkDecls((decl: Declaration) => {
		if (!decl.prop.startsWith("$")) return;
		variables.push({ name: decl.prop.slice(1), value: String(decl.value), line: decl.source?.start?.line ?? null });
	});

	return variables;
};

// A variable fact — derived from its ONE producer.
type ScssVariable = ReturnType<typeof variablesOf>[number];

// `@mixin x` / `@function x` are at-rules that declare a reusable block. A named,
// located thing, plus which kind of block it is.
const mixinsOf = (root: Root): (Located & { name: string; line: number | null; kind: string })[] => {
	const mixins: ScssMixin[] = [];
	root.walkAtRules((atRule: AtRule) => {
		if (atRule.name !== "mixin" && atRule.name !== "function") return;
		mixins.push({ kind: atRule.name, name: String(atRule.params).trim(), line: atRule.source?.start?.line ?? null });
	});

	return mixins;
};

// `$gap` is a variable reference in a value, not a `var()` call — the reading
// says so, the rule decides whether that is allowed.
const SCSS_VAR_RE = /\$([\w-]+)/g;
const valueVars = (facts: DocumentFacts): string[] =>
	facts.declarations.flatMap((decl) => [...String(decl.value).matchAll(SCSS_VAR_RE)].map((m) => `$${m[1]}`));

// A mixin fact — derived from its ONE producer.
type ScssMixin = ReturnType<typeof mixinsOf>[number];

// The SCSS fact set: the shared document facts plus what only this syntax has.
const facts = (text: string, options: DocumentOptions = {}): DocumentFacts & { variables: ScssVariable[]; mixins: ScssMixin[] } => {
	const base = documentFacts(text, { ...options, parse, syntax: id });
	const root = parse(text);

	return {
		...base,
		variables: variablesOf(root),
		mixins: mixinsOf(root),
		vars: [...new Set([...base.vars, ...valueVars(base)])],
	};
};

// The provider's whole answer — derived from its ONE producer.
type ScssFacts = ReturnType<typeof facts>;

export { id, exts, parse, facts };
export type { ScssFacts, ScssVariable, ScssMixin };

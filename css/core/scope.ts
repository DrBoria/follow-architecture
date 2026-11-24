"use strict";

// THE SCOPE BUILDER: what a declaration may read, collected generically.
//
// A value resolver can only walk down to text if it knows where the names come
// from. This module collects them without knowing a framework:
//
//   • CSS custom properties (`--x: …`) — from any template literal in the file
//     (not only a gated styled template: a `MediaProvider` declares its
//     variables inside an interpolation's nested template), each with the
//     `@media` block it sits in, so media variants stay distinct.
//   • CSS custom properties declared in a plain stylesheet — from the document
//     facts, the same shapes the readers already produce.
//   • SCSS variables (`$gap: …`) — also from the document facts; the SCSS
//     provider parses them, so no `$` grammar lives here.
//
// Providers (the object literals a `provider path` read reaches) are NOT
// scanned here: which literals are providers is a ROLE question, answered by
// the caller (`code-roles/project`) and handed in with the resolve context.
// This module collects only the variables a value may quote.
//
// A scope is plain data (`resolve.ts` owns the shape), so a caller can merge a
// shared stylesheet's scope into a component's. What is missing here is
// reported by the resolver as an undeclared variable — never skipped.

import type { Project, SourceFile } from "ts-morph";
import { SK } from "../../entities/ast/tree";
import { pushGroup } from "../../utils/group";
import { expressionNodesOf, templateLiteralSource, type TemplateLiteralNode } from "../styled/template";
import { emptyScope, mergeScopes, normalizeScope, type Scope, type ScopeEntry } from "./scope-types";
import { piecesOfRange } from "./pieces";
import type { DocumentFacts } from "../styled/document";

// A custom property declaration as written inside template text. The name is
// CSS's own (`--x`), so no selector or property list is involved.
const CUSTOM_PROPERTY_RE = /(--[\w-]+)\s*:/g;

// The value of a declaration starts just after its `:` — but an expression is
// written as BLANKS, so whitespace skipping must stop at a blank's start or it
// would eat the expression itself.
const valueStartAt = (text: string, after: number, exprs: readonly { offset: number }[]): number => {
	const starts = new Set(exprs.map((expr) => expr.offset));
	let index = after;
	while (index < text.length && /\s/.test(text[index]) && !starts.has(index)) index += 1;

	return index;
};

// Parentheses pair up inside a value (`calc((100% - 8px) / 2)`), so a `;` only
// ends a value at depth zero. A `}` at depth zero ends the BLOCK the declaration
// sits in.
const depthAfter = (char: string, depth: number): number => {
	if (char === "(") return depth + 1;
	if (char === ")") return Math.max(0, depth - 1);

	return depth;
};

const endsValue = (char: string, depth: number): boolean => depth === 0 && (char === ";" || char === "}");

const closesQuote = (char: string, previous: string, quote: string): boolean => char === quote && previous !== "\\";

const valueEndAt = (text: string, start: number): number => {
	let depth = 0;
	let quote: string | null = null;
	for (let index = start; index < text.length; index += 1) {
		const char = text[index];
		if (quote) {
			if (closesQuote(char, text[index - 1], quote)) quote = null;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}
		depth = depthAfter(char, depth);
		if (endsValue(char, depth)) return index;
	}

	return text.length;
};

const closingBrace = (text: string, open: number): number => {
	let depth = 0;
	for (let index = open; index < text.length; index += 1) {
		if (text[index] === "{") depth += 1;
		else if (text[index] === "}") {
			depth -= 1;
			if (depth === 0) return index;
		}
	}

	return -1;
};

// The nearest `@media` block around an offset. Several media blocks may sit side
// by side; the one whose braces contain the offset is the variant.
const MEDIA_BLOCK_RE = /@media\b([^{]*)\{/g;

const mediaAt = (text: string, position: number): string | null => {
	let found: string | null = null;
	for (const match of text.matchAll(MEDIA_BLOCK_RE)) {
		const open = text.indexOf("{", match.index);
		const close = closingBrace(text, open);
		if (position > open && (close < 0 || position < close)) found = `@media ${match[1].trim()}`;
	}

	return found;
};

const lineAt = (template: TemplateLiteralNode, text: string, offset: number): number => {
	const before = text.slice(0, offset);
	const newlines = (before.match(/\n/g) ?? []).length;

	return template.getStartLineNumber() + newlines;
};

// Every custom property declaration in one template literal (tagged or nested),
// with its value as pieces and its media variant.
const collectFromLiteral = (template: TemplateLiteralNode, add: (entry: ScopeEntry) => void): void => {
	const { text, exprs } = templateLiteralSource(template);
	if (!text.includes("--")) return;
	const nodes = expressionNodesOf(template);
	for (const match of text.matchAll(CUSTOM_PROPERTY_RE)) {
		const name = match[1];
		const from = valueStartAt(text, match.index + match[0].length, exprs);
		const to = valueEndAt(text, from);
		add({ name, pieces: piecesOfRange(text, exprs, { from, to, base: 0 }), media: mediaAt(text, match.index), declaredLine: lineAt(template, text, match.index), expression: (index) => nodes[index] ?? null });
	}
};

// The scope a whole source file offers: its templates' custom properties.
// Cached on the file — a component's styled blocks all read the same names.
// Nothing project-wide is scanned: providers are the caller's, not this file's.
const SOURCE_SCOPE = new WeakMap<SourceFile, Scope>();

const buildSourceScope = (sourceFile: SourceFile): Scope => {
	const scope = emptyScope();
	const add = (entry: ScopeEntry): void => {
		pushGroup(entry.name.startsWith("$") ? scope.scssVariables : scope.customProperties, entry.name, entry);
	};
	for (const node of sourceFile.getDescendantsOfKind(SK.TemplateExpression)) collectFromLiteral(node, add);
	for (const node of sourceFile.getDescendantsOfKind(SK.NoSubstitutionTemplateLiteral)) collectFromLiteral(node, add);

	return normalizeScope(scope);
};

// A per-key cache write that also hands the value back, so a reader is one
// expression: the known scope, or the built one remembered for next time.
const remember = <Key extends object, Value>(cache: WeakMap<Key, Value>, key: Key, build: () => Value): Value => {
	const value = build();
	cache.set(key, value);

	return value;
};

const scopeFromSourceFile = (sourceFile: SourceFile): Scope => SOURCE_SCOPE.get(sourceFile) ?? remember(SOURCE_SCOPE, sourceFile, () => buildSourceScope(sourceFile));

// THE REPO-WIDE SCOPE: every source file's custom properties merged into one.
// A component's styles do not declare the variables they read — a provider
// (ThemeProviderWrapper, a global style) does, in another file — so a value
// can only be walked to the bottom when the whole project is in scope. The
// merge is the shared `mergeScopes`; cached per project and rebuilt when the
// project grows (the same policy the project scope cache uses).
const PROJECT_SCOPE = new WeakMap<Project, { count: number; scope: Scope }>();

const scopeFromProject = (sourceFile: SourceFile): Scope => {
	const project = sourceFile.getProject();
	const files = project.getSourceFiles();
	const cached = PROJECT_SCOPE.get(project);
	if (cached && cached.count === files.length) return cached.scope;

	const scope = normalizeScope(mergeScopes(...files.map(scopeFromSourceFile)));
	PROJECT_SCOPE.set(project, { count: files.length, scope });

	return scope;
};

// The scope one parsed document offers. Plain CSS and SCSS are read here — their
// declarations already carry `valueFrom`/`media`, so the same walk covers both;
// an SCSS `$var` is just a declaration whose property is a variable.
const scopeFromFacts = (facts: DocumentFacts): Scope => {
	const scope = emptyScope();
	for (const declaration of facts.declarations) {
		const isCustom = declaration.prop.startsWith("--");
		const isScss = declaration.prop.startsWith("$");
		if (!isCustom && !isScss) continue;
		const entry: ScopeEntry = { name: declaration.prop, pieces: declaration.pieces, media: declaration.media, declaredLine: declaration.line, expression: () => null };
		pushGroup(isScss ? scope.scssVariables : scope.customProperties, entry.name, entry);
	}

	return normalizeScope(scope);
};

export { scopeFromSourceFile, scopeFromProject, scopeFromFacts };

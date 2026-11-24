"use strict";

// CSS as a FACT SOURCE, next to `ast` (which is the language). The engine has no
// opinion about styles: it says what is written — which declarations, which
// values were typed by hand, which `var(--x)` and which `theme.*` were read — and
// the rules decide what that means.
//
// The facet is FUNCTIONS over a SYNTAX, never a closed implementation:
//
//   values.ts      one value, classified (css-tree) — syntax-agnostic
//   document.ts    one postcss walk, parameterised by a parser
//   syntax/        providers: `css`, `scss` (and whatever registers next); the
//                  content gate lives with the `css` provider (`syntax/gate`)
//   tailwind.ts    class names, read through Tailwind itself
//   template.ts    one tagged template's text + expression map — syntax-agnostic
//   markup.ts      the class attribute of one element, in any framework
//   host.ts        which candidate a located fact belongs to
//   index.ts       this file: the entry points the pipeline calls
//
// Adding SCSS or Less is a `syntax.register()`, not a change here; a rule written
// against `css.declarations` keeps working because the SHAPE is the contract.
//
// CSS-in-JS is the same pipeline over a substituted template: `${expr}` becomes
// blanks of its own length, the position map keeps the link back to TypeScript,
// so a declaration value can be reported as "read from theme" or "typed by hand".

import type { SourceFile, TaggedTemplateExpression } from "ts-morph";
import { SK } from "../entities/ast/tree";
import type { Candidate } from "../entities/facts";
import * as configError from "../report/configErrors";
import { attachClasses } from "./styled/markup";
import { classList } from "./styled/class-list";
import { hostOf } from "./styled/host";
import { templateSource, expressionNodesOf, leadingCommentOf } from "./styled/template";
import type { LeadingComment } from "./styled/facts";
import type { DocumentFacts } from "./styled/document";
import { resolveDeclaration, type ResolveContext } from "./resolve/resolve";
import { scopeFromFacts, scopeFromProject } from "./core/scope";
import { withProviders, type ProviderLiteral } from "./core/scope-types";
import { isList, isObj, type FieldValue } from "../utils/field";
import { isCssDocument } from "./syntax/gate";
import * as syntax from "./syntax";
import type { SyntaxProvider } from "./syntax";

// The provider that reads a substituted template: whatever is registered under
// `css`, so a consumer that replaces the provider replaces the reading too.
const cssProvider = (): SyntaxProvider => {
	const provider = syntax.byId("css");
	if (!provider) throw configError.syntaxProviderIncomplete();

	return provider;
};

// Every declaration of a document gets its RESOLUTION: the concrete value(s) it
// reaches with `var()`, `$var` and `${expression}` walked to the bottom, the
// provider and media variant each reading belongs to, the grammar's verdict, and
// what could not be read. Nothing is dropped silently.
const withResolutions = (facts: DocumentFacts, context: ResolveContext): DocumentFacts => ({
	...facts,
	declarations: facts.declarations.map((declaration) => ({ ...declaration, resolution: resolveDeclaration(declaration, context) })),
});

// A template fact may be RESOLVED later, when an invariant asks about
// `resolution` and names the provider role to resolve against. The recompute
// capability and its per-provider cache live off the plain-data fact (a
// WeakMap), so the fact stays plain data and nothing resolves until asked.
type ResolutionEntry = { resolve: (providers: readonly ProviderLiteral[]) => DocumentFacts; cache: Map<string, DocumentFacts> };
const RESOLUTIONS = new WeakMap<object, ResolutionEntry>();

const providerSignature = (providers: readonly ProviderLiteral[]): string => providers.map((provider) => `${provider.name}|${provider.node.getSourceFile().getFilePath()}|${provider.node.getStart()}`).join(",");

// Resolve one template fact against an explicit provider set (cached by that set)
// and write the readings onto the fact's declarations — the fact an invariant's
// filter reads. Idempotent: asking twice reuses the cached readings.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- writes resolution in place, not a report
const materialiseResolution = (template: { declarations?: FieldValue }, providers: readonly ProviderLiteral[]): void => {
	const entry = RESOLUTIONS.get(template);
	if (!entry) return;
	const key = providerSignature(providers);
	let resolved = entry.cache.get(key);
	if (!resolved) {
		resolved = entry.resolve(providers);
		entry.cache.set(key, resolved);
	}
	const declarations = template.declarations;
	if (!isList(declarations)) return;
	// Facts are plain, freshly built data; the declarations carry an open index
	// the filter engine reads, so the resolution is written onto them in place.
	declarations.forEach((declaration, index) => {
		if (isObj(declaration)) Object.assign(declaration, { resolution: resolved?.declarations[index]?.resolution });
	});
};

// Facts for one styled/CSS template held by a candidate. The substituted template
// is plain CSS, so it is read by the `css` provider whatever file it sits in.
// RESOLUTION is NOT computed here: classification and the raw readings never need
// it, so it is attached only when an invariant asks (`materialiseResolution`). A
// caller that already knows its providers (a unit test) may pass them to resolve
// eagerly.
const templateFacts = (node: TaggedTemplateExpression, options?: { providers?: readonly ProviderLiteral[] }): DocumentFacts & { tag: string; line: number | null; startLine: number | null; comment: LeadingComment } => {
	const { text, exprs } = templateSource(node);
	const facts = cssProvider().facts(text, { exprs });
	// The expressions the template quoted, by index — the way a blank in the
	// substituted text gets back to its TypeScript question.
	const expressions = expressionNodesOf(node.getTemplate());
	const sourceFile = node.getSourceFile();
	// Declaration lines are numbered INSIDE the template text (postcss counts
	// from 1 at the first character after the backtick). `startLine` is the
	// template's own line in the FILE, so a consumer can place any declaration
	// on the file's line grid: startLine + decl.line - 1.
	const startLine = node.getStartLineNumber();
	const fact = { tag: node.getTag().getText(), line: startLine, startLine, comment: leadingCommentOf(node), ...facts };
	const resolve = (providers: readonly ProviderLiteral[]): DocumentFacts =>
		withResolutions(facts, { scope: withProviders(scopeFromProject(sourceFile), providers), expression: (index) => expressions[index] ?? null });
	RESOLUTIONS.set(fact, { resolve, cache: new Map() });
	if (options?.providers) materialiseResolution(fact, options.providers);

	return fact;
};

// One template's facts — derived from its ONE producer.
type TemplateFact = ReturnType<typeof templateFacts>;

// Facts for a whole stylesheet file — the same shape, so one rule reads both. The
// provider is chosen by extension; a syntax nobody registered produces nothing
// instead of being read as CSS. A stylesheet has no TypeScript expressions and
// reads no provider literals, so it resolves eagerly against its own variables.
const stylesheetFacts = (rel: string, text: string): DocumentFacts | null => {
	const provider = syntax.forFile(rel);
	if (!provider) return null;
	const facts = provider.facts(text);

	return withResolutions(facts, { scope: scopeFromFacts(facts), expression: () => null });
};

// Every CSS template in the file, as its own fact set. ANY tagged template is
// offered to the grammar: the ones whose substituted text reads as CSS become
// facts, the rest (SQL, GraphQL, prose, …) do not. The tag's name is recorded
// as a fact, never used as the gate.
const styledTemplates = (sf: SourceFile): TaggedTemplateExpression[] =>
	sf.getDescendantsOfKind(SK.TaggedTemplateExpression).filter((node) => isCssDocument(templateSource(node).text));

// The one entry point the pipeline calls: attach `css.*` to the candidates —
// templates first, then the class lists (CSS written in an attribute rather than
// in a template). Same facet, same call: a caller attaches `css.*` once.
const attachToCandidates = (candidates: Candidate[], { sf }: { sf: SourceFile }): Candidate[] => {
	for (const template of styledTemplates(sf).map((node) => templateFacts(node))) {
		const host = hostOf(candidates, template.line);
		if (!host) continue;
		host.css = host.css && Array.isArray(host.css.templates) ? host.css : { templates: [] };
		host.css.templates?.push(template);
	}
	attachClasses(candidates, { sf });

	return candidates;
};

// The surface the rest of the tool uses — nothing else. The readers themselves are
// modules (`document`, `values`, `syntax/*`, `tailwind`, `markup`, `template`,
// `host`); a consumer that needs one imports its module directly, so there is no
// second "public" API to keep in step with the first.
export { attachToCandidates, stylesheetFacts, templateFacts, materialiseResolution, hostOf, classList, syntax };
export type { TemplateFact };

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
import { attachClasses } from "./markup";
import { classList } from "./class-list";
import { hostOf } from "./host";
import { templateSource, leadingCommentOf } from "./template";
import type { LeadingComment } from "./facts";
import type { DocumentFacts } from "./document";
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

// Facts for one styled/CSS template held by a candidate. The substituted template
// is plain CSS, so it is read by the `css` provider whatever file it sits in —
// `syntax` in the facts says which provider produced them. The shape is composed
// from the canonical parts: the provider's contract + the template's placement.
const templateFacts = (node: TaggedTemplateExpression): DocumentFacts & { tag: string; line: number | null; startLine: number | null; comment: LeadingComment } => {
	const { text, exprs } = templateSource(node);
	const facts = cssProvider().facts(text, { exprs });
	// Declaration lines are numbered INSIDE the template text (postcss counts
	// from 1 at the first character after the backtick). `startLine` is the
	// template's own line in the FILE, so a consumer can place any declaration
	// on the file's line grid: startLine + decl.line - 1.
	const startLine = node.getStartLineNumber();

	return { tag: node.getTag().getText(), line: startLine, startLine, comment: leadingCommentOf(node), ...facts };
};

// One template's facts — derived from its ONE producer.
type TemplateFact = ReturnType<typeof templateFacts>;

// Facts for a whole stylesheet file — the same shape, so one rule reads both. The
// provider is chosen by extension; a syntax nobody registered produces nothing
// instead of being read as CSS.
const stylesheetFacts = (rel: string, text: string): DocumentFacts | null => {
	const provider = syntax.forFile(rel);
	if (!provider) return null;

	return provider.facts(text);
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
	for (const template of styledTemplates(sf).map(templateFacts)) {
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
export { attachToCandidates, stylesheetFacts, templateFacts, hostOf, classList, syntax };
export type { TemplateFact };

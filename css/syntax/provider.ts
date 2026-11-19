"use strict";

// The SYNTAX PROVIDER contract — what makes a new stylesheet language a file, not
// a rewrite. Every provider (css, scss, and whatever registers next) implements
// this same interface, so the engine reads them all the same way:
//
//   id     the name rules and the report use (`css`, `scss`, …)
//   exts   which files it claims
//   parse  text → postcss root (the only syntax-specific part)
//   facts  the document facts, optionally enriched (SCSS adds `$variables`)
//
// The document fact set is a MULTI-PRODUCER contract (every provider assembles
// it), so it stays an explicit interface — the base shape every syntax shares.
// A provider that adds facts (SCSS's `variables`/`mixins`) returns a wider type;
// the engine reads the base, and a rule that knows the syntax reads the rest.

import type { Root } from "postcss";
import type { DocumentFacts, DocumentOptions } from "../document";

interface SyntaxProvider {
	id: string;
	exts: string[];
	parse: (text: string) => Root;
	facts: (text: string, options?: DocumentOptions) => DocumentFacts;
}

export type { SyntaxProvider };

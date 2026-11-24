"use strict";

// css-tree, loaded through a TYPED view. The package ships no declarations, so
// the surface the CSS facet reads is modelled here once — the value grammar
// (`parse`, `walk`, `generate`) and the property dictionary (`lexer.properties`,
// `property`). A parsed node is probed for the fields its particular type carries
// (the same optional-shape pattern the AST layer's `LooseNode` uses), so nothing
// here asserts a node into a shape it may not have.
//
// `createRequire` (not a bare `require`) keeps the load at run time, the same way
// the config loader reads a JS module — the linter sees a typed call, not an
// untyped global.

import { createRequire } from "node:module";

// A node's position in the source, when parsed with `positions: true`. The
// offsets are what a problem's SPAN is built from — the exact `calc(…)` or the
// token the grammar rejected.
interface CssLocation {
	start: { offset: number; line: number; column: number };
	end: { offset: number; line: number; column: number };
}

// One node of a parsed value. Which fields are present depends on `type`.
interface CssNode {
	type: string;
	// `Function` / `Identifier` carry a name.
	name?: string;
	// `Hash` / `Dimension` / `Number` carry a value.
	value?: string;
	// `Dimension` / `Percentage` carry a unit.
	unit?: string | null;
	// Structure nodes (`Value`, a call's arguments) carry children.
	children?: { first: CssNode | null; forEach: (visit: (node: CssNode) => void) => void } | null;
	// Present when parsed with `positions: true`.
	loc?: CssLocation | null;
}

// The error a matcher returns when a value does not fit a grammar. `offset` is
// where the match failed; `mismatchOffset`/`mismatchLength` bound the offending
// token when the grammar can point at one.
interface MatchError {
	message?: string;
	rawMessage?: string;
	offset?: number;
	mismatchOffset?: number;
	mismatchLength?: number;
}

// One node of a grammar SYNTAX tree (what a type name expands to). Only the
// shape the math-function detector walks is modelled: a type reference (its
// `name`), a list of `terms`, and single `term`/`syntax` children.
// eslint-disable-next-line md-code-entities/entities-uniqueness -- a grammar node, not the wrapper that holds it
interface TypeSyntaxNode {
	type?: string;
	name?: string;
	terms?: readonly TypeSyntaxNode[];
	term?: TypeSyntaxNode;
	syntax?: TypeSyntaxNode;
}

// One entry of the grammar's type dictionary: its name and the syntax tree its
// name expands to (walked to recognise a MATH function without a list).
// eslint-disable-next-line md-code-entities/entities-uniqueness -- a named wrapper, not the same entity as the node
interface TypeDefinition {
	name: string;
	syntax: TypeSyntaxNode;
}

// The result of `property(raw)`: a custom property, or a named one.
interface PropertyResult {
	custom: boolean;
	basename: string;
	name: string;
}

interface ParseOptions {
	context?: string;
	positions?: boolean;
}

interface WalkOptions {
	enter?: (node: CssNode) => void;
	leave?: (node: CssNode) => void;
}

// The slice of css-tree the facet reads.
interface CssTree {
	// The grammar's dictionary of known properties, keyed by base name, its type
	// dictionary (the math functions are the ones whose grammar builds on
	// `calc-sum`), plus the matchers the resolver asks for a VERDICT.
	lexer: {
		properties: Record<string, object>;
		types: Record<string, TypeDefinition>;
		getType: (name: string) => TypeDefinition | null;
		matchType: (type: string, value: string) => { error: MatchError | null };
		matchProperty: (property: string, value: string) => { error: MatchError | null };
	};
	// Parse a property name; throws when the grammar cannot read it.
	property: (raw: string) => PropertyResult;
	// Parse a value (or other context) into a node tree; throws on bad input.
	parse: (text: string, options?: ParseOptions) => CssNode;
	// Walk a parsed tree, visiting every node.
	walk: (ast: CssNode, options: WalkOptions) => void;
	// Regenerate the source text of a node.
	generate: (node: CssNode) => string;
}

const requireModule = createRequire(__filename);
const cssTree: CssTree = requireModule("css-tree");

export { cssTree };
export type { CssNode, CssLocation, MatchError, TypeDefinition, TypeSyntaxNode, PropertyResult, ParseOptions, WalkOptions, CssTree };

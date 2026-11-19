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
	children?: { first: CssNode | null } | null;
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
	// The grammar's dictionary of known properties, keyed by base name.
	lexer: { properties: Record<string, object> };
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
export type { CssNode, PropertyResult, ParseOptions, WalkOptions, CssTree };

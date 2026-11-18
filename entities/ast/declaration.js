"use strict";

// The candidate fact every "declares a name with no code inside it" node shares:
// an `enum` and a `type`/`interface` are candidates like any other, so they
// carry the same generic fields (kind, name, location, lines, the empty action
// lists, whether they are published) and add only their own `members`. The
// shape lives here once; `enums.js` and `types.js` supply the members their
// syntax actually has.

const { linesOf, isExported } = require("./tree");
const { kindOf } = require("./kind");

const declarationFact = (node, rel, members) => ({
	kind: kindOf(node),
	name: node.getName() ?? null,
	location: { path: rel ?? null, piece: null },
	lines: linesOf(node),
	returns: [],
	calls: [],
	branches: [],
	assignments: [],
	parameters: [],
	members,
	exported: isExported(node),
	mutable: false,
});

module.exports = { declarationFact };

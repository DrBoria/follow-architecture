"use strict";

// The words a relation is said with: third person, base form, and the noun.
const VERBS = {
	import: "imports",
	typeImport: "names a type of",
	export: "exports",
	declare: "declares a name from",
	call: "calls",
	mutate: "changes",
	assign: "writes into",
	read: "reads",
};

const verbOf = (kind) => VERBS[kind] ?? `uses (${kind})`;

const NOUNS = {
	import: "import",
	typeImport: "type import",
	export: "export",
	declare: "declaration",
	call: "call",
	mutate: "mutation",
	assign: "assignment",
	read: "read",
};

const nounOf = (kind) => NOUNS[kind] ?? `use (${kind})`;

const BASES = {
	import: "import",
	typeImport: "name a type of",
	export: "export",
	declare: "declare a name from",
	call: "call",
	mutate: "change",
	assign: "write into",
	read: "read",
};

const baseVerbOf = (kind) => BASES[kind] ?? `use (${kind})`;

module.exports = { VERBS, NOUNS, BASES, verbOf, nounOf, baseVerbOf };

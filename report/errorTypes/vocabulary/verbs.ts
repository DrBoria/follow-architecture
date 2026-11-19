"use strict";

// The words a relation is said with — third person, noun, and base form — as
// ONE table keyed by relation, so the three views below can never drift apart.
// A new relation is added once, here. The columns are DERIVED from the table,
// so a column and the table can never disagree.
const WORD = {
	import: { verb: "imports", noun: "import", base: "import" },
	typeImport: { verb: "names a type of", noun: "type import", base: "name a type of" },
	export: { verb: "exports", noun: "export", base: "export" },
	declare: { verb: "declares a name from", noun: "declaration", base: "declare a name from" },
	call: { verb: "calls", noun: "call", base: "call" },
	mutate: { verb: "changes", noun: "mutation", base: "change" },
	assign: { verb: "writes into", noun: "assignment", base: "write into" },
	read: { verb: "reads", noun: "read", base: "read" },
};

type WordField = keyof (typeof WORD)["import"];

const column = (field: WordField): Record<string, string> =>
	Object.fromEntries(Object.entries(WORD).map(([kind, words]) => [kind, words[field]]));

const VERBS = column("verb");
const NOUNS = column("noun");
const BASES = column("base");

const verbOf = (kind: string): string => VERBS[kind] ?? `uses (${kind})`;
const nounOf = (kind: string): string => NOUNS[kind] ?? `use (${kind})`;
const baseVerbOf = (kind: string): string => BASES[kind] ?? `use (${kind})`;

export { VERBS, NOUNS, BASES, verbOf, nounOf, baseVerbOf };

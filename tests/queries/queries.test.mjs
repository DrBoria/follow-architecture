import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { matches, passes } = require("../../utils/queries");

describe("queries.matches — scalar ops", () => {
	it("equals / not", () => {
		expect(matches({ lines: 42 }, { lines: { equals: 42 } })).toBe(true);
		expect(matches({ lines: 42 }, { lines: { equals: 43 } })).toBe(false);
		expect(matches({ lines: 42 }, { lines: { not: 42 } })).toBe(false);
		expect(matches({ lines: 42 }, { lines: { not: 43 } })).toBe(true);
	});

	it("lt / lte / gt / gte", () => {
		expect(matches({ lines: 10 }, { lines: { gt: 9 } })).toBe(true);
		expect(matches({ lines: 10 }, { lines: { gt: 10 } })).toBe(false);
		expect(matches({ lines: 10 }, { lines: { gte: 10 } })).toBe(true);
		expect(matches({ lines: 10 }, { lines: { lt: 10 } })).toBe(false);
		expect(matches({ lines: 10 }, { lines: { lte: 10 } })).toBe(true);
	});

	it("in / notIn", () => {
		expect(matches({ kind: "arrowFunction" }, { kind: { in: ["arrowFunction", "function"] } })).toBe(true);
		expect(matches({ kind: "arrowFunction" }, { kind: { notIn: ["arrowFunction"] } })).toBe(false);
	});

	it("contains / startsWith / endsWith", () => {
		expect(matches({ name: "copyWithSubstitutions" }, { name: { contains: "With" } })).toBe(true);
		expect(matches({ name: "copyWithSubstitutions" }, { name: { startsWith: "copy" } })).toBe(true);
		expect(matches({ name: "copyWithSubstitutions" }, { name: { endsWith: "Substitutions" } })).toBe(true);
		expect(matches({ name: "copyWithSubstitutions" }, { name: { startsWith: "Copy" } })).toBe(false);
	});

	it("isSet — null/undefined vs set", () => {
		expect(matches({ name: null }, { name: { isSet: false } })).toBe(true);
		expect(matches({ name: "x" }, { name: { isSet: true } })).toBe(true);
		expect(matches({ name: 0 }, { name: { isSet: true } })).toBe(true);
		expect(matches({ name: "" }, { name: { isSet: true } })).toBe(true);
	});

	it("setEquals — order-insensitive exact set", () => {
		expect(matches({ roles: ["a", "b"] }, { roles: { setEquals: ["b", "a"] } })).toBe(true);
		expect(matches({ roles: ["a", "b"] }, { roles: { setEquals: ["a"] } })).toBe(false);
	});

	it("globMatches", () => {
		expect(matches({ name: "decorated-text.ts" }, { name: { globMatches: "{kebab-case}.ts" } })).toBe(true);
		expect(matches({ name: "decorated_text.ts" }, { name: { globMatches: "{kebab-case}.ts" } })).toBe(false);
		expect(matches({ name: "store.ts" }, { name: { globMatches: "store.ts" } })).toBe(true);
	});

	it("or — any branch matches", () => {
		expect(matches({ kind: "arrowFunction" }, { kind: { or: [{ equals: "function" }, { equals: "arrowFunction" }] } })).toBe(true);
		expect(matches({ kind: "arrowFunction" }, { kind: { or: [{ equals: "function" }, { equals: "method" }] } })).toBe(false);
	});

	it("a bare value is a field filter, not an op — never matches", () => {
		// { kind: "arrowFunction" } means "field `kind` filtered by the string
		// \"arrowFunction\""; a non-object filter never passes. YAML always
		// writes { equals: } / { in: [...] } explicitly.
		expect(matches({ kind: "arrowFunction" }, { kind: "arrowFunction" })).toBe(false);
	});

	it("$-prefixed values resolve against the scope", () => {
		// The `$` convention lives in the VALUE: { equals: "$kind" } compares
		// the item's field to scope.kind.
		expect(matches({ kind: "arrowFunction" }, { kind: { equals: "$kind" } }, { kind: "arrowFunction" })).toBe(true);
		expect(matches({ kind: "arrowFunction" }, { kind: { equals: "$kind" } }, { kind: "function" })).toBe(false);
	});

	it("a list op on a non-list value fails gracefully (no throw)", () => {
		// A candidate without the field (or with a non-list) simply does not
		// match — missing data is not an engine error.
		expect(matches({ x: 5 }, { x: { length: { equals: 1 } } })).toBe(false);
		expect(matches({}, { x: { some: { equals: 1 } } })).toBe(false);
	});

	it("unknown keys are field names, not ops (no throw, just no match)", () => {
		expect(matches({ x: 1 }, { x: { bogus: 1 } })).toBe(false);
	});

	it("missing subject value fails the filter (except isSet)", () => {
		expect(matches({}, { name: { equals: "x" } })).toBe(false);
		expect(matches({}, { name: { isSet: false } })).toBe(true);
	});
});

describe("queries.matches — list ops", () => {
	it("length", () => {
		expect(matches({ calls: [1, 2, 3] }, { calls: { length: { equals: 3 } } })).toBe(true);
		expect(matches({ calls: [1, 2, 3] }, { calls: { length: { gt: 2 } } })).toBe(true);
		expect(matches({ calls: [] }, { calls: { length: { equals: 0 } } })).toBe(true);
	});

	it("every / some / none", () => {
		const facts = { candidates: [{ local: true }, { local: true }] };
		expect(matches(facts, { candidates: { every: { local: { equals: true } } } })).toBe(true);
		expect(matches(facts, { candidates: { some: { local: { equals: false } } } })).toBe(false);
		expect(matches(facts, { candidates: { none: { local: { equals: false } } } })).toBe(true);
		// `none` gotcha: "no item matches the filter" — vacuously true when
		// nothing matches.
		expect(matches(facts, { candidates: { none: { local: { equals: true } } } })).toBe(false);
	});

	it("every on empty list is true (vacuous)", () => {
		expect(matches({ calls: [] }, { calls: { every: { base: { equals: "x" } } } })).toBe(true);
		expect(matches({ calls: [] }, { calls: { some: { base: { equals: "x" } } } })).toBe(false);
		expect(matches({ calls: [] }, { calls: { none: { base: { equals: "x" } } } })).toBe(true);
	});

	it("where — narrow the list, then apply `by` to the subset", () => {
		const facts = { candidates: [{ local: true }, { local: false }, { local: true }] };
		expect(matches(facts, { candidates: { where: { filter: { local: { equals: true } }, by: { length: { equals: 2 } } } } })).toBe(true);
		expect(matches(facts, { candidates: { where: { filter: { local: { equals: true } }, by: { length: { gt: 2 } } } } })).toBe(false);
	});

	it("list item filters compose with scalar ops", () => {
		const facts = { returns: [{ exprKind: "ObjectLiteralExpression", base: "t.model" }] };
		expect(matches(facts, { returns: { some: { exprKind: { equals: "ObjectLiteralExpression" }, base: { equals: "t.model" } } } })).toBe(true);
	});

	it("one interface everywhere — nested object facts compose with the same ops", () => {
		// The same filter language the invariant `when` gate uses works on any
		// raw fact, at any depth — no special operators needed.
		expect(matches({ lines: 250 }, { lines: { gt: 200 } })).toBe(true);
		expect(matches({ lines: 100 }, { lines: { gt: 200 } })).toBe(false);

		const facts = { returns: [{ members: [{ name: "run", isFunction: true }, { name: "n", isFunction: false }] }] };
		expect(matches(facts, { returns: { some: { members: { some: { isFunction: { equals: true } } } } } })).toBe(true);
		const plain = { returns: [{ members: [{ name: "n", isFunction: false }] }] };
		expect(matches(plain, { returns: { some: { members: { some: { isFunction: { equals: true } } } } } })).toBe(false);

		// A missing value fails gracefully (no throw).
		expect(matches({}, { members: { some: { isFunction: { equals: true } } } })).toBe(false);
	});
});

describe("queries.matches — top level", () => {
	it("multiple keys must all match", () => {
		expect(matches({ kind: "arrowFunction", name: "x" }, { kind: { equals: "arrowFunction" }, name: { equals: "x" } })).toBe(true);
		expect(matches({ kind: "arrowFunction", name: "x" }, { kind: { equals: "arrowFunction" }, name: { equals: "y" } })).toBe(false);
	});

	it("non-object subject never matches", () => {
		expect(matches("plain", { kind: { equals: "plain" } })).toBe(false);
	});
});

describe("queries.passes", () => {
	it("AND-list of filters", () => {
		expect(passes({ kind: "arrowFunction", name: "x" }, [{ kind: { equals: "arrowFunction" } }, { name: { equals: "x" } }])).toBe(true);
		expect(passes({ kind: "arrowFunction", name: "x" }, [{ kind: { equals: "arrowFunction" } }, { name: { equals: "y" } }])).toBe(false);
	});

	it("non-list = single filter", () => {
		expect(passes({ kind: "arrowFunction" }, { kind: { equals: "arrowFunction" } })).toBe(true);
	});
});


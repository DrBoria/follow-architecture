import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { matches } = require("../../entities/queries");

const u = (field) => ({ unique: { field } });

// `unique` is a generic list predicate: "no two entries share a value for the
// named field". It leans on the language's own identity (`Set` / SameValueZero):
// scalars strictly, objects by reference. These cases pin that contract.
describe("unique — scalar lists", () => {
	it("an empty list is vacuously unique", () => expect(matches([], u("x"), {})).toBe(true));
	it("a single entry is unique", () => expect(matches([{ x: 1 }], u("x"), {})).toBe(true));
	it("distinct scalars are unique", () => expect(matches([{ x: 1 }, { x: 2 }], u("x"), {})).toBe(true));
	it("equal scalars are not unique", () => expect(matches([{ x: 1 }, { x: 1 }], u("x"), {})).toBe(false));
	it("compares strictly: 1 and \"1\" are distinct", () => expect(matches([{ x: 1 }, { x: "1" }], u("x"), {})).toBe(true));
	it("0, false, null and \"\" are four distinct values", () => expect(matches([{ x: 0 }, { x: false }, { x: null }, { x: "" }], u("x"), {})).toBe(true));
	it("null and undefined are distinct", () => expect(matches([{ x: null }, {}], u("x"), {})).toBe(true));
	it("two missing values (undefined) are a duplicate", () => expect(matches([{}, {}], u("x"), {})).toBe(false));
	it("SameValueZero: 0 and -0 collide", () => expect(matches([{ x: 0 }, { x: -0 }], u("x"), {})).toBe(false));
	it("SameValueZero: NaN collides with itself", () => expect(matches([{ x: NaN }, { x: NaN }], u("x"), {})).toBe(false));
});

describe("unique — field paths (scalars)", () => {
	it("reads a nested path", () => {
		expect(matches([{ loc: { ext: "ts" } }, { loc: { ext: "js" } }], u("loc.ext"), {})).toBe(true);
		expect(matches([{ loc: { ext: "ts" } }, { loc: { ext: "ts" } }], u("loc.ext"), {})).toBe(false);
	});

	it("a path missing on every item is a duplicate (all undefined)", () => {
		expect(matches([{ a: 1 }, { a: 2 }], u("loc.ext"), {})).toBe(false);
	});

	it("a path missing on SOME items separates undefined from a value", () => {
		expect(matches([{ loc: { ext: "ts" } }, { a: 1 }], u("loc.ext"), {})).toBe(true);
	});
});

describe("unique — object values compare by reference (name a scalar field instead)", () => {
	it("two structurally equal objects are DISTINCT (different references)", () => {
		expect(matches([{ x: { a: 1 } }, { x: { a: 1 } }], u("x"), {})).toBe(true);
	});

	it("the SAME reference twice is a duplicate", () => {
		const shared = { a: 1 };

		expect(matches([{ x: shared }, { x: shared }], u("x"), {})).toBe(false);
	});
});

describe("unique — no field (the entries themselves)", () => {
	it("works on a list of scalars", () => {
		expect(matches(["a", "b"], { unique: true }, {})).toBe(true);
		expect(matches(["a", "a"], { unique: true }, {})).toBe(false);
	});
});

describe("unique — composition and misuse", () => {
	it("inverts through `not`", () => {
		expect(matches([{ x: 1 }, { x: 1 }], { not: { unique: { field: "x" } } }, {})).toBe(true);
		expect(matches([{ x: 1 }, { x: 2 }], { not: { unique: { field: "x" } } }, {})).toBe(false);
	});

	it("works nested under an object field", () => {
		expect(matches({ items: [{ id: 1 }, { id: 2 }] }, { items: { unique: { field: "id" } } }, {})).toBe(true);
		expect(matches({ items: [{ id: 1 }, { id: 1 }] }, { items: { unique: { field: "id" } } }, {})).toBe(false);
	});

	it("a non-list value simply fails (no throw)", () => {
		expect(matches({ x: 1 }, { unique: { field: "x" } }, {})).toBe(false);
	});

	it("stays linear on a large distinct list", () => {
		const big = Array.from({ length: 5000 }, (_, i) => ({ id: i }));

		expect(matches(big, { unique: { field: "id" } }, {})).toBe(true);
	});

	it("detects one duplicate inside a large list", () => {
		const big = Array.from({ length: 5000 }, (_, i) => ({ id: i }));
		big[4321] = { id: 0 };

		expect(matches(big, { unique: { field: "id" } }, {})).toBe(false);
	});
});

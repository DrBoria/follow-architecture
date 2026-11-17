import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectCandidates, importNameModules } = require("../../entities/ast");

// `members` is what makes a THEME readable without a single `location`: the colours
// live in `theme.colors.section`, one object deep, so member facts must follow the
// nesting. Everything that is NOT a plain object literal — a `new Map()`, a call,
// a method shorthand — must stay outside that walk instead of pretending to have
// members of its own.

const candidatesOf = (code) => {
	const rel = "a/theme.ts";
	const sf = loadSourceFile(createTsProject(), rel, code);

	return collectCandidates(sf, importNameModules(sf, ".", {}, [rel]), rel, ".");
};

const candidate = (code, name) => candidatesOf(code).find((entry) => entry.name === name);

describe("members — nesting", () => {
	const THEME = `export const theme = {
  theme: 'viking',
  colors: {
    section: '#182022',
    sectionContent: '#ecf0f1',
    overlayBackground: 'rgba(0, 0, 0, 0.7)',
  },
  zIndex: { content: 1 },
};`;

	it("a nested object literal carries its own members", () => {
		const facts = candidate(THEME, "theme");
		const colors = facts.kind.initializer.members.find((member) => member.name === "colors");

		expect(colors.is).toBe("PropertyAssignment");
		expect(colors.value).toBeNull();
		expect(colors.members.map((member) => [member.name, member.value])).toEqual([
			["section", "#182022"],
			["sectionContent", "#ecf0f1"],
			["overlayBackground", "rgba(0, 0, 0, 0.7)"],
		]);
	});

	it("a scalar member keeps its literal and has no members", () => {
		const facts = candidate(THEME, "theme");
		const [first] = facts.kind.initializer.members;

		expect(first.value).toBe("viking");
		expect(first.members).toBeUndefined();
	});
});

describe("members — what is NOT an object literal", () => {
	it("a Map/Set constructed by `new` has no members to walk", () => {
		const facts = candidate("export const cache = new Map([['a', 1]]);", "cache");

		expect(facts.kind.initializer.members ?? []).toEqual([]);
	});

	it("a call result has no members to walk", () => {
		const facts = candidate("export const store = makeStore({ a: 1 });", "store");

		expect(facts.kind.initializer.members ?? []).toEqual([]);
	});

	it("a method in an object literal is a member with no value", () => {
		const facts = candidate("export const api = { run() { return 1; }, a: 2 };", "api");
		const [run, a] = facts.kind.initializer.members;

		expect(run).toMatchObject({ name: "run", is: "MethodDeclaration", value: null });
		expect(a).toMatchObject({ name: "a", value: 2 });
	});

	it("deep nesting stops instead of walking forever", () => {
		const code = "export const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };";
		const facts = candidate(code, "deep");

		let level = facts.kind.initializer;
		let depth = 0;
		while (level?.members?.[0]?.members) {
			level = level.members[0];
			depth += 1;
			expect(depth).toBeLessThan(10);
		}

		expect(depth).toBeGreaterThan(1);
	});
});

import { createRequire } from "node:module";
import { describe, expect, it, beforeAll } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectFileFacts, collectCandidates, importNameModules } = require("../../entities/ast");

let project;

beforeAll(() => {
	project = createTsProject();
});

const factsFor = (code, rel = "a/x.ts", more = {}) => {
	for (const [path, text] of Object.entries(more)) loadSourceFile(project, path, text);
	const files = [rel, ...Object.keys(more)];
	const sf = loadSourceFile(project, rel, code);
	const importMap = importNameModules(sf, ".", {}, files);
	const candidates = collectCandidates(sf, importMap, rel, ".");

	return { sf, facts: collectFileFacts(sf, { rel, repoFiles: files, aliases: {}, repoRoot: ".", candidates }) };
};

const cand = (facts, name) => facts.candidates.find((c) => c.name === name);

describe("enum declarations are candidates", () => {
	it("members, values and the `const` modifier", () => {
		const { facts } = factsFor("export const enum Level {\n\tLow = 1,\n\tHigh,\n}\n");
		const level = cand(facts, "Level");

		expect(level.kind.own.is).toBe("EnumDeclaration");
		expect(level.members.map((m) => [m.name, m.value])).toEqual([["Low", "1"], ["High", null]]);
		expect(level.kind.modifiers).toContain("const");
		expect(level.exported).toBe(true);
	});
});

describe("decorators are facts, not framework knowledge", () => {
	it("a class records every decorator by name", () => {
		const { facts } = factsFor("import { Component } from './lib';\n@Component({ a: 1 })\nexport class Widget {}\n");
		const widget = facts.candidates.find((c) => c.kind.own.is === "ClassDeclaration");

		expect(widget.kind.decorators.map((d) => d.name)).toEqual(["Component"]);
	});
});

describe("declarations that carry more than their shape", () => {
	it("`as const` is an assertion on the variable", () => {
		const { facts } = factsFor("export const config = { retries: 3 } as const;\n");
		expect(cand(facts, "config").kind.assertion).toEqual({ form: "as", type: "const", isConst: true });
	});

	it("`satisfies X` names the type it is checked against", () => {
		const { facts } = factsFor("export const settings = { retries: 3 } satisfies Record<string, number>;\n");
		expect(cand(facts, "settings").kind.assertion).toMatchObject({ form: "satisfies", type: "Record<string, number>" });
	});

	it("`using` makes the binding disposable", () => {
		const { facts } = factsFor("declare function open(): { [Symbol.dispose](): void };\nexport function f() {\n\tusing h = open();\n\treturn h;\n}\n");
		const h = cand(facts, "h");

		expect(h.kind.disposable).toBe(true);
	});

	it("a variable is spelled by the statement that declares it", () => {
		// `export const` / `declare const` are written on the STATEMENT: the
		// declaration node carries none, so asking only the node answered "nothing"
		// while `exported` said the opposite about the same file.
		const { facts } = factsFor("export const value = 1;\ndeclare const legacy: number;\nconst plain = 2;\n");

		expect(cand(facts, "value").kind.modifiers).toEqual(["export"]);
		expect(cand(facts, "legacy").kind.modifiers).toEqual(["declare"]);
		expect(cand(facts, "plain").kind.modifiers).toEqual([]);
	});

	it("a class member says what it is: static, readonly, #private", () => {
		const { facts } = factsFor("export abstract class A {\n\tstatic count = 0;\n\treadonly id: string = '';\n\t#secret = 1;\n\tstatic { A.count = 0; }\n}\n");
		const a = facts.candidates.find((c) => c.kind.own.is === "ClassDeclaration");
		const byName = Object.fromEntries(a.members.map((m) => [m.name, m]));

		expect(a.kind.modifiers).toContain("abstract");
		expect(a.staticBlocks).toBe(1);
		expect(byName.count.static).toBe(true);
		expect(byName.id.readonly).toBe(true);
		expect(byName["#secret"].private).toBe(true);
	});
});

describe("CommonJS spellings of a dependency", () => {
	it("`import x = require(...)` is an import like any other", () => {
		const { facts } = factsFor("import fs = require('fs');\nexport const size = (p: string) => fs.statSync(p).size;\n");
		const entry = facts.imports.find((i) => i.form === "require" || i.form === "equals");

		expect(entry).toBeTruthy();
		expect(entry.source).toBe("fs");
	});
});

describe("ts-morph beyond the tree", () => {
	it("a published name counts the uses OUTSIDE its own file", () => {
		const { facts } = factsFor("export function shared(): number { return 1; }\n", "a/x.ts", { "b/y.ts": "import { shared } from '../a/x';\nexport const n = shared();\n" });
		const shared = cand(facts, "shared");

		expect(shared.references.outside).toBeGreaterThanOrEqual(1);
	});

	it("a local name is not asked the question", () => {
		const { facts } = factsFor("function local(): number { return 1; }\nexport const n = local();\n");
		expect(cand(facts, "local").references).toBeNull();
	});
});

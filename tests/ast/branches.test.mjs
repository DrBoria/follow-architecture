import { createRequire } from "node:module";
import { describe, expect, it, beforeAll } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectFileFacts, collectCandidates, importNameModules } = require("../../entities/ast");

let project;

beforeAll(() => {
	project = createTsProject();
});

// `more` is the rest of the project: a type only resolves to the file that
// declares it when that file is loaded into the same ts-morph project.
const factsFor = (code, rel = "a/x.ts", more = {}) => {
	for (const [path, text] of Object.entries(more)) loadSourceFile(project, path, text);
	const files = [rel, ...Object.keys(more)];
	const sf = loadSourceFile(project, rel, code);
	const importMap = importNameModules(sf, ".", {}, files);
	const candidates = collectCandidates(sf, importMap, rel, ".");
	return { sf, facts: collectFileFacts(sf, { rel, repoFiles: files, aliases: {}, repoRoot: ".", candidates }) };
};

const fnOf = (facts, name) => facts.candidates.find((c) => c.name === name && c.kind.own.is !== "VariableDeclaration");

describe("branches — the control flow a piece runs itself", () => {
	it("records every branch kind by name, with its line", () => {
		const { facts } = factsFor("function f(a) {\n\tif (a) return 1;\n\treturn a ? 2 : 3;\n}\n");
		const c = fnOf(facts, "f");

		expect(c.branches.map((b) => b.is)).toEqual(["IfStatement", "ConditionalExpression"]);
		expect(c.branches.map((b) => b.line)).toEqual([2, 3]);
	});

	it("a nested function's branch belongs to the nested piece", () => {
		const { facts } = factsFor("function outer() {\n\tconst inner = () => { if (1) return 1; };\n\treturn inner;\n}\n");
		const outer = fnOf(facts, "outer");
		const inner = facts.candidates.find((c) => c.kind.own.is === "ArrowFunction");

		expect(outer.branches).toEqual([]);
		expect(inner.branches.map((b) => b.is)).toEqual(["IfStatement"]);
	});

	it("try/catch, throw, continue and await are branches too", () => {
		const { facts } = factsFor("export async function f(x) {\n\ttry {\n\t\tfor (const y of x) {\n\t\t\tif (!y) continue;\n\t\t\tawait y;\n\t\t}\n\t} catch (e) {\n\t\tthrow e;\n\t}\n}\n");
		const kinds = fnOf(facts, "f").branches.map((b) => b.is);

		expect(kinds).toEqual(expect.arrayContaining(["TryStatement", "CatchClause", "ThrowStatement", "ContinueStatement", "AwaitExpression"]));
	});
});

describe("calls — `with` is what the call is given", () => {
	it("an object literal is listed through its spread: `{ ...s }` hands the state over", () => {
		const { facts } = factsFor("import type { State } from '../b/state';\nexport function g(s: State) {\n\treturn use({ ...s });\n}\n", "a/x.ts", { "b/state.ts": "export interface State { a: number }\n" });
		const call = fnOf(facts, "g").calls.find((c) => c.action === "use");

		expect(call.arguments).toHaveLength(1);
		expect(call.arguments[0]).toMatchObject({ text: "{ ...s }", type: "b/state.ts" });
	});

	it("a plain object literal with no spread says nothing about ownership", () => {
		const { facts } = factsFor("export function g() {\n\treturn use({ a: 1 });\n}\n");
		const call = fnOf(facts, "g").calls.find((c) => c.action === "use");

		expect(call.arguments).toEqual([]);
	});
});

describe("heritage — a dependency with no import statement", () => {
	it("`interface X extends Y` is a type import of Y's module", () => {
		const { facts } = factsFor("import type { Base } from '../b/base';\nexport interface X extends Base { a: number }\n", "a/x.ts", { "b/base.ts": "export interface Base { b: number }\n" });
		const heritage = facts.imports.filter((i) => i.form === "heritage");

		expect(heritage).toHaveLength(1);
		expect(heritage[0]).toMatchObject({ resolved: "b/base.ts", typeOnly: true, named: ["Base"] });
	});

	it("a type of THIS file is not a dependency", () => {
		const { facts } = factsFor("export interface Base { b: number }\nexport interface X extends Base { a: number }\n");
		expect(facts.imports.filter((i) => i.form === "heritage")).toEqual([]);
	});
});

describe("type resolution — the owner survives composition", () => {
	it("a generic parameter is resolved through its constraint", () => {
		const { facts } = factsFor("import type { State } from '../b/state';\nexport function g<T extends State>(s: T) {}\n", "a/x.ts", { "b/state.ts": "export interface State { a: number }\n" });
		expect(fnOf(facts, "g").parameters[0].typeFile).toBe("b/state.ts");
	});

	it("`A & B`, `readonly A` and `A[]` keep the owner of the part that names a file", () => {
		const more = { "b/state.ts": "export interface State { a: number }\n" };
		const code = "import type { State } from '../b/state';\nexport function g(a: State & { b: number }, b: readonly State[], c: State[]) {}\n";
		const { facts } = factsFor(code, "a/x.ts", more);
		const files = fnOf(facts, "g").parameters.map((p) => p.typeFile);

		expect(files).toEqual(["b/state.ts", "b/state.ts", "b/state.ts"]);
	});
});

// A FACT IS AN IDENTITY, NOT A SPELLING.
//
// The architecture compares facts to strings it writes by hand
// (`origin: { equals: "t.model" }`, `extends: { equals: "Base<Foo>" }`), so a
// value that carries the SOURCE LAYOUT can never match: the same declaration,
// re-wrapped by the formatter, reads as a different one. These tests pin that
// down for every fact built out of node text — the bug that made a multi-line
// `t.model(...)` miss its `storeModel` role.

import { createRequire } from "node:module";
import { describe, expect, it, beforeAll } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectFileFacts, collectCandidates, importNameModules } = require("../../entities/ast");

let project;

beforeAll(() => {
	project = createTsProject();
});

const factsFor = (code, rel = "a/x.ts", repoFiles) => {
	const files = repoFiles ?? [rel];
	const sf = loadSourceFile(project, rel, code);
	const importMap = importNameModules(sf, ".", {}, files);
	const candidates = collectCandidates(sf, importMap, rel, ".");
	return { sf, facts: collectFileFacts(sf, { rel, repoFiles: files, aliases: {}, repoRoot: ".", candidates }) };
};

const classFact = (facts, name) => facts.candidates.find((c) => c.name === name && c.kind.own.is === "ClassDeclaration");

describe("a fact never carries the source layout", () => {
	it("`extends` and `implements` read the same however the declaration is wrapped", () => {
		const oneLine = classFact(factsFor("class A extends Base<Foo> implements One<Bar> {}\n").facts, "A");
		const wrapped = classFact(factsFor("class A extends Base<\n\tFoo\n> implements One<\n\tBar\n> {}\n").facts, "A");

		expect(wrapped.extends).toBe("Base<Foo>");
		expect(wrapped.implements).toEqual(["One<Bar>"]);
		// The whole point: the two spellings answer with ONE value.
		expect(wrapped.extends).toBe(oneLine.extends);
		expect(wrapped.implements).toEqual(oneLine.implements);
	});

	it("a class's own heritage is unaffected by where the braces sit", () => {
		const facts = factsFor("class A\n\textends Base {\n}\n").facts;
		expect(classFact(facts, "A").extends).toBe("Base");
	});

	it("a read names the same member however the chain is broken", () => {
		const { facts } = factsFor("import { store } from './store';\nstore\n\t.settings\n\t.enabled;\n", "a/x.ts", ["a/x.ts", "a/store.ts"]);
		const read = facts.reads[0];
		expect(read.what).toBe("store.settings.enabled");
	});

	// Whitespace inside a STRING is content, not layout: a generic argument that
	// happens to contain a space must survive, while the space AROUND it goes.
	it("a literal keeps its own spaces while the layout around it goes", () => {
		const facts = factsFor("class A extends Base<\n\t'a b'\n> {}\n").facts;
		expect(classFact(facts, "A").extends).toBe("Base<'a b'>");
	});

	it("an `import x = …` source is the name it denotes, not its layout", () => {
		const facts = factsFor("import x = A\n\t.B;\n").facts;
		const equals = facts.imports.find((i) => i.form === "equals");
		expect(equals.source).toBe("A.B");
	});
});

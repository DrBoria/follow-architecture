import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createTsProject, loadSourceFile, importNameModules, collectCandidates, collectFileFacts } = require("../../ast");
const { EDGE_FACTS } = require("../../entities/kinds");

// `export` is EVERY way code leaves a module — the modern spellings, the legacy
// CommonJS ones, and the statements that publish an expression rather than a
// declaration. Parsed from real source, so the AST side is covered too.
const parse = (text, siblings = []) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-exports-"));
	const file = path.join(root, "a.ts");
	fs.writeFileSync(file, text);
	for (const s of siblings) fs.writeFileSync(path.join(root, s), "export const x = 1;\n");
	const project = createTsProject();
	const sf = loadSourceFile(project, file, text);
	const repoFiles = ["a.ts", ...siblings];
	const importMap = importNameModules(sf, root, {}, repoFiles);
	const candidates = collectCandidates(sf, importMap, "a.ts", root);
	return collectFileFacts(sf, { rel: "a.ts", repoFiles, aliases: {}, repoRoot: root, candidates, scopeAccessors: [] });
};

const exportsOf = (text, siblings) => EDGE_FACTS.export(parse(text, siblings)).map((e) => ({ line: e.line, piece: e.piece, path: e.path, what: e.what }));

describe("export — every spelling the language has", () => {
	it("covers a declaration written with `export`", () => {
		const edges = exportsOf("export const a = 1;\nexport function f() {}\n");
		expect(edges.map((e) => e.piece)).toEqual(["a", "f"]);
	});

	it("covers a named export of local code", () => {
		const edges = exportsOf("const b = 2;\nexport { b };\n");
		expect(edges).toContainEqual(expect.objectContaining({ line: 2, piece: "b" }));
	});

	it("covers `export … from` and `export *`", () => {
		const edges = exportsOf('export { z } from "./z";\nexport * from "./w";\n', ["z.ts", "w.ts"]);
		expect(edges.map((e) => e.path)).toEqual(["z.ts", "w.ts"]);
	});

	it("covers `export default` and `export =`", () => {
		const edges = exportsOf("const v = 1;\nexport default v;\nexport = v;\n");
		expect(edges.map((e) => e.what)).toEqual(["is exported as its default", "is exported with `export =`"]);
	});

	it("covers CommonJS: `module.exports`, `module.exports.x`, `exports.x`", () => {
		const edges = exportsOf("module.exports = 1;\nmodule.exports.extra = 2;\nexports.more = 3;\n");
		expect(edges).toHaveLength(3);
		expect(edges.map((e) => e.what)).toEqual(["is exported through CommonJS", "exports `extra` through CommonJS", "exports `more` through CommonJS"]);
	});

	it("covers `require` inside a function as that PIECE's import", () => {
		const facts = parse("export function load() {\n  return require('./x');\n}\n", ["x.ts"]);
		const imports = EDGE_FACTS.import(facts);
		expect(imports).toContainEqual(expect.objectContaining({ piece: "load", path: "x.ts" }));
	});
});

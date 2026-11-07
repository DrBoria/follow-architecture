import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { loadSourceFile, collectCandidates, collectFileFacts, importNameModules } = require("../../entities/ast");
const { openProject } = require("../../config");

// `references` answers a question about the WHOLE PROJECT — who uses this name —
// so the project has to hold the whole project. A file that has not been loaded
// yet reports a name as unused, and "used in one place" then becomes a fact
// nobody can trust. These tests pin the loading contract, not a rule.
let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-refs-"));
	fs.mkdirSync(path.join(root, "a"), { recursive: true });
	fs.mkdirSync(path.join(root, "b"), { recursive: true });
	fs.writeFileSync(path.join(root, "a", "helper.ts"), "export function helper() {\n\treturn 1;\n}\n");
	fs.writeFileSync(path.join(root, "b", "caller.ts"), 'import { helper } from "../a/helper";\nexport const run = () => helper();\n');
	fs.writeFileSync(path.join(root, "b", "aliased.ts"), 'import { helper } from "@app/helper";\nexport const use = () => helper();\n');
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

const FILES = ["a/helper.ts", "b/caller.ts"];

const factsOf = (project, rel, files = FILES) => {
	const abs = path.join(root, rel);
	const sf = loadSourceFile(project, abs, fs.readFileSync(abs, "utf8"));
	const importMap = importNameModules(sf, root, {}, files);
	const candidates = collectCandidates(sf, importMap, rel, root);
	return collectFileFacts(sf, { rel, repoFiles: files, aliases: {}, repoRoot: root, candidates });
};

const referencesOf = (facts, name) => facts.candidates.find((c) => c.name === name && c.kind.own.is !== "VariableDeclaration").references;

describe("ast — references are a project fact", () => {
	it("sees a use in a file the reader has not opened yet", () => {
		const project = openProject(root, FILES.map((rel) => path.join(root, rel)), {});
		const helper = referencesOf(factsOf(project, "a/helper.ts"), "helper");

		// The files, not a count: `total` counts nodes (the import specifier is a
		// reference too), while a PLACE is what a rule can move code to.
		expect(helper.files).toEqual(["b/caller.ts"]);
	});

	it("a half-loaded project reports the name as unused — the bug this pins", () => {
		// The SAME code, with only the declaring file loaded: the fact is empty,
		// which is exactly how a helper called from one place used to look
		// unreferenced and a helper called from ten places looked like one caller.
		const half = openProject(root, [path.join(root, "a/helper.ts")], {});
		const helper = referencesOf(factsOf(half, "a/helper.ts"), "helper");

		expect(helper.files).toEqual([]);
	});

	it("loading the same file twice does not duplicate the project entry", () => {
		const project = openProject(root, FILES.map((rel) => path.join(root, rel)), {});
		factsOf(project, "b/caller.ts");
		expect(project.getSourceFiles()).toHaveLength(FILES.length);
	});

	it("separates where a name APPEARS from where it is USED", () => {
		// `export { helper } from "../a/helper"` republishes a name instead of using
		// it. The fact says both — `files` is every file it appears in, `usedIn` is
		// where it is actually used — and the RULE decides which one it needs.
		fs.writeFileSync(path.join(root, "b", "barrel.ts"), 'export { helper } from "../a/helper";\n');
		const files = [...FILES, "b/barrel.ts"];
		const project = openProject(root, files.map((rel) => path.join(root, rel)), {});
		const helper = referencesOf(factsOf(project, "a/helper.ts", files), "helper");

		expect([...helper.files].sort()).toEqual(["b/barrel.ts", "b/caller.ts"]);
		expect(helper.usedIn).toEqual(["b/caller.ts"]);
	});

	it("sees a use that imports through an ALIAS, not a relative path", () => {
		// `import { helper } from "@app/helper"` is the same use as `../a/helper`,
		// and TS only resolves it when the project knows the same aliases the
		// facts do. Without this a helper half the features call reads as unused.
		const withAlias = [...FILES, "b/aliased.ts"];
		const project = openProject(root, withAlias.map((rel) => path.join(root, rel)), { aliases: { "@app": "a" } });
		const helper = referencesOf(factsOf(project, "a/helper.ts", withAlias), "helper");

		expect([...helper.files].sort()).toEqual(["b/aliased.ts", "b/caller.ts"]);
	});
});

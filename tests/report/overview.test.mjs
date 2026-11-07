import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadArchitecture } = require("../../main");
const { createTsProject } = require("../../entities/ast");
const { collectOverviewData, renderOverview } = require("../../report/user-report");
const { describeCondition } = require("../../report/user-report/data/invariants");

const ARCH = {
	nodes: [
		{ slug: "root", name: ".", children: ["src"] },
		{ slug: "src", name: "src", parent: "root", children: ["feature"] },
		{ slug: "feature", name: "feature", parent: "src", children: ["{kebab-case}.ts"], role: "pureFunction" },
		{ slug: "feature-store", name: "store.ts", parent: "feature", role: "storeModel" },
	],
	codeRoles: [
		{
			slug: "storeModel",
			infer: [{ kind: { own: { is: { equals: "VariableDeclaration" } } } }],
			actions: { import: { where: [{ role: "pureFunction" }] } },
		},
		{ slug: "pureFunction", infer: [{ kind: { own: { is: { in: ["FunctionDeclaration"] } } } }] },
	],
	invariants: [
		{
			id: "no-long-files",
			where: "src/**/*.ts",
			infer: [{ lines: { gt: 200 }, report: { message: "File is {lines} lines.", fix: "Split it." } }],
		},
	],
};

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-overview-"));
	fs.mkdirSync(path.join(root, "src", "feature"), { recursive: true });
	fs.writeFileSync(path.join(root, "architecture.json"), JSON.stringify(ARCH));
	fs.writeFileSync(path.join(root, "src", "feature", "store.ts"), "export const Model = t.model('M', {});\n");
	fs.writeFileSync(path.join(root, "src", "feature", "helper.ts"), "export function helper() {\n\treturn 1;\n}\n");
	fs.writeFileSync(path.join(root, "src", "other.ts"), "export const other = 1;\n");
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

const collect = (findings = []) => {
	const arch = loadArchitecture(path.join(root, "architecture.json"));
	arch.repoRoot = root;
	const files = ["src/feature/store.ts", "src/feature/helper.ts", "src/other.ts"];
	return collectOverviewData({
		arch,
		findings,
		orphans: [],
		files,
		repoFiles: files,
		repoRoot: root,
		architecturePath: path.join(root, "architecture.json"),
		project: createTsProject(root),
		generatedAt: "2026-01-01T00:00:00.000Z",
	});
};

describe("collectOverviewData", () => {
	it("summarizes every declared node with its allowed children", () => {
		const data = collect();
		const feature = data.nodes.find((n) => n.slug === "feature");
		expect(feature.children).toEqual(["{kebab-case}.ts"]);
		// Which roles may be declared here is derived from the roles' own `in`.
		expect(feature.roles).toEqual(["pureFunction"]);
		expect(data.stats.nodes).toBe(data.nodes.length);
	});

	it("attaches real files to the node they land in", () => {
		const data = collect();
		const store = data.nodes.find((n) => n.slug === "feature-store");
		expect(store.files).toContain("src/feature/store.ts");
		expect(store.fileCount).toBe(1);
	});

	it("collects code-role examples with snippets", () => {
		const data = collect();
		const pure = data.roles.find((r) => r.slug === "pureFunction");
		expect(pure.exampleCount).toBeGreaterThan(0);
		expect(pure.examples[0].file).toMatch(/\.ts$/);
		expect(pure.examples[0].code.lines.length).toBeGreaterThan(0);
	});

	it("derives folder → folder arrows from the roles' actions", () => {
		const data = collect();
		expect(data.access.kinds).toContain("import");
		const edge = data.access.edges.find((e) => e.kind === "import");
		expect(edge).toBeTruthy();
		// the arrow lands on a DECLARED FOLDER, not on a role name
		expect(data.nodes.some((n) => n.slug === edge.to)).toBe(true);
	});

	it("describes invariant conditions without leaking report text", () => {
		const data = collect();
		const inv = data.invariants.find((i) => i.id === "no-long-files");
		expect(inv.infer[0].conditions).toEqual(["lines > 200"]);
		expect(inv.infer[0].fix).toBe("Split it.");
	});

	it("counts findings per invariant using the engine dedupe key", () => {
		const data = collect([
			{ file: "src/other.ts", rule: "invariant", key: "infer", dedupeKey: "invariant:no-long-files:infer", message: "m", fix: null, pos: { line: 1, column: 1 } },
		]);
		expect(data.invariants.find((i) => i.id === "no-long-files").findingCount).toBe(1);
	});

	it("explains a boundary violation from the engine's structured data", () => {
		const message = "node `feature` contains extra functionality: line 1: an import is not allowed";
		const data = collect([
			{
				file: "src/other.ts",
				infer: "finally-follow-architecture",
				key: "k",
				dedupeKey: "k",
				message,
				fix: "move it",
				pos: { line: 1, column: 1 },
				// The engine, not the report, decides what was violated — and WHO may
				// do it travels with the verdict, so nothing is evaluated twice.
				data: {
					violations: [
						{
							kind: "import",
							targetNode: "feature-store",
							line: 1,
							token: { code: "relation.forbidden", why: { code: "allowed", roles: ["pureFunction"], targetNode: "feature-store" } },
						},
					],
				},
			},
		]);
		const finding = data.findings[0];
		expect(finding.boundary).toBeTruthy();
		expect(finding.boundary.ownerNode).toBe("src");
		expect(finding.boundary.targetNode).toBe("feature-store");
		// The list is the engine's own array — the report does not recompute it.
		expect(finding.boundary.allowed).toEqual(["pureFunction"]);
		expect(finding.boundary.summary).toContain("not on that list");
		// The title is the finding's OWN first sentence — the report invents no
		// vocabulary of its own for a relation.
		expect(finding.title.startsWith("node `feature` contains extra functionality")).toBe(true);
	});

	it("does not re-derive who may reach a node when the engine sent no verdict", () => {
		const data = collect([
			{
				file: "src/other.ts",
				infer: "finally-follow-architecture",
				key: "k",
				dedupeKey: "k",
				message: "m",
				pos: { line: 1, column: 1 },
				data: { violations: [{ kind: "import", targetNode: "feature-store", line: 1 }] },
			},
		]);
		// No token → no list. Inventing one from the architecture would be the
		// second evaluation this report no longer does.
		expect(data.findings[0].boundary.allowed).toEqual([]);
	});

	it("derives titles from configured ids instead of project vocabulary", () => {
		const data = collect([
			{
				file: "src/other.ts",
				infer: "invariant",
				key: "rule",
				dedupeKey: "invariant:some-custom-rule:infer",
				message: "",
				fix: null,
				pos: { line: 1, column: 1 },
			},
		]);
		expect(data.findings[0].title).toBe("Some custom rule");
		expect(data.findings[0].invariant).toBe("some-custom-rule");
	});

	it("builds a real file tree annotated with nodes and finding counts", () => {
		const data = collect();
		expect(data.fileTree.files).toBe(3);
		const src = data.fileTree.children.find((c) => c.name === "src");
		expect(src.type).toBe("dir");
		const other = src.children.find((c) => c.name === "other.ts");
		expect(other.nodeSlug).toBeTruthy();
	});
});

describe("describeCondition", () => {
	it("flattens nested query objects into readable conditions", () => {
		expect(describeCondition({ mutants: { length: { gt: 0 } }, role: { not: "action" } })).toEqual([
			"mutants.length > 0",
			"role ≠ action",
		]);
		expect(describeCondition({ kind: { descendants: { any: { is: { equals: "ClassDeclaration" } } } } })).toEqual([
			"kind.descendants[*].is = ClassDeclaration",
		]);
	});
});

describe("invariant labels", () => {
	it("names `where` / `ignore` entries by kind instead of [object Object]", () => {
		const data = collect();
		const inv = data.invariants.find((i) => i.id === "no-long-files");
		expect(inv.where.length).toBeGreaterThan(0);
		for (const label of [...inv.where, ...inv.ignore]) {
			expect(label).not.toContain("object Object");
		}
	});
});

describe("renderOverview", () => {
	it("inlines the payload and the bundle into one standalone document", () => {
		const html = renderOverview(collect());
		expect(html.startsWith("<!doctype html>")).toBe(true);
		expect(html).toContain('id="arch-data"');
		expect(html).toContain('id="root"');
		// No external references: the file must open straight from disk.
		expect(html).not.toMatch(/<script[^>]+src=/);
		expect(html).not.toMatch(/<link[^>]+href=/);
	});

	it("escapes </script> so the payload cannot break out of its tag", () => {
		const data = collect();
		data.meta.orphans = ["</script><img src=x>"];
		const html = renderOverview(data);
		expect(html).not.toContain("</script><img src=x>");
	});
});

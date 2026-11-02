import { describe, it, expect } from "vitest";

// The generators are plain ES modules with no React/DOM dependency, so they
// can be exercised directly. They are the "no hardcoding" part of the report:
// every snippet is derived from the architecture + real paths.
const wiring = await import("../../report/user-report/src/generate/wiring.js");
const infer = await import("../../report/user-report/src/generate/infer.js");

describe("globToRegExp", () => {
	it("treats **/ as zero or more segments", () => {
		const re = wiring.globToRegExp("apps/backend/document/**/*.ts");
		expect(re.test("apps/backend/document/store.ts")).toBe(true);
		expect(re.test("apps/backend/document/actions/x.ts")).toBe(true);
		expect(re.test("apps/backend/config/settings.ts")).toBe(false);
	});

	it("keeps single-star inside one segment", () => {
		const re = wiring.globToRegExp("src/*.ts");
		expect(re.test("src/a.ts")).toBe(true);
		expect(re.test("src/nested/a.ts")).toBe(false);
	});
});

describe("concretize", () => {
	it("binds a placeholder to the path segment", () => {
		expect(wiring.concretize("apps/backend/{kebab-case}/store.ts", "apps/backend/document/store.ts")).toBe(
			"apps/backend/document/store.ts",
		);
	});
});

describe("relativeImport", () => {
	it("walks up to the common parent", () => {
		expect(wiring.relativeImport("apps/backend/config/api.ts", "apps/backend/document/store.ts")).toBe("../document/store");
		expect(wiring.relativeImport("apps/backend/store.ts", "apps/backend/document/store.ts")).toBe("./document/store");
	});
});

describe("relativeImport / good & bad wiring", () => {
	const nodes = [
		{ slug: "feature-actions", paths: ["src/doc/actions"], location: { declaration: { roles: ["action"], home: ["action"] } }, files: ["src/doc/actions/save.ts"] },
		{ slug: "doc", paths: ["src/doc"], kind: null, files: ["src/doc/controller.ts"] },
		{ slug: "config", paths: ["src/config"], kind: null, files: ["src/config/settings.ts"] },
		{ slug: "root-store", paths: ["src/store.ts"], kind: null, files: ["src/store.ts"] },
	];
	const role = {
		homes: [
			{
				slug: "feature-actions",
				paths: ["src/doc/actions"],
				files: ["src/doc/actions/save.ts"],
				importFrom: [{ type: "glob", value: "src/{kebab-case}/store.ts" }],
			},
		],
		examples: [{ name: "save", file: "src/doc/actions/save.ts", line: 1 }],
	};

	it("draws no wiring example from role names — a role is not a path", () => {
		// The old generator invented `import … from "…"` lines out of glob
		// paths. Roles are entities, not locations, so nothing is invented: the
		// panel lists the roles that may import instead.
		expect(wiring.goodWiring(role)).toBeNull();
		expect(wiring.badWiring(role, nodes)).toBeNull();
	});
});

describe("inferToYaml", () => {
	it("renders nested infer blocks as YAML", () => {
		const yaml = infer.inferToYaml([
			{ kind: { own: { is: { equals: "VariableDeclaration" } } } },
			{ initializer: { is: { in: ["CallExpression", "NewExpression"] }, origin: { equals: "t.model" } } },
		]);
		const lines = yaml.split("\n");
		expect(lines[0]).toBe("infer:");
		expect(yaml).toContain("is: { equals: VariableDeclaration }");
		expect(yaml).toContain("origin: { equals: t.model }");
		expect(lines.length).toBeGreaterThan(4);
	});

	it("handles a missing infer block", () => {
		expect(infer.inferToYaml(null)).toBe("infer: []");
	});
});

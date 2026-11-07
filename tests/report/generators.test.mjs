import { describe, it, expect } from "vitest";

// The generators are plain ES modules with no React/DOM dependency, so they can
// be exercised directly. They are the "no hardcoding" part of the report: every
// snippet is derived from the architecture + real paths.
//
// The WIRING generator used to live here too: glob → RegExp, template filling and
// relative imports. All three were second copies of `utils/pattern.compilePattern`
// and `entities/location.fillTemplate`, and the module that held them was dead
// (every entry point returned null), so both the module and its tests are gone —
// the behaviour is tested where it lives.
const infer = await import("../../report/user-report/src/generate/infer.js");

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

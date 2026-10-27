import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { globToRegex, expandBraces, compilePattern, checkRegex } = require("../../utils/pattern");

describe("pattern.globToRegex", () => {
	it("literal text matches itself", () => {
		expect(globToRegex("store.ts")).toBe("store\\.ts");
	});

	it("* matches within a segment only", () => {
		expect(new RegExp(`^${globToRegex("*.ts")}$`).test("a.ts")).toBe(true);
		expect(new RegExp(`^${globToRegex("*.ts")}$`).test("a/b.ts")).toBe(false);
	});

	it("** matches across segments", () => {
		expect(new RegExp(`^${globToRegex("**/store.ts")}$`).test("store.ts")).toBe(true);
		expect(new RegExp(`^${globToRegex("**/store.ts")}$`).test("a/b/store.ts")).toBe(true);
	});

	it("? matches a single non-slash char", () => {
		expect(new RegExp(`^${globToRegex("a?c")}$`).test("abc")).toBe(true);
		expect(new RegExp(`^${globToRegex("a?c")}$`).test("abbc")).toBe(false);
	});

	it("regex metacharacters are escaped", () => {
		expect(new RegExp(`^${globToRegex("a.b.ts")}$`).test("a.b.ts")).toBe(true);
		expect(new RegExp(`^${globToRegex("a.b.ts")}$`).test("axb.ts")).toBe(false);
	});
});

describe("pattern.expandBraces", () => {
	it("expands alternatives", () => {
		expect(expandBraces("{a,b}/x")).toEqual(["a/x", "b/x"]);
	});

	it("no braces = unchanged", () => {
		expect(expandBraces("a/b")).toEqual(["a/b"]);
	});

	it("braces compose with surrounding text", () => {
		expect(expandBraces("x{a,b}y")).toEqual(["xay", "xby"]);
	});
});

describe("pattern.compilePattern — placeholders", () => {
	it("{kebab-case} enforces kebab", () => {
		const { re, names } = compilePattern("{kebab-case}.ts");
		expect(names).toEqual(["kebab-case"]);
		expect(re.test("decorated-text.ts")).toBe(true);
		expect(re.test("decorated_text.ts")).toBe(false);
		expect(re.test("Decorated-text.ts")).toBe(false);
	});

	it("{camelCase} enforces camel", () => {
		const { re } = compilePattern("{camelCase}");
		expect(re.test("copyWithSubstitutions")).toBe(true);
		expect(re.test("CopyWithSubstitutions")).toBe(false);
		expect(re.test("copy-with")).toBe(false);
	});

	it("{PascalCase} enforces Pascal", () => {
		const { re } = compilePattern("{PascalCase}");
		expect(re.test("DecoratedText")).toBe(true);
		expect(re.test("decoratedText")).toBe(false);
	});

	it("unknown placeholder = any non-slash segment", () => {
		const { re, names } = compilePattern("{whatever}.ts");
		expect(names).toEqual(["whatever"]);
		expect(re.test("anything-goes.ts")).toBe(true);
		expect(re.test("a/b.ts")).toBe(false);
	});

	it("placeholders capture", () => {
		const { re } = compilePattern("{kebab-case}/store.ts");
		const m = re.exec("document/store.ts");
		expect(m[1]).toBe("document");
	});

	it("mixes braces and globs", () => {
		const { re } = compilePattern("**/{kebab-case}/{a,b}.ts");
		expect(re.test("x/document/a.ts")).toBe(true);
		expect(re.test("x/document/store.ts")).toBe(false);
	});
});

describe("pattern.checkRegex", () => {
	it("throws on invalid regex with context", () => {
		expect(() => checkRegex("([", "nodes.x")).toThrow(/nodes\.x.*invalid pattern/);
	});

	it("passes valid regexes", () => {
		expect(() => checkRegex("a(b|c)", "x")).not.toThrow();
	});
});


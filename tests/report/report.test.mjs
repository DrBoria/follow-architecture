import { createRequire } from "node:module";
const require = createRequire(import.meta.url);


import { describe, it, expect } from "vitest";
const { findingFrom } = require("../../report/cli-report");
const { renderReport } = require("../../report/cli-report");

describe("renderReport", () => {
	it("renders a header with the repo root", () => {
		const text = renderReport([], "/repo");
		expect(text).toContain("# follow-architecture report");
		expect(text).toContain("`/repo`");
	});

	it("renders an orphan section when present", () => {
		const text = renderReport([], "/repo", { orphans: ["stray.ts"] });
		expect(text).toContain("## Orphan files");
		expect(text).toContain("`stray.ts`");
	});

	it("omits the orphan section when empty", () => {
		const text = renderReport([], "/repo", { orphans: [] });
		expect(text).not.toContain("## Orphan files");
	});

	it("groups findings by code role and then by the piece, naming the place", () => {
		// A file is not what a finding is ABOUT: two actions in one file are two
		// answers about one role, and a reader looking for "what is wrong with this
		// action" must not have to open a file name first.
		const f = (file, message, fix, what, role) => ({ file, message, fix, what, role, node: "n", rule: "r", key: `role:${role}`, pos: { line: 1, column: 1 } });
		const text = renderReport(
			[
				f("a.ts", "bad a", "fix a", "openAction", "action"),
				f("a.ts", "bad a2", null, "closeAction", "action"),
				f("b.ts", "bad b", null, "helper", "pureFunction"),
			],
			"/repo"
		);
		// Role headings, one per role, pieces under them.
		expect(text).toContain("### `action` code");
		expect(text).toContain("### `pureFunction` code");
		expect(text).not.toContain("### `a.ts`");
		expect(text).toContain("#### `openAction` — `a.ts:1`");
		expect(text).toContain("#### `closeAction` — `a.ts:1`");
		expect(text).toContain("bad a");
		// A repair is a LIST, never one sentence: the format says how many options
		// the reader has, so a single "Delete it." cannot hide the alternatives.
		expect(text).toContain("**Fix** — 1 option");
		expect(text).toContain("fix a");
	});

	it("keeps findings that belong to no role in their own section", () => {
		const f = (file, message) => ({ file, message, fix: null, what: null, role: null, node: "n", rule: "r", key: file, pos: { line: 2, column: 1 } });
		const text = renderReport([f("a.ts", "no role here")], "/repo");
		expect(text).toContain("### node `n`");
		expect(text).toContain("#### `a.ts` — `a.ts:2`");
	});
});

describe("findingFrom", () => {
	it("substitutes variables into the report message", () => {
		const f = findingFrom(
			{ report: { message: "file {basename} is wrong" } },
			"rule",
			"node",
			"prefix",
			{ basename: "x.ts" }
		);
		expect(f.message).toBe("file x.ts is wrong");
	});

	it("keeps unknown variables as placeholders", () => {
		const f = findingFrom(
			{ report: { message: "file {basename} is wrong" } },
			"rule",
			"node",
			"prefix",
			{}
		);
		expect(f.message).toBe("file {basename} is wrong");
	});

	it("builds a stable dedup key from key or message", () => {
		const a = findingFrom({ key: "k" }, "rule", "node", "prefix", {});
		const b = findingFrom({ key: "k" }, "rule", "node", "prefix", {});
		expect(a.key).toBe(b.key);
	});
});


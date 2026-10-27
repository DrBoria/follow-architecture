import { createRequire } from "node:module";
const require = createRequire(import.meta.url);


import { describe, it, expect } from "vitest";
const { findingFrom } = require("../../report/report");
const { renderReport } = require("../../report/user-report");

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

	it("groups findings by file and renders fixes", () => {
		const f = (file, message, fix) => ({ file, message, fix, node: "n", rule: "r", key: file, pos: { line: 1, column: 1 } });
		const text = renderReport(
			[
				f("a.ts", "bad a", "fix a"),
				f("b.ts", "bad b", null),
			],
			"/repo"
		);
		expect(text).toContain("### `a.ts`");
		expect(text).toContain("### `b.ts`");
		expect(text).toContain("bad a");
		expect(text).toContain("**Fix.**");
		expect(text).toContain("fix a");
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


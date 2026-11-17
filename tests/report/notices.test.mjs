import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { notice, takeNotices, resetNotices } = require("../../report/notices");
const { renderNotices } = require("../../report/cli-report");
const { documentFacts } = require("../../css/document");

// A NOTICE is how the tool tells the reader that an answer is PARTIAL. Every
// reader that swallows an error states the subject (what it was reading) and the
// reason; the report owns the wording and the run owns the list.
afterEach(() => resetNotices());

describe("notices", () => {
	it("keeps one line per distinct sentence", () => {
		notice("framework `react` could not be loaded", "boom");
		notice("framework `react` could not be loaded", "boom");
		notice("framework `react` could not be loaded", "another reason");

		expect(takeNotices()).toEqual(["framework `react` could not be loaded: boom", "framework `react` could not be loaded: another reason"]);
	});

	it("hands the run its notices once", () => {
		notice("a", "b");
		expect(takeNotices()).toEqual(["a: b"]);
		expect(takeNotices()).toEqual([]);
	});

	it("renders as a section of its own, after the findings", () => {
		expect(renderNotices([])).toBe("");
		expect(renderNotices(["a: b"])).toContain("## Not read (1)");
		expect(renderNotices(["a: b"])).toContain("- a: b");
	});

	it("a document the parser rejects is REPORTED, not thrown", () => {
		const facts = documentFacts("a { color: ", { parse: () => { throw new Error("unclosed block"); } });

		expect(facts.parsed).toBe(false);
		expect(facts.declarations).toEqual([]);
		expect(takeNotices()).toContain("a CSS document could not be parsed: unclosed block");
	});
});

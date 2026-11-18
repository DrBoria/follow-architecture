import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classFacts, utilityFacts, engine } = require("../../css/tailwind");
const { attachClasses } = require("../../css/markup");
const { createTsProject, loadSourceFile, collectCandidates, importNameModules } = require("../../entities/ast");

// Tailwind is CSS in an attribute: the same facts must come out of a React
// `className` and (later) a Vue `class`, so the reading lives in the CSS facet.
//
// The vocabulary comes FROM Tailwind — no table of prefixes is kept here — so the
// assertions are about what Tailwind says a class sets.

describe("tailwind — utilities as facts", () => {
	it("asks Tailwind what the class sets", () => {
		expect(engine()?.version).toMatch(/^\d+\./);
		expect(utilityFacts("p-4")).toMatchObject({ known: true, properties: ["padding"] });
		expect(utilityFacts("bg-red-500").properties).toContain("background-color");
		expect(utilityFacts("-mt-2")).toMatchObject({ known: true, negative: true, properties: ["margin-top"] });
	});

	it("a variant is a condition, not part of the utility", () => {
		expect(utilityFacts("md:hover:p-4")).toMatchObject({ variants: ["md", "hover"], utility: "p-4", properties: ["padding"] });
	});

	it("keeps an arbitrary value as an arbitrary — the literal a design system owns", () => {
		expect(utilityFacts("w-[13px]")).toMatchObject({ base: "w", value: "13px", arbitrary: true, properties: ["width"] });
		expect(utilityFacts("bg-[#fff]")).toMatchObject({ arbitrary: true });
	});

	it("a class Tailwind does not know is `known: false`, not silence", () => {
		expect(utilityFacts("not-a-real-class")).toMatchObject({ known: false, properties: [] });
	});

	it("reads a class attribute into a list", () => {
		expect(classFacts("flex  p-4\ttext-sm").map((c) => c.raw)).toEqual(["flex", "p-4", "text-sm"]);
	});
});

describe("tailwind — attached to the piece that declares it", () => {
	const candidatesOf = (code) => {
		const rel = "a/card.tsx";
		const sf = loadSourceFile(createTsProject(), rel, code);

		return attachClasses(collectCandidates(sf, importNameModules(sf, ".", {}, [rel]), rel, "."), { sf });
	};

	it("attaches static classes to the declaring component only", () => {
		const candidates = candidatesOf(`export const Card = () => <div className="flex p-4" />;
export const Plain = () => <div />;`);

		const card = candidates.find((c) => c.name === "Card" && c.kind.own.is === "ArrowFunction");
		const plain = candidates.find((c) => c.name === "Plain" && c.kind.own.is === "ArrowFunction");

		expect(card.css.classes.map((c) => c.raw)).toEqual(["flex", "p-4"]);
		expect(plain.css).toBeUndefined();
	});

	it("a computed class is not guessed at", () => {
		const candidates = candidatesOf("export const Card = ({ on }) => <div className={on ? 'a' : 'b'} />;");

		expect(candidates.find((c) => c.name === "Card" && c.kind.own.is === "ArrowFunction").css).toBeUndefined();
	});

	it("a class list written once as a const string is read through its name", () => {
		const candidates = candidatesOf(`const ButtonTheme = "text-[#fff] border p-2 md:hover:p-4";
export const Card = () => <div className={ButtonTheme} />;`);

		const card = candidates.find((c) => c.name === "Card" && c.kind.own.is === "ArrowFunction");
		expect(card.css.classes.map((c) => c.raw)).toEqual(["text-[#fff]", "border", "p-2", "md:hover:p-4"]);
		// The arbitrary value is still flagged — the reading is the same one.
		expect(card.css.classes.find((c) => c.raw === "text-[#fff]").arbitrary).toBe(true);
		// Every class carries the line of the ATTRIBUTE that uses it.
		expect(card.css.classes.every((c) => c.line === 2)).toBe(true);
	});

	it("a reassigned binding is not a static class list", () => {
		const candidates = candidatesOf(`let cls = "flex";
cls = "p-4";
export const Card = () => <div className={cls} />;`);

		expect(candidates.find((c) => c.name === "Card" && c.kind.own.is === "ArrowFunction").css).toBeUndefined();
	});

	it("a template with interpolation is not a static class list", () => {
		const candidates = candidatesOf(`const size = "p-4";
const cls = \`flex \${size}\`;
export const Card = () => <div className={cls} />;`);

		expect(candidates.find((c) => c.name === "Card" && c.kind.own.is === "ArrowFunction").css).toBeUndefined();
	});
});

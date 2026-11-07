import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classFacts, utilityFacts } = require("../../css/tailwind");
const { createTsProject, loadSourceFile, collectCandidates, importNameModules } = require("../../entities/ast");
const { attachClasses } = require("../../css/tailwind");

// Tailwind is CSS in an attribute: the same facts must come out of a React
// `className` and (later) a Vue `class`, so the reading lives in the CSS facet.

describe("tailwind — utilities as facts", () => {
	it("splits variants, utility, value and family", () => {
		expect(utilityFacts("md:hover:p-4")).toEqual({
			raw: "md:hover:p-4",
			variants: ["md", "hover"],
			utility: "p-4",
			base: "p",
			value: "4",
			arbitrary: false,
			kind: "spacing",
		});
	});

	it("keeps an arbitrary value as an arbitrary — the literal a design system owns", () => {
		expect(utilityFacts("w-[13px]")).toMatchObject({ base: "w", value: "13px", arbitrary: true, kind: "size" });
		expect(utilityFacts("bg-[#fff]")).toMatchObject({ arbitrary: true, kind: "colour" });
	});

	it("a utility with no family is `other`, not silence", () => {
		expect(utilityFacts("group").kind).toBe("other");
		expect(utilityFacts("-mt-2").kind).toBe("spacing");
	});

	it("reads a class attribute into a list", () => {
		expect(classFacts("flex  p-4\ttext-sm").map((c) => c.utility)).toEqual(["flex", "p-4", "text-sm"]);
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

		expect(card.css.classes.map((c) => c.utility)).toEqual(["flex", "p-4"]);
		expect(plain.css).toBeUndefined();
	});

	it("a computed class is not guessed at", () => {
		const candidates = candidatesOf("export const Card = ({ on }) => <div className={on ? 'a' : 'b'} />;");

		expect(candidates.find((c) => c.name === "Card" && c.kind.own.is === "ArrowFunction").css).toBeUndefined();
	});
});

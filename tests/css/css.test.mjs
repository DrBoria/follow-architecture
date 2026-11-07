import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile } = require("../../entities/ast");
const css = require("../../css");

// CSS is a FACT source, not a rule: these tests pin WHAT IS READ (declarations,
// typed values, `var()`, the link back to `${…}`), never what should be written.

const TEMPLATE = `
export const StyledButton = styled.button<{ $size: "small" }>\`
  display: flex;
  height: \${({ theme }) => theme.elements.form.height};
  padding: 16px;
  color: \${({ theme }) => theme.colors.highlighted};
  border: 1px solid #fff;
  background: var(--section-bg);
  width: calc(100% - 2px);
  opacity: 0.5;

  &:disabled {
    opacity: 0.4;
  }
\`;
`;

const templateOf = (code) => {
	const project = createTsProject();
	const sf = loadSourceFile(project, "a/button.tsx", code);
	const nodes = sf.getDescendantsOfKind(require("ts-morph").SyntaxKind.TaggedTemplateExpression);
	return nodes.map((node) => css.templateFacts(node));
};

describe("css — template facts", () => {
	const [facts] = templateOf(TEMPLATE);

	it("finds the tag and keeps the document order", () => {
		expect(facts.tag).toBe("styled.button");
		expect(facts.declarations.map((d) => d.prop)).toEqual([
			"display",
			"height",
			"padding",
			"color",
			"border",
			"background",
			"width",
			"opacity",
			"opacity",
		]);
	});

	it("separates typed values from values that come from somewhere", () => {
		const padding = facts.declarations.find((d) => d.prop === "padding");
		expect(padding.literals).toEqual([{ kind: "length", text: "16px", unit: "px", line: 4 }]);

		// `theme.elements.form.height` is an expression, not a literal
		const height = facts.declarations.find((d) => d.prop === "height");
		expect(height.literals).toEqual([]);
		expect(facts.themeReads.map((r) => r.text)).toEqual([
			"({ theme }) => theme.elements.form.height",
			"({ theme }) => theme.colors.highlighted",
		]);
	});

	it("names a colour literal and a colour function as colours", () => {
		const border = facts.declarations.find((d) => d.prop === "border");
		expect(border.literals).toEqual([
			{ kind: "length", text: "1px", unit: "px", line: 6 },
			{ kind: "color", text: "#fff", line: 6 },
		]);
	});

	it("keeps `var(--x)` as a variable reference, and `calc()` as an expression", () => {
		expect(facts.vars).toEqual(["--section-bg"]);
		const width = facts.declarations.find((d) => d.prop === "width");
		expect(width.exprs).toEqual([{ kind: "math", text: "calc(100% - 2px)", line: 8 }]);
		expect(width.literals).toEqual([]);
	});

	it("knows which rule a declaration belongs to", () => {
		const disabled = facts.declarations.filter((d) => d.rule === "&:disabled");
		expect(disabled).toHaveLength(1);
		expect(facts.rules.map((r) => r.selector)).toEqual(["&:disabled"]);
	});

	it("reads a comment above a declaration as data", () => {
		const withComment = templateOf("const A = styled.div`\n  /* why */\n  color: #000;\n`;")[0];
		expect(withComment.declarations[0].comment).toEqual({ text: "why", line: 2 });
	});
});

describe("css — stylesheet facts", () => {
	it("parses a .css file with the same shape as a template", () => {
		const facts = css.stylesheetFacts(":root {\n  --gap: 8px;\n}\n.a {\n  gap: var(--gap);\n  color: #123456;\n}\n");
		expect(facts.rules.map((r) => r.selector)).toEqual([":root", ".a"]);
		expect(facts.declarations.find((d) => d.prop === "gap")).toBeTruthy();
		expect(facts.literals.map((l) => l.text)).toEqual(["8px", "#123456"]);
	});
});

describe("css — tailwind class lists", () => {
	it("splits a class string, including variants", () => {
		expect(css.classList("flex p-4 md:p-6  p-4")).toEqual(["flex", "p-4", "md", "p-6"]);
	});
});

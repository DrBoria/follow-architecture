import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildRoles } = require("../../report/user-report/data/roles");
const { buildArchitecture } = require("../../main");
const { createTsProject } = require("../../entities/ast");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// The role card's REAL EXAMPLE must show WHAT made the piece that role: the
// exact declarations the infer caught, tinted — not an unmarked window that
// looks identical for cssVariable, styleInversion and styledBlock. The ranges
// are derived from the role's own infer filters, so the mark cannot disagree
// with the classification.

const ARCH = {
	codeRoles: [
		{
			slug: "styleInversion",
			name: "inverting style",
			infer: [
				{ css: { templates: { any: { declarations: { any: { rule: { matches: "*:*" }, prop: { in: ["background", "background-color"] } } } } } } },
				{ css: { templates: { any: { declarations: { any: { rule: { matches: "*:*" }, prop: { in: ["color", "fill", "stroke"] } } } } } } },
			],
		},
		{
			slug: "cssVariable",
			name: "css variable",
			infer: [{ css: { templates: { any: { declarations: { any: { vars: { length: { gt: 0 } } } } } } } }],
		},
		{ slug: "styledBlock", name: "style block", infer: [{ css: { templates: { length: { gt: 0 } } } }] },
	],
	nodes: [{ slug: "root", name: ".", children: ["**"] }],
};

// One piece per role, so each card's first example is the piece that role
// actually describes (first-match-wins would give one block a single role).
const CODE = `import styled from "styled-components";
export const Inverting = styled.div\`
  &:hover {
    color: #fff;
    background-color: #000;
  }
\`;
export const WithVar = styled.div\`
  display: flex;
  gap: calc(var(--basic-padding) * 2);
\`;
export const Plain = styled.div\`
  display: flex;
\`;
`;

describe("role examples mark the lines the infer matched", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-role-marks-"));
	fs.writeFileSync(path.join(root, "box.tsx"), CODE);
	const arch = buildArchitecture(ARCH);
	arch.repoRoot = root;
	const roles = buildRoles({
		arch,
		files: ["box.tsx"],
		repoRoot: root,
		repoFiles: ["box.tsx"],
		project: createTsProject({ repoRoot: root, aliases: {} }),
		nodes: [],
	});
	const exampleOf = (slug) => roles.find((r) => r.slug === slug)?.examples?.[0];

	it("cssVariable marks only the declaration that reads a variable", () => {
		const ex = exampleOf("cssVariable");
		expect(ex.name).toBe("WithVar");
		// `gap` is file line 10, snippet starts at line 8 → relative 2.
		expect(ex.matched).toEqual([{ from: 2, to: 2, why: "gap" }]);
	});

	it("styleInversion marks the state declarations that swap the pair", () => {
		const ex = exampleOf("styleInversion");
		expect(ex.name).toBe("Inverting");
		const whys = ex.matched.map((m) => m.why).sort();
		expect(whys).toEqual(["background-color in &:hover", "color in &:hover"]);
		// file lines 5 and 4, snippet starts at line 2 → relative 3 and 2.
		expect(ex.matched.map((m) => m.from).sort()).toEqual([2, 3]);
	});

	it("styledBlock marks the whole template — it has no narrower demand", () => {
		const ex = exampleOf("styledBlock");
		expect(ex.name).toBe("Plain");
		// snippet starts at line 12 (the const), template body lines 13-14 → 0..2.
		expect(ex.matched).toEqual([{ from: 0, to: 2, why: "css template" }]);
	});

	it("a named piece is the face of a role, not an anonymous interpolation", () => {
		for (const slug of ["cssVariable", "styleInversion", "styledBlock"]) {
			expect(exampleOf(slug).name, slug).not.toBe("(anonymous)");
		}
	});
});

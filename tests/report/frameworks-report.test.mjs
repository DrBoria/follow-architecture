import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildCss } = require("../../report/user-report/data/css");
const { buildFrameworks } = require("../../report/user-report/data/frameworks");
const { buildFrameworkFolder, folderOf } = require("../../report/user-report/data/framework-folder");

// The report is a GROUPING of facts — no parsing here. These tests feed it file
// facts exactly as the pipeline produces them and check the shape the UI draws.

const files = [
	{
		rel: "apps/web/components/card.tsx",
		candidates: [
			{
				name: "Card",
				framework: { id: "react", component: true, props: ["a", "b", "c", "d"], forwarded: ["a", "b", "c", "d"], jsx: [{ tag: "Row" }, { tag: "Box" }] },
				css: {
					templates: [
						{
							declarations: [
								{ prop: "color", literals: [{ kind: "colour", raw: "#fff" }], vars: [], exprs: [] },
								{ prop: "padding", literals: [{ kind: "number", raw: "4px" }], vars: ["--gap"], exprs: [] },
							],
						},
					],
				},
			},
		],
	},
	{
		rel: "apps/web/components/plain.ts",
		candidates: [{ name: "sum", framework: { id: "react", component: false, props: [], forwarded: [], jsx: [] } }],
	},
];

describe("report — css", () => {
	it("counts literals per file and collects the variable vocabulary", () => {
		const css = buildCss({ files });

		expect(css.totals.files).toBe(1);
		expect(css.totals.literals).toBe(2);
		expect(css.totals.colours).toBe(1);
		expect(css.files[0].candidates).toEqual(["Card"]);
		expect(css.vocabulary).toEqual([{ name: "--gap", uses: 1 }]);
	});

	it("a file with no styled template does not appear", () => {
		expect(buildCss({ files }).files.map((f) => f.file)).toEqual(["apps/web/components/card.tsx"]);
	});
});

describe("report — frameworks", () => {
	it("keeps components only, sorted by how much they drill", () => {
		const frameworks = buildFrameworks({ files });

		expect(frameworks.totals.components).toBe(1);
		expect(frameworks.components[0]).toMatchObject({ name: "Card", drilled: 4, renders: ["Row", "Box"] });
		expect(frameworks.detected).toEqual([{ id: "react", pieces: 2 }]);
	});

	it("groups components by folder with the architecture node that owns it", () => {
		const frameworks = buildFrameworks({ files });
		const byFolder = buildFrameworkFolder({ components: frameworks.components, arch: null });

		expect(byFolder.folders[0]).toMatchObject({ folder: "apps/web/components", components: 1, drilled: 4, owned: false });
		expect(byFolder.totals.unowned).toBe(1);
	});

	it("folderOf treats a root file as the root", () => {
		expect(folderOf("index.ts")).toBe("");
		expect(folderOf("apps/x.ts")).toBe("apps");
	});
});

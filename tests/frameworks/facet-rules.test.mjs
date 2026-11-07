import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classifyRoles } = require("../../code-roles/classify");

// The point of the facets: a rule written against `framework.*` or `css.*` needs
// NO new machinery — the same `queries` / `location` / `kind` / `length` / `gt`
// that already work on `kind` and `calls` work here, because the facets put their
// readings into the candidate as plain facts.

const fn = (name, extra = {}) => ({
	kind: { own: { is: "ArrowFunction" } },
	name,
	line: 1,
	returns: [],
	calls: [],
	assignments: [],
	...extra,
});

const roles = (defs, candidates) => classifyRoles(candidates, defs, {}).candidates;

describe("facets — rules read them like any other fact", () => {
	it("a code role can be defined on how much a component drills", () => {
		const codeRoles = {
			drillingComponent: { infer: [{ framework: { forwarded: { length: { gt: 3 } } } }] },
			leafComponent: { infer: [{ framework: { component: { equals: true } } }, { framework: { forwarded: { length: { equals: 0 } } } }] },
		};

		const candidates = [
			fn("Panel", { framework: { id: "react", component: true, props: ["a", "b", "c", "d", "e"], forwarded: ["a", "b", "c", "d"], jsx: [] } }),
			fn("Chip", { framework: { id: "react", component: true, props: ["label"], forwarded: [], jsx: [] } }),
		];

		const out = roles(codeRoles, candidates);

		expect(out.find((c) => c.name === "Panel").role).toContain("drillingComponent");
		expect(out.find((c) => c.name === "Chip").role).toContain("leafComponent");
		expect(out.find((c) => c.name === "Chip").role).not.toContain("drillingComponent");
	});

	it("a code role can be defined on style literals and on the design-system variables", () => {
		const codeRoles = {
			hardcodedStyle: { infer: [{ css: { templates: { any: { declarations: { any: { literals: { length: { gt: 0 } } } } } } } }] },
			themedStyle: { infer: [{ css: { templates: { any: { declarations: { any: { vars: { length: { gt: 0 } } } } } } } }] },
		};

		const literals = { kind: "number", raw: "4px" };
		const candidates = [
			fn("Box", { css: { templates: [{ declarations: [{ prop: "padding", literals: [literals], vars: [], exprs: [] }] }] } }),
			fn("Panel", { css: { templates: [{ declarations: [{ prop: "padding", literals: [], vars: ["--gap"], exprs: [] }] }] } }),
		];

		const out = roles(codeRoles, candidates);

		expect(out.find((c) => c.name === "Box").role).toBe("hardcodedStyle");
		expect(out.find((c) => c.name === "Panel").role).toBe("themedStyle");
	});

	it("a framework role and a kind gate can be combined in one piece", () => {
		const codeRoles = {
			componentForwardingWhole: { infer: [{ kind: { own: { is: { equals: "ArrowFunction" } } } }, { framework: { forwarded: { any: { equals: "props" } } } }] },
		};

		const candidates = [fn("Wrapper", { framework: { id: "react", component: true, props: ["props"], forwarded: ["props"], jsx: [] } }), fn("Sum")];

		const out = roles(codeRoles, candidates);

		expect(out.find((c) => c.name === "Wrapper").role).toBe("componentForwardingWhole");
		expect(out.find((c) => c.name === "Sum").role).toBeNull();
	});
});

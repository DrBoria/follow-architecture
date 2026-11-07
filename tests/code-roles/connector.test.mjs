import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { enrichWithRoles, roleOfTarget } = require("../../code-roles/connector");
const { rolesAtPath } = require("../../entities/location");
const { buildTree } = require("../../entities/tree");

describe("roleOfTarget", () => {
	const toMap = (cands) => new Map(cands.filter((c) => c.name && c.role).map((c) => [c.name, c]));

	it("resolves a bare call by its action", () => {
		const map = toMap([{ name: "makeThing", role: "factory" }]);
		expect(roleOfTarget({ action: "makeThing", origin: "makeThing" }, map)).toBe("factory");
	});

	it("resolves a member call (obj.method) by the bare member name", () => {
		const map = toMap([{ name: "toggleLine", role: "action" }]);
		expect(roleOfTarget({ action: "toggleLine", origin: "self" }, map)).toBe("action");
	});

	it("falls back to the origin when the action is not a known candidate", () => {
		const map = toMap([{ name: "makeThing", role: "factory" }]);
		expect(roleOfTarget({ action: "run", origin: "makeThing" }, map)).toBe("factory");
	});

	it("returns null when no candidate matches", () => {
		const map = toMap([{ name: "toggleLine", role: "action" }]);
		expect(roleOfTarget({ action: "other", origin: "self" }, map)).toBeNull();
	});
});

// A call resolved into another file carries a `target` LOCATION; the role is
// whatever the architecture declares there. No separate resolver, no parsing
// of the other file — the same `location` relation `allowedFrom` uses.
describe("rolesAtPath — the ONE answer to \"which role is declared here\"", () => {
	const arch = {
		nodes: buildTree([
			{ slug: "root", name: ".", children: ["src"] },
			{ slug: "src", name: "src", parent: "root", children: ["{kebab-case}"] },
			{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["actions", "store.ts"] },
			{ slug: "actions", name: "actions", parent: "feature", role: "action" },
			{ slug: "store", name: "store.ts", parent: "feature", role: "storeModel" },
		]),
		// A role's home is the node that declares it in its children — the role
		// itself says nothing about folders.
		codeRoles: {
			action: {},
			storeModel: {},
		},
	};

	it("reads the role whose home covers the path", () => {
		expect(rolesAtPath(arch, "src/feature/actions/reveal.ts")).toEqual(["action"]);
	});

	it("reads the role of a file a node names exactly", () => {
		expect(rolesAtPath(arch, "src/feature/store.ts")).toEqual(["storeModel"]);
	});

	it("answers nothing where no role is declared", () => {
		expect(rolesAtPath(arch, "src/feature/other.ts")).toEqual([]);
		expect(rolesAtPath(arch, "lib/whatever.ts")).toEqual([]);
		expect(rolesAtPath(arch, null)).toEqual([]);
	});
});

describe("enrichWithRoles", () => {
	it("resolves targetRole for a call into another file through its location", () => {
		const arch = {
			codeRoles: {
				action: {},
				orchestrator: { infer: [{ calls: { any: { target: { location: { node: "actions" } } } } }] },
			},
			nodes: buildTree([
				{ slug: "root", name: ".", children: ["src"] },
				{ slug: "src", name: "src", parent: "root", children: ["{kebab-case}"] },
				{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["actions"] },
				{ slug: "actions", name: "actions", parent: "feature", role: "action" },
			]),
		};
		const candidates = [
			{
				kind: { own: { is: "FunctionDeclaration" } },
				name: "loadDocument",
				line: 1,
				calls: [{ action: "reveal", origin: "reveal", target: { path: "src/feature/actions/reveal.ts", name: "reveal" } }],
			},
		];
		const enriched = enrichWithRoles(candidates, arch.codeRoles, arch);
		expect(enriched[0].calls[0].targetRole).toBe("action");
		expect(enriched[0].role).toBe("orchestrator");
	});

	it("tags call targets with the resolved role of the callee", () => {
		const roles = {
			action: { infer: [{ kind: { own: { is: { equals: "MethodDeclaration" } } } }] },
			orchestrator: { infer: [{ kind: { own: { is: { equals: "ArrowFunction" } } }, calls: { length: { gt: 0 } } }] },
		};
		const candidates = [
			{ kind: { own: { is: "MethodDeclaration" } }, name: "toggleLine", line: 1, calls: [], returns: [], assignments: [] },
			{ kind: { own: { is: "ArrowFunction" } }, name: "run", line: 2, calls: [{ action: "toggleLine", origin: "self" }], returns: [], assignments: [] },
		];
		const enriched = enrichWithRoles(candidates, roles);
		const run = enriched.find((c) => c.name === "run");
		expect(run.role).toBe("orchestrator");
		expect(run.calls[0].targetRole).toBe("action");
	});
});

// Roles compose by naming each other (`infer: ["base"]`), which is the same
// mechanism classification already uses — no `extend` keyword, no second list.
describe("codeRole references", () => {
	it("a role can be defined as another role plus a narrowing filter", () => {
		const { normalizeCodeRoles } = require("../../code-roles/roles");
		const roles = normalizeCodeRoles([{ slug: "base" }, { slug: "narrow", infer: ["base", { lines: { gt: 5 } }] }]);
		expect(roles.narrow.infer).toEqual([{ role: { equals: "base" } }, { lines: { gt: 5 } }]);
	});
});

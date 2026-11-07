import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect } from "vitest";
const { buildTree, deepestMatch, checkTree } = require("../../entities/tree");
const { buildArchitecture } = require("../../main");

const archOf = (nodes) => ({ nodes: buildTree(nodes), invariants: [] });

describe("nodes: multi-parent (parent: [a, b])", () => {
	const arch = archOf({
		src: { slug: "src", name: "src" },
		features: { slug: "features", name: "features", parent: "src" },
		admin: { slug: "admin", name: "admin", parent: "src" },
		// `shared` lives under BOTH features and admin.
		shared: { slug: "shared", name: "shared", parent: ["features", "admin"], children: ["index.ts"] },
	});

	it("builds one path variant per parent", () => {
		const n = arch.nodes.bySlug.shared;
		expect(n.variants.map((v) => v.path)).toEqual(["src/features/shared", "src/admin/shared"]);
		// Canonical fields come from the first variant.
		expect(n.path).toBe("src/features/shared");
	});

	it("matches a file under either parent", () => {
		expect(deepestMatch("src/features/shared/index.ts", arch).node.slug).toBe("shared");
		expect(deepestMatch("src/admin/shared/index.ts", arch).node.slug).toBe("shared");
	});

	it("validates closed children under both parents", () => {
		const finding = (o) => o;
		const bad = [];
		checkTree("src/admin/shared/stray.ts", arch, bad, finding);
		expect(bad.map((f) => f.key)).toContain("closed");

		const ok = [];
		checkTree("src/features/shared/index.ts", arch, ok, finding);
		expect(ok).toHaveLength(0);
	});

	it("names everything the folder allows, and fixes only what it can prove", () => {
		const bad = [];
		checkTree("src/admin/shared/stray.ts", arch, bad, (o) => o);
		const finding = bad.find((f) => f.key === "closed");
		// The message carries both halves of the rule: what is wrong and what is
		// allowed. A bare "not an allowed child" is unusable in a console.
		// ONE sentence for every undeclared entry — a wrong file name, a directory,
		// a stray `.tsx`: the node's own list is the rule, and the kind of the entry
		// is not a second rule to spell out.
		expect(finding.report.message).toContain("is not an entry this folder declares");
		expect(finding.report.message).toContain("A `shared` folder holds: `index.ts`");
		// No role here declares a home, so no destination can be invented. The fix
		// names only what the folder DOES declare — where the content belongs and
		// that the stray file then goes — so it is actionable without guessing.
		expect(finding.report.fix).toContain("files this folder declares");
	});

	it("rejects an unknown parent slug", () => {
		expect(() => archOf({ a: { slug: "a", name: "a", parent: "nope" } })).toThrow(/unknown parent/);
	});
});

describe("nodes: root node with name \".\"", () => {
	// Regression: a root node named "." (the real md-prettify config) used to
	// join child paths as `./apps/...` — the `./` prefix never matches a real
	// relative path, so every file fell back to `root` and location/import
	// checks silently passed.
	const arch = archOf({
		root: { slug: "root", name: ".", },
		apps: { slug: "apps", name: "apps", parent: "root" },
		backend: { slug: "backend", name: "backend", parent: "apps" },
		document: { slug: "document", name: "document", parent: "backend" },
		store: { slug: "store", name: "store.ts", parent: "document" },
	});

	it("resolves child paths without a `./` prefix", () => {
		expect(arch.nodes.bySlug.apps.path).toBe("apps");
		expect(arch.nodes.bySlug.store.path).toBe("apps/backend/document/store.ts");
	});

	it("matches a deep file to its real node, not the root", () => {
		expect(deepestMatch("apps/backend/document/store.ts", arch).node.slug).toBe("store");
	});

	it("still reports closed violations under the root", () => {
		const bad = [];
		checkTree("stray.ts", arch, bad, (o) => o);
		expect(bad.map((f) => f.key)).toContain("closed");
	});
});

// A child may BE another declared node (`{ node: slug }`): the parent then
// does not repeat that node's name template, and the child's own rules
// (required parts, declaration, location) apply. So a folder list reads
// "these children are features", not "any kebab-case folder".
describe("node-reference children", () => {
	it("matches by the referenced node's own name template", () => {
		const arch = buildTree([
			{ slug: "apps", name: "apps", children: [{ node: "feature" }] },
			{ slug: "feature", name: "{kebab-case}", parent: "apps" },
		]);
		const child = arch.bySlug.apps.children[0];
		expect(child.re.test("document")).toBe(true);
		expect(child.re.test("Document")).toBe(false);
		expect(child.re.test("with/slash")).toBe(false);
	});

	it("fails loudly when it points at a node that does not exist", () => {
		expect(() => buildTree([{ slug: "apps", name: "apps", children: [{ node: "nope" }] }])).toThrow(/unknown node nope/);
	});
});

describe("nodes: structure only", () => {
	it("rejects a key that belongs to a codeRole", () => {
		// A node is a folder. `kind` / `declares` / `location` / `roles` were node
		// keys once — silently ignoring one would let the YAML claim a rule that
		// nothing enforces.
		for (const key of ["kind", "declares", "location", "roles"]) {
			expect(() => buildTree([{ slug: "a", name: "a", [key]: {} }])).toThrow(new RegExp(`unknown key \`${key}\``));
		}
	});

	it("accepts the structure keys, and `closed` is not one of them — it is gone", () => {
		const tree = buildTree([{ slug: "a", name: "a", children: ["x.ts"], report: { message: "no" } }]);
		expect(tree.bySlug.a.closed).toBeUndefined();
		// `closed` is not a structure key any more: an unknown key is an error.
		expect(() => buildTree([{ slug: "a", name: "a", closed: true }])).toThrow(/unknown key `closed`/);
	});
});

describe("nodes: which role their code is", () => {
	const arch = () => buildArchitecture({
		nodes: [
			{ slug: "src", name: "src" },
			{ slug: "store", name: "store.ts", parent: "src", role: ["storeModel"] },
			{ slug: "type", name: "type.ts", parent: "src", role: "sharedTypes" },
		],
		codeRoles: { storeModel: {}, sharedTypes: {} },
	});

	it("gives the role a home without the role naming any folder", () => {
		const tree = arch().nodes;
		expect(tree.roleHomes.storeModel).toEqual([{ template: "src/store.ts", node: "store" }]);
		expect(tree.roleHomes.sharedTypes).toEqual([{ template: "src/type.ts", node: "type" }]);
		// …and the roles themselves carry no location at all.
		expect(arch().codeRoles.storeModel).not.toHaveProperty("where");
		expect(arch().codeRoles.storeModel).not.toHaveProperty("home");
	});

	it("fails loudly when a node gives a home to a role nothing declares", () => {
		expect(() =>
			buildArchitecture({ nodes: [{ slug: "src", name: "src", role: "nope" }], codeRoles: {} }),
		).toThrow(/role: nope/);
	});
});

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect } from "vitest";
const { buildTree, deepestMatch, checkTree } = require("../../nodes/tree");

const archOf = (nodes) => ({ nodes: buildTree(nodes), invariants: [] });

describe("nodes: multi-parent (parent: [a, b])", () => {
	const arch = archOf({
		src: { slug: "src", name: "src" },
		features: { slug: "features", name: "features", parent: "src" },
		admin: { slug: "admin", name: "admin", parent: "src" },
		// `shared` lives under BOTH features and admin.
		shared: { slug: "shared", name: "shared", parent: ["features", "admin"], closed: true, children: ["index.ts"] },
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
		root: { slug: "root", name: ".", closed: true },
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

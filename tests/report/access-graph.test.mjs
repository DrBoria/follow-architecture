import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect } from "vitest";
const { buildAccessGraph } = require("../../report/user-report/data/graph");

// The access graph is folder → folder, in the config's own action names. It is
// derived from `codeRole.actions.<kind>.where`, so nothing here knows what
// `import` or `call` mean — the YAML does.

const node = (slug, path, fileCount = 1) => ({ slug, name: path.split("/").pop(), paths: [path], fileCount, parents: [] });

const nodes = [
	node("feature", "apps/backend/{kebab-case}"),
	node("actions", "apps/backend/{kebab-case}/actions"),
	node("store", "apps/backend/{kebab-case}/store.ts"),
	node("type", "apps/backend/{kebab-case}/type.ts"),
	node("root-store", "apps/backend/store.ts"),
	node("test", "apps/backend/test"),
];

const where = (...entries) => ({ type: "x", where: entries.map((e) => ({ ...e })) });
const roleWhere = (nodeSlug) => ({ type: "node", node: nodeSlug });

// Where a role lives is the TREE's business: a node child declares `role:`. The
// fixtures state the homes once, in `homes`, and derive the same index the
// engine builds — a role itself carries no location.
const treeOf = (homes, nodeList) => ({
	roleHomes: Object.fromEntries(
		Object.entries(homes).map(([role, slugs]) => [
			role,
			slugs.map((slug) => {
				const path = nodeList.find((n) => n.slug === slug).paths[0];
				return { template: /\.[A-Za-z0-9]+$/.test(path) ? path : `${path}/**`, node: slug };
			}),
		]),
	),
});

const arch = {
	nodes: treeOf({ storeModel: ["store", "root-store"], action: ["actions"] }, nodes),
	codeRoles: {
		storeModel: {
			actions: {
				import: where({ type: "role", role: "storeModel" }, { type: "role", role: "action", same: true }, roleWhere("test")),
			},
		},
		action: {
			actions: {
				call: where({ type: "role", role: "action" }, { type: "role", role: "storeModel" }),
				mutate: where({ type: "role", role: "action" }),
			},
		},
	},
};

describe("buildAccessGraph", () => {
	const graph = buildAccessGraph({ arch, nodes, findings: [] });

	it("lists the whole relation vocabulary, then any name the config invented", () => {
		// A button per relation the engine can see: a kind no role mentions still
		// gets one, because "no rule" is a fact about the architecture (nobody may
		// do it), not a gap in the picture.
		expect(graph.kinds).toEqual(["import", "export", "declare", "call", "mutate", "assign", "read", "typeImport"]);
	});

	it("draws folder → folder arrows for role entries, pointing at the code that imports", () => {
		const imports = graph.edges.filter((e) => e.kind === "import").map((e) => `${e.fromPath}->${e.toPath}`);
		expect(imports).toContain("apps/backend/{kebab-case}/store.ts->apps/backend/{kebab-case}/actions");
	});

	it("keeps `same: true` inside the instance that repeats, and allows the single one", () => {
		// `same` constrains a node that CAN repeat: a feature's actions may import
		// their own feature's store. The root store is declared once, so there is
		// nothing to be "the same instance" of — any action may import it.
		const same = graph.edges.filter((e) => e.same).map((e) => `${e.from}->${e.to}`).sort();
		expect(same).toEqual(["root-store->actions", "store->actions"]);
	});

	it("draws a node entry as one importing folder, without `same` filtering", () => {
		const intoTest = graph.edges.filter((e) => e.to === "test").map((e) => e.from).sort();
		expect(intoTest).toEqual(["root-store", "store"]);
	});

	it("indexes both directions per node, as plain JSON (no Map)", () => {
		// The payload is inlined into the HTML through JSON, where a Map would
		// serialize to `{}` and the UI would lose the adjacency.
		const store = graph.byNode.store;
		expect(store.in.length).toBeGreaterThan(0);
		expect(store.out.length).toBeGreaterThan(0);
		expect(JSON.parse(JSON.stringify(graph)).byNode.store.in.length).toBe(store.in.length);
	});

	it("reports a rule it cannot place instead of inventing a folder", () => {
		const withGlob = buildAccessGraph({
			arch: {
				nodes: treeOf({ x: ["store"] }, nodes),
				codeRoles: { x: { actions: { import: where({ type: "glob", glob: "src/**" }) } } },
			},
			nodes,
			findings: [],
		});
		expect(withGlob.edges).toEqual([]);
		expect(withGlob.unplaceable).toHaveLength(1);
	});

	it("marks a finding that crossed a boundary as a violation between the two folders", () => {
		const findings = [{ violation: { kind: "import", targetNode: "store" }, ownerNode: "feature", file: "a.ts", line: 3, title: "nope" }];
		const g = buildAccessGraph({ arch, nodes, findings });
		expect(g.violations).toHaveLength(1);
		expect(g.violations[0]).toMatchObject({ kind: "import", from: "feature", to: "store", file: "a.ts" });
	});
});

describe("arrow direction and cycles", () => {
	const node = (slug, path) => ({ slug, name: path.split("/").pop(), paths: [path], fileCount: 1, parents: [] });
	const nodes2 = [node("root", "apps/backend/store.ts"), node("store", "apps/backend/{kebab-case}/store.ts"), node("actions", "apps/backend/{kebab-case}/actions")];
	const arch2 = {
		nodes: treeOf({ store: ["store", "root"], actions: ["actions"] }, nodes2),
		codeRoles: {
			store: {
				// "a store may import a store" — textually both directions
				actions: { import: where({ type: "role", role: "store" }) },
			},
			actions: { actions: { import: where(roleWhere("store")) } },
		},
	};

	it("draws a mirrored rule pair once, pointing into the container", () => {
		const g = buildAccessGraph({ arch: arch2, nodes: nodes2, findings: [] });
		const pairs = g.edges.map((e) => `${e.from}->${e.to}`);
		// "a store model may import a store model" holds both ways; drawn once,
		// the child points at the main store, never the other way round
		expect(pairs).toContain("store->root");
		expect(pairs).not.toContain("root->store");
	});

	it("points the `call` arrow at the code that uses the store", () => {
		const nodes3 = [node("store", "apps/{kebab-case}/store.ts"), node("controller", "apps/{kebab-case}/controller.ts")];
		const arch = {
			nodes: treeOf({ store: ["store"], orchestrator: ["controller"] }, nodes3),
			codeRoles: {
				store: { actions: { call: where({ type: "role", role: "orchestrator" }) } },
				orchestrator: {},
			},
		};
		const g = buildAccessGraph({ arch, nodes: nodes3, findings: [] });
		const call = g.edges.find((e) => e.kind === "call");
		// the store is what gets used, so the arrow leaves it and lands on the user
		expect(call.from).toBe("store");
		expect(call.to).toBe("controller");
		expect(call.actor).toBe("controller");
	});

	it("attributes an edge to the role that owns the folder it leaves", () => {
		const g = buildAccessGraph({ arch: arch2, nodes: nodes2, findings: [] });
		const fromActions = g.edges.find((e) => e.from === "actions");
		expect(fromActions.fromRoles).toEqual(["actions"]);
	});
});

describe("one line per action", () => {
	it("keeps `import` and `mutate` as separate edges — they are different facts", () => {
		const a = { slug: "store", name: "store.ts", paths: ["src/store.ts"], fileCount: 1, parents: [] };
		const b = { slug: "actions", name: "actions", paths: ["src/actions"], fileCount: 1, parents: [] };
		const arch = {
			nodes: treeOf({ store: ["store"], actions: ["actions"] }, [a, b]),
			codeRoles: {
				store: {
					actions: {
						import: where({ type: "role", role: "actions" }),
						mutate: where({ type: "role", role: "actions" }),
					},
				},
				actions: {},
			},
		};
		const g = buildAccessGraph({ arch, nodes: [a, b], findings: [] });
		const between = g.edges.filter((e) => (e.from === "store" && e.to === "actions") || (e.from === "actions" && e.to === "store"));
		// One arrow per action: a merged line would claim one rule where there are
		// two, and only `call` carries `scopeAccess`, so the label must not mix.
		expect(between.map((e) => e.kind).sort()).toEqual(["import", "mutate"]);
		expect(between.every((e) => e.kinds.length === 1)).toBe(true);
	});
});

describe("`same: true` — the store that repeats and the store that does not", () => {
	// "the same instance" is only a constraint when the target CAN repeat. The
	// root store exists once, so any action or controller may import it — that is
	// the whole point of `getRoot`. A feature store repeats, so only its own
	// feature may import it.
	const n = (slug, path) => ({ slug, name: path.split("/").pop(), paths: [path], fileCount: 1, parents: [] });
	const nodes = [
		n("root-store", "apps/backend/store.ts"),
		n("store", "apps/backend/{kebab-case}/store.ts"),
		n("actions", "apps/backend/{kebab-case}/actions"),
		n("controller", "apps/backend/{kebab-case}/controller.ts"),
	];
	const arch = {
		nodes: treeOf({ storeModel: ["store", "root-store"], action: ["actions"], orchestrator: ["controller"] }, nodes),
		codeRoles: {
			storeModel: {
				actions: {
					import: where({ type: "role", role: "storeModel" }, { type: "role", role: "action", same: true }, { type: "role", role: "orchestrator", same: true }),
				},
			},
			action: {},
			orchestrator: {},
		},
	};

	// Arrows point from the imported code INTO the code that imports it, so the
	// store is the source of every edge here.
	it("lets an action and a controller import the single root store", () => {
		const g = buildAccessGraph({ arch, nodes, findings: [] });
		const outOfRoot = g.edges.filter((e) => e.from === "root-store" && e.to !== "root-store").map((e) => e.to).sort();
		expect(outOfRoot).toEqual(["actions", "controller"]);
	});

	it("keeps a feature store to its own feature", () => {
		const g = buildAccessGraph({ arch, nodes, findings: [] });
		const outOfStore = g.edges.filter((e) => e.from === "store" && e.to !== "store").map((e) => e.to).sort();
		// actions and controller of the SAME feature (same: true), plus the store
		// rule "a store model may import a store model" — which names no instance.
		expect(outOfStore).toEqual(["actions", "controller", "root-store"]);
	});
});

describe("`via: import` — how the code is reached", () => {
	const n = (slug, path) => ({ slug, name: path.split("/").pop(), paths: [path], fileCount: 1, parents: [] });
	const nodes = [n("store", "src/{kebab-case}/store.ts"), n("actions", "src/{kebab-case}/actions"), n("controller", "src/{kebab-case}/controller.ts")];
	const arch = {
		nodes: treeOf({ storeModel: ["store"], action: ["actions"], orchestrator: ["controller"] }, nodes),
		codeRoles: {
			storeModel: {
				actions: {
					call: {
						// the action walks the tree, the controller holds the store from an import
						where: [{ type: "role", role: "action", same: true }, { type: "role", role: "orchestrator", same: true, via: "import" }],
						scopeAccess: [{ scope: "function", segments: ["getRoot"] }],
					},
				},
			},
			action: {},
			orchestrator: {},
		},
	};

	it("shows the tree chains only where the code is reached through the tree", () => {
		const g = buildAccessGraph({ arch, nodes, findings: [] });
		const toActions = g.edges.find((e) => e.to === "actions");
		const toController = g.edges.find((e) => e.to === "controller");
		expect(toActions.scope).toEqual(["getRoot(…)"]);
		// A controller imports the store — claiming `getRoot` there would be a lie.
		expect(toController.scope).toEqual([]);
	});
});

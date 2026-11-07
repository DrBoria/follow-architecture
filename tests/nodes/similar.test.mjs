import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const { buildArchitecture } = require("../../main");
const { similarNodes } = require("../../nodes/similar");
const { createTsProject } = require("../../entities/ast");

// Similarity is measured in ROLES, never in file names: two folders holding the
// same kind of code score the same whatever the files are called. A folder can
// resemble TWO entities at once — then both are offered ("here or here"). And an
// entity that explains only a corner of the folder is not offered at all: a
// feature's `actions/` folder holds `action` and `orchestrator` code, which are
// exactly the two roles a `commands` folder declares, so without that guard
// every feature offered "move it to `commands`".

const STORE = `
	import { types as t } from "mobx-state-tree";
	export const LoggerModel = t.model("Logger", { level: t.optional(t.string, "info") });
`;
const ACTION = `
	export const appendLine = (state, line: string): void => { state.lines.push(line); };
`;
const TYPE = `export type LogLevel = "info" | "warn" | "error";`;
const METHOD = `export const controller = { refresh(): void {} };`;
const FN = `export function helper(): void {}`;

const FILES = {
	// a folder that is NOT at any declared path: 3 of the 4 roles of a feature
	"src/logger/a.ts": STORE,
	"src/logger/actions/first.ts": ACTION,
	"src/logger/actions/second.ts": ACTION,
	"src/logger/b.ts": TYPE,
	// the same code at the path a feature already occupies — that folder IS the
	// feature, so no lookalike may be offered for it at all
	"apps/backend/logging/a.ts": STORE,
	"apps/backend/logging/actions/first.ts": ACTION,
	"apps/backend/logging/b.ts": TYPE,
	// store + type + controller + one more kind of code: the store home declares
	// two roles and this folder holds four, so it explains only half of it
	"src/mixed/s.ts": STORE,
	"src/mixed/t.ts": TYPE,
	"src/mixed/c.ts": METHOD,
	"src/mixed/f.ts": FN,
	// a folder of code no declared entity is made of
	"src/helpers/one.ts": `export const twice = (n: number): number => n * 2;`,
};

const ROLES = [
	{ slug: "storeModel", infer: [{ kind: { own: { is: { equals: "VariableDeclaration" } } } }] },
	{ slug: "action", infer: [{ assignments: { any: { param: { equals: true } } } }] },
	{ slug: "sharedTypes", infer: [{ kind: { own: { is: { equals: "TypeAliasDeclaration" } } } }] },
	{ slug: "orchestrator", infer: [{ kind: { own: { is: { equals: "MethodDeclaration" } } } }] },
	{ slug: "fn", infer: [{ kind: { own: { is: { equals: "FunctionDeclaration" } } } }] },
];

// A feature (storeModel + action + sharedTypes + orchestrator) and a store home
// (storeModel + sharedTypes) — two shapes, one of them much thinner.
const NODES = {
	backend: { slug: "backend", name: "apps/backend", children: ["{kebab-case}"] },
	feature: {
		slug: "feature",
		name: "{kebab-case}",
		parent: "backend",
		children: [{ node: "feature-store" }, { node: "feature-actions" }, { node: "feature-type" }, { node: "feature-controller" }],
	},
	"feature-store": { slug: "feature-store", name: "store.ts", parent: "feature", role: "storeModel" },
	"feature-actions": { slug: "feature-actions", name: "actions", parent: "feature", role: "action", children: ["{kebab-case}.ts"] },
	"feature-type": { slug: "feature-type", name: "type.ts", parent: "feature", role: "sharedTypes" },
	"feature-controller": { slug: "feature-controller", name: "controller.ts", parent: "feature", role: "orchestrator" },
	"packages-store": {
		slug: "packages-store",
		name: "packages/store",
		children: [{ node: "packages-store-model" }, { node: "packages-store-type" }],
	},
	"packages-store-model": { slug: "packages-store-model", name: "store.ts", parent: "packages-store", role: "storeModel" },
	"packages-store-type": { slug: "packages-store-type", name: "type.ts", parent: "packages-store", role: "sharedTypes" },
};

describe("similarity: a folder is judged by the ROLES its code has", () => {
	let root;
	let arch;
	let ctx;

	beforeAll(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-similar-"));
		for (const [rel, text] of Object.entries(FILES)) {
			const abs = path.join(root, rel);
			fs.mkdirSync(path.dirname(abs), { recursive: true });
			fs.writeFileSync(abs, text);
		}
		arch = buildArchitecture({ nodes: NODES, codeRoles: ROLES });
		arch.repoRoot = root;
		const repoFiles = Object.keys(FILES);
		ctx = { project: createTsProject({ repoRoot: root, files: repoFiles.map((f) => path.join(root, f)) }), repoRoot: root, repoFiles, cache: { files: new Map() } };
	});

	afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

	it("scores by roles, not by names: files called a.ts/b.ts still look like a feature", () => {
		const hits = similarNodes(arch, "src/logger", ctx, 0.6);
		const feature = hits.find((h) => h.slug === "feature");

		// storeModel + action + sharedTypes found, orchestrator missing → 3 of 4
		expect(feature).toMatchObject({ hit: 3, total: 4 });
		expect(feature.path).toBe("apps/backend/{kebab-case}");
	});

	it("offers BOTH shapes when the folder fits both — the finding says `or`", () => {
		const hits = similarNodes(arch, "src/logger", ctx, 0.6);

		// best score first: the thin store home is 2 of 2, the feature 3 of 4
		expect(hits.map((h) => `${h.path} (${h.hit}/${h.total})`)).toEqual(["packages/store (2/2)", "apps/backend/{kebab-case} (3/4)"]);
	});

	it("offers nothing for a folder the architecture already declares", () => {
		// it IS the feature: no entity may be offered as a destination for it, and
		// its own code gets its own findings instead of "move it elsewhere"
		expect(similarNodes(arch, "apps/backend/logging", ctx, 0.6)).toEqual([]);
	});

	it("does not offer an entity that explains only a corner of the folder", () => {
		const hits = similarNodes(arch, "src/mixed", ctx, 0.6).map((h) => h.slug);

		// 3 of the feature's 4 roles, but only 2 of the 4 roles this folder holds
		expect(hits).toEqual(["feature"]);
	});

	it("says nothing about a folder whose roles match no declared shape", () => {
		expect(similarNodes(arch, "src/helpers", ctx, 0.6)).toEqual([]);
	});

	it("the threshold is the rule option, default 60%", () => {
		expect(similarNodes(arch, "src/logger", ctx, 0.8)).toEqual([]);
		expect(arch.similarity).toBeUndefined(); // default applies: 0.6
	});
});

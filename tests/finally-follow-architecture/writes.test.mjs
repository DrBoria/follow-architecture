import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// What a finding SAYS, not only what the facts contain. Three sentences matter:
//   1. code that changes state it may not change is MOVED, not deleted — and the
//      owner is named by its role (`the \`storeModel\``), not by a file path;
//   2. a helper outside its home names that home (`packages/utils`);
//   3. a role whose home is a TEMPLATE names the template — for an entity that is
//      not a feature, the sentence must not say "feature".
// The wording is built from the tree (`placeFor`, the owner node's role), so
// these hold for any architecture, not just the one in md-prettify.

let root;

const write = (rel, text) => {
	const abs = path.join(root, rel);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, text);
};

const run = (args) => {
	let printed = "";
	const orig = console.log;
	console.log = (s) => {
		printed += `${s}\n`;
	};
	let code = 0;
	const prevCwd = process.cwd();
	process.chdir(root);
	try {
		code = main(["--config", path.join(root, "architecture.json"), "--check", ...args]);
	} finally {
		process.chdir(prevCwd);
		console.log = orig;
	}

	return { code, printed };
};

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-writes-"));
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("a write into state the architecture does not let this code change", () => {
	const ARCH = {
		nodes: [
			{ slug: "src", name: "src", children: [{ node: "store" }, "app.ts"] },
			{ slug: "store", name: "store.ts", parent: "src", role: "storeModel" },
		],
		codeRoles: [
			{ slug: "storeModel", infer: [{ calls: { any: { action: { equals: "model" } } } }], actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } } },
			{
				// An action: a function that writes into a store.
				slug: "action",
				infer: [{ assignments: { any: { module: { location: { role: "storeModel" } } } } }],
				actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } },
			},
		],
	};

	beforeAll(() => {
		fs.writeFileSync(path.join(root, "architecture.json"), JSON.stringify(ARCH));
		write(
			"src/store.ts",
			`export type Store = { channel?: { appendLine(line: string): void } };
export const StoreModel = t.model("Store", { channel: t.maybe(t.string) });
const ref = { current: undefined as Store | undefined };
export const getRootStore = (): Store | undefined => ref.current;
`,
		);
		write(
			"src/app.ts",
			`import { types as t } from "mobx-state-tree";
import { getRootStore } from "./store";
export const logInfo = (m: string): void => { getRootStore()?.channel?.appendLine(m); };
export const logWarn = (m: string): void => { getRootStore()?.channel?.appendLine(m); };
`,
		);
	});

	it("names the owner by its role, and every piece that does it", () => {
		const { code, printed } = run(["--files", "src/app.ts"]);

		expect(code).toBe(1);
		// both pieces, one sentence — no name is dropped
		expect(printed).toContain("`logInfo`, `logWarn`");
		expect(printed).toContain("change `getRootStore()?.channel`");
		// the owner is the store, said as a role
		expect(printed).toContain("of the `storeModel` (`src/store.ts`)");
	});

	it("repairs by moving the code, never by deleting it", () => {
		const { printed } = run(["--files", "src/app.ts"]);
		// the paragraph about THIS write, not the whole report: other findings in the
		// same file may legitimately still be prohibitions
		const write = printed.split("---").find((part) => part.includes("change `getRootStore()?.channel`")) ?? "";

		expect(write).toContain("Move them");
		expect(write).not.toContain("Delete");
	});
});

describe("a helper outside its home", () => {
	beforeAll(() => {
		const ARCH = {
			nodes: [
				{ slug: "src", name: "src", children: ["**/*.ts"] },
				{ slug: "utils", name: "packages/utils", role: "pureFunction" },
			],
			codeRoles: [
				{
					slug: "pureFunction",
					infer: [{ kind: { own: { is: { equals: "ArrowFunction" } } } }, { returns: { any: { exprKind: { isSet: true } } } }],
				},
			],
		};
		fs.rmSync(root, { recursive: true, force: true });
		fs.mkdirSync(root, { recursive: true });
		fs.writeFileSync(path.join(root, "architecture.json"), JSON.stringify(ARCH));
		write("src/app.ts", "export const twice = (n: number): number => n * 2;\n");
	});

	it("names `packages/utils`, and says nothing about a feature", () => {
		const { printed } = run(["--files", "src/app.ts"]);

		expect(printed).toContain("packages/utils");
		expect(printed).not.toContain("feature");
	});
});

describe("a role whose home is a TEMPLATE of a non-feature entity", () => {
	beforeAll(() => {
		const ARCH = {
			nodes: [
				{ slug: "src", name: "src", children: ["**/*.ts"] },
				// a home that names a PLACEHOLDER in a folder the tree does not
				// declare: nothing can be hosted there, so the template stays a template
				{ slug: "views", name: "src/views/{kebab-case}.ts", role: "viewModel" },
			],
			codeRoles: [
				{
					slug: "viewModel",
					infer: [{ kind: { own: { is: { equals: "ArrowFunction" } } } }, { returns: { any: { exprKind: { isSet: true } } } }],
				},
			],
		};
		fs.rmSync(root, { recursive: true, force: true });
		fs.mkdirSync(root, { recursive: true });
		fs.writeFileSync(path.join(root, "architecture.json"), JSON.stringify(ARCH));
		write("src/stray.ts", "export const read = (s: { a: number }): number => s.a;\n");
	});

	it("names the template as spelled, and does not call it a feature", () => {
		const { printed } = run(["--files", "src/stray.ts"]);

		expect(printed).toContain("src/views/{kebab-case}.ts");
		// the template is named as spelled, and the sentence stays generic: the same
		// home shape serves a feature's `actions/`, a config file, a command file
		expect(printed).not.toContain("feature");
	});
});

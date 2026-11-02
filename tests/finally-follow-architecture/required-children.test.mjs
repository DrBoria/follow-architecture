import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// A node may declare `required: true` on the children that MAKE it. A folder
// matched by the node's template but lacking them is not that node — it is not
// part of the architecture at all. Nothing project-specific: the same rule
// works for any node shape (features, packages, layers).
const ARCH = JSON.stringify({
	nodes: [
		{ slug: "src", name: "src", children: ["{kebab-case}", "**/*.ts"] },
		{
			slug: "feature",
			name: "{kebab-case}",
			parent: "src",
			children: [
				{ name: "store.ts", required: true },
				{ name: "actions", required: true },
				"**/*.ts",
			],
		},
	],
	codeRoles: [],
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-required-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	// a real feature: its store + its actions folder
	fs.mkdirSync(path.join(root, "src", "alpha", "actions"), { recursive: true });
	fs.writeFileSync(path.join(root, "src", "alpha", "store.ts"), "export const n = 1;\n");
	fs.writeFileSync(path.join(root, "src", "alpha", "actions", "go.ts"), "export const go = 1;\n");
	// a folder that only LOOKS like one feature-shaped folder
	fs.mkdirSync(path.join(root, "src", "stray"), { recursive: true });
	fs.writeFileSync(path.join(root, "src", "stray", "one.ts"), "export const a = 1;\n");
	fs.writeFileSync(path.join(root, "src", "stray", "two.ts"), "export const b = 1;\n");
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

const run = (argv) => {
	let printed = "";
	const orig = console.log;
	console.log = (s) => {
		printed += `${s}\n`;
	};
	let code = 0;
	const prevCwd = process.cwd();
	process.chdir(root);
	try {
		code = main(argv);
	} finally {
		process.chdir(prevCwd);
		console.log = orig;
	}
	return { code, printed };
};

describe("required children", () => {
	it("reports a folder that is missing what makes it that node", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/stray/one.ts", "--files", "src/stray/two.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("`src/stray` is not a `feature`");
		expect(printed).toContain("`store.ts`");
	});

	it("reports each missing child, but each folder only once", () => {
		const { printed } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/stray/one.ts", "--files", "src/stray/two.ts"]);
		// two files, two missing children -> two findings, not four
		const hits = printed.match(/is not a `feature`/g) ?? [];
		expect(hits).toHaveLength(2);
		expect(printed).toContain("`actions`");
	});

	it("stays silent about the required children of a folder that has them", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/alpha/store.ts", "--files", "src/alpha/actions/go.ts"]);
		expect(printed).not.toContain("is not a");
	});
});

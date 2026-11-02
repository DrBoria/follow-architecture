import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// A role (`action`) whose home node has SEVERAL PARENTS: `actions` lives
// under both `alpha` and `beta`, giving it two concrete path variants
// (`src/alpha/actions`, `src/beta/actions`). Regression: the home check used
// the node's canonical (first-variant) path, so an action in
// `src/beta/store.ts` was told to move to `src/alpha/actions`, and an action
// correctly living in `src/beta/actions` was flagged as a misfit.
const ARCH = JSON.stringify({
	nodes: [
		{ slug: "src", name: "src", children: ["alpha", "beta", "**/*.ts"] },
		{ slug: "alpha", name: "alpha", parent: "src", children: ["store.ts", "actions", "**/*.ts"] },
		{ slug: "beta", name: "beta", parent: "src", children: ["store.ts", "actions", "**/*.ts"] },
		{
			slug: "actions",
			role: "action",
			name: "actions",
			parent: ["alpha", "beta"],
			children: ["**/*.ts"],

		},
	],
	codeRoles: [
		{
			slug: "action",
			// Identity: it writes into the model it was handed — that is what an MST
			// action IS, and the write is visible as one `assignments` fact.
			infer: [{ assignments: { length: { gt: 0 } } }],
			// An action writes into the model it was handed, so it must be allowed to
			// assign: the relation is closed like every other one.
			actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] }, assign: { where: ["**/*.ts"] } },
			// `in` names the multi-parent node: every branch is a home.
		},
		// The model the actions hang off: a declaration of its own, and it has to be
		// described too — a declaration is a relation like any other.
		{ slug: "model", infer: [{ name: { equals: "M" } }], actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } } },
	],
	invariants: [],
});

// MST-style model: every `.actions((self) => ({ ... }))` member is an `action`.
const MODEL = `export const M = t.model("M", { x: 0 }).actions((self) => ({
	doIt() { self.x = 1; },
}));
`;

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-home-mp-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	for (const f of ["alpha", "beta"]) {
		fs.mkdirSync(path.join(root, "src", f, "actions"), { recursive: true });
		fs.writeFileSync(path.join(root, "src", f, "store.ts"), MODEL);
		fs.writeFileSync(path.join(root, "src", f, "actions", "it.ts"), MODEL);
	}
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

const runFile = (file) => run(["--config", path.join(root, "architecture.json"), "--check", "--files", file]);

describe("role home with a multi-parent home node", () => {
	it("points an action at ITS OWN feature's actions folder, not the first variant", () => {
		const { printed, code } = runFile("src/beta/store.ts");
		expect(code).toBe(1);
		expect(printed).toContain("belongs in `src/beta/actions`");
		expect(printed).not.toContain("src/alpha/actions");
	});

	it("same for the first parent's own file", () => {
		const { printed, code } = runFile("src/alpha/store.ts");
		expect(code).toBe(1);
		expect(printed).toContain("belongs in `src/alpha/actions`");
	});

	it("an action living in any feature's actions folder is a fit, not a misfit", () => {
		for (const f of ["alpha", "beta"]) {
			const { printed, code } = runFile(`src/${f}/actions/it.ts`);
			expect(code).toBe(0);
			expect(printed).not.toContain("belong in");
		}
	});
});

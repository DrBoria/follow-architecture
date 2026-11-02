import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// Actions live ON THE ROLE: `import: { from: [...] }` on a codeRole means
// "code of this role may only be imported by those roles". No paths in the
// rule — moving a folder never touches it.
//
// The fixture is deliberately non-store, non-mobx: a `handler` role imported
// only by a `registry`, and called only by an `event` or a `controller`.
const ARCH = JSON.stringify({
	nodes: [
		{ slug: "src", name: "src", children: ["{kebab-case}", "**/*.ts"] },
		{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["handlers", "registry.ts", "controller.ts", "events", "**/*.ts"] },
		{ slug: "handlers",
		role: "handler", name: "handlers", parent: "feature", children: ["**/*.ts"] },
		{ slug: "events", name: "events", parent: "feature", children: ["**/*.ts"] },
	],
	codeRoles: [
		{
			slug: "handler",
			// Identity: a function that mutates state (shape, not location).
			infer: [{ assignments: { any: { param: { equals: true } } } }],
			actions: {
				declare: { where: ["**/*.ts"] },
				export: { where: ["**/*.ts"] },
				import: { where: ["registry"] },
				call: { where: ["event", "controller"] },
				mutate: { where: ["handler"] },
			},
			report: { message: "handler `{what}` is outside its handlers folder" },
		},
		{ slug: "registry", infer: [{ name: { startsWith: "createRegistry" } }], actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } } },
		{ slug: "event", infer: [{ location: { node: "events" } }], actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } } },
		{ slug: "controller", infer: [{ location: { node: "feature" } }], actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } } },
	],
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-role-actions-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "src", "alpha", "handlers"), { recursive: true });
	fs.mkdirSync(path.join(root, "src", "alpha", "events"), { recursive: true });

	// the handler, and its legitimate importer
	fs.writeFileSync(path.join(root, "src", "alpha", "handlers", "reveal.ts"), "export const reveal = (state) => { state.x = 1; };\n");
	fs.writeFileSync(path.join(root, "src", "alpha", "registry.ts"), "export const createRegistry = () => 1;\n");
	// allowed: the registry imports the handler
	fs.writeFileSync(path.join(root, "src", "alpha", "ok-registry.ts"), 'import { reveal } from "./handlers/reveal";\nexport const createRegistry = () => reveal;\n');
	// forbidden: an event imports the handler directly
	fs.writeFileSync(path.join(root, "src", "alpha", "events", "bad.ts"), 'import { reveal } from "../handlers/reveal";\nexport const fire = () => reveal;\n');
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

const run = (files) => {
	let printed = "";
	const orig = console.log;
	console.log = (s) => {
		printed += `${s}\n`;
	};
	let code = 0;
	const prevCwd = process.cwd();
	process.chdir(root);
	try {
		code = main(["--config", path.join(root, "architecture.json"), "--check", ...files.flatMap((f) => ["--files", f])]);
	} finally {
		process.chdir(prevCwd);
		console.log = orig;
	}
	return { code, printed };
};

describe("role actions", () => {
	it("allows an importer named by the role's `import.from`", () => {
		const { code, printed } = run(["src/alpha/ok-registry.ts"]);
		expect(code).toBe(0);
	});

	it("forbids an importer the role did not name — without any path in the rule", () => {
		const { code, printed } = run(["src/alpha/events/bad.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("but only `registry` may do it");
		expect(printed).toContain("`handler`");
	});

	it("reports a handler declared outside its `where` home", () => {
		fs.writeFileSync(path.join(root, "src", "alpha", "stray.ts"), "export const stray = (s) => { s.y = 1; };\n");
		const { printed } = run(["src/alpha/stray.ts"]);
		expect(printed).toContain("outside its handlers folder");
	});
});

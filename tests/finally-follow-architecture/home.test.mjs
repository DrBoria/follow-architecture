import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// A role (`probe`) whose home is the feature subfolder `src/{kebab-case}/actions`.
// The built-in role-home check must flag a probe candidate that sits in a feature
// folder but NOT in its `actions/` subfolder, and stay silent inside the home
// folder or in a file that is not inside any feature folder instance.
const ARCH = JSON.stringify({
	nodes: [
		{ slug: "src", name: "src", children: ["{kebab-case}", "**/*.ts"] },
		{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["actions", "**/*.ts"] },
		{
			slug: "actions",
			name: "actions",
			parent: "feature",
			children: ["**/*.ts"],
			location: { declaration: ["probe"] },
		},
	],
	codeRoles: [
		{
			slug: "probe",
			infer: [{ kind: { equals: "ArrowFunction" } }],
		},
	],
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-home-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "src", "alpha", "actions"), { recursive: true });
	fs.mkdirSync(path.join(root, "src", "beta"), { recursive: true });
	// outside the home folder, inside a feature folder -> flagged
	fs.writeFileSync(path.join(root, "src", "alpha", "store.ts"), "export const go = () => 1;\n");
	// inside the home folder -> not flagged
	fs.writeFileSync(path.join(root, "src", "alpha", "actions", "go.ts"), "export const go = () => 1;\n");
	// a sibling feature folder with no actions/ -> not flagged (nothing to check)
	fs.writeFileSync(path.join(root, "src", "beta", "model.ts"), "export const n = 1;\n");
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

const findings = (printed) => {
	const m = printed.match(/(\d+) architecture finding/);
	return m ? Number(m[1]) : 0;
};

describe("role home check", () => {
	it("flags a role candidate sitting in a feature folder but outside its home subfolder", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/alpha/store.ts"]);
		expect(code).toBe(1);
		// the concrete resolved home folder is in the message
		expect(printed).toContain("belong in `src/alpha/actions`");
		// the candidate is named
		expect(printed).toContain("A `probe` (go)");
	});

	it("does not flag a role candidate inside its home folder", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/alpha/actions/go.ts"]);
		expect(code).toBe(0);
		expect(printed).not.toContain("belong in");
	});

	it("does not flag a file that is not inside any feature folder instance", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/beta/model.ts"]);
		expect(code).toBe(0);
		expect(printed).not.toContain("belong in");
	});
});


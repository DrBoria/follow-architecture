import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");
const { normalizeCodeRoles } = require("../../code-roles/roles");

// A role with `except` globs: files matching any of them are exempt from the
// role's checks (assert + report). Same pattern language as invariant `except`.
const ARCH = JSON.stringify({
	nodes: {
		// `kind: []` excludes the probe role, so a classified candidate in
		// this node is a misfit and its top-level report fires.
		src: { slug: "src", name: "src", kind: [], children: ["**"] },
		packages: { slug: "packages", name: "packages", kind: [], children: ["**"] },
	},
	codeRoles: [
		{
			slug: "probe",
			infer: [{ kind: { equals: "ArrowFunction" } }],
			except: ["**/*.test.ts", "packages/*"],
			report: { message: "probe hit: {what}" },
		},
	],
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-roles-except-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "src"), { recursive: true });
	fs.mkdirSync(path.join(root, "packages", "ext"), { recursive: true });
	fs.writeFileSync(path.join(root, "src", "hit.ts"), "export const go = () => 1;\n");
	fs.writeFileSync(path.join(root, "src", "hit.test.ts"), "export const mock = () => 2;\n");
	fs.writeFileSync(path.join(root, "packages", "ext", "bridge.ts"), "export const bridge = () => 3;\n");
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

describe("codeRole except globs", () => {
	it("compiles except globs to regexes in normalizeCodeRoles", () => {
		const roles = normalizeCodeRoles([{ slug: "probe", infer: [], except: ["**/*.test.ts"] }]);
		expect(roles.probe.except).toHaveLength(1);
		expect(roles.probe.except[0].re.test("apps/backend/test/x.test.ts")).toBe(true);
		expect(roles.probe.except[0].re.test("apps/backend/document/model.ts")).toBe(false);
	});

	it("accepts the YAML list shape: entries keyed by slug, order preserved", () => {
		const roles = normalizeCodeRoles([
			{ slug: "storeModel", name: "store model", infer: [{ kind: { equals: "VariableDeclaration" } }] },
			{ slug: "action", name: "action", infer: [{ calledBy: { equals: "actions" } }], except: ["**/test/**"] },
		]);
		expect(Object.keys(roles)).toEqual(["storeModel", "action"]);
		expect(roles.storeModel.infer).toEqual([{ kind: { equals: "VariableDeclaration" } }]);
		expect(roles.action.except).toHaveLength(1);
	});

	it("exempts files matching any except glob from the role's report", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/hit.ts", "src/hit.test.ts", "packages/ext/bridge.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("probe hit: go");
		expect(printed).not.toContain("probe hit: mock");
		expect(printed).not.toContain("probe hit: bridge");
	});
});

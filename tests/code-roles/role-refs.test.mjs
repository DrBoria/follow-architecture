import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");
const { normalizeCodeRoles } = require("../../code-roles/roles");

// Roles compose by NAMING each other in `infer` — no `extend` keyword, no
// second definition list. A role's `in` may name several homes, so a design
// that allows the same kind of code in two places states it once.
const ARCH = JSON.stringify({
	nodes: {
		src: { slug: "src", name: "src", children: ["**"] },
		probes: { slug: "probes",
		role: "probe", name: "probes", parent: "src", children: ["**"] },
		helpers: { slug: "helpers",
		role: "probe", name: "helpers", parent: "src", children: ["**"] },
	},
	codeRoles: [
		{
			slug: "probe",
			infer: [{ kind: { own: { is: { equals: "ArrowFunction" } } } }],
			report: { message: "probe hit: {what}" },
		},
		{ slug: "spy", name: "spy", infer: ["probe", { name: { startsWith: "spy" } }] },
	],
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-role-refs-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	for (const dir of ["src", "src/probes", "src/helpers"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
	fs.writeFileSync(path.join(root, "src", "hit.ts"), "export const go = () => 1;\n");
	fs.writeFileSync(path.join(root, "src", "probes", "ok.ts"), "export const fine = () => 2;\n");
	fs.writeFileSync(path.join(root, "src", "helpers", "also-ok.ts"), "export const fine2 = () => 3;\n");
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

describe("codeRole composition", () => {
	it("normalizes a bare string in `infer` into a role reference", () => {
		const roles = normalizeCodeRoles([{ slug: "base", infer: [] }, { slug: "narrow", infer: ["base", { lines: { gt: 3 } }] }]);
		expect(roles.narrow.infer).toEqual([{ role: { equals: "base" } }, { lines: { gt: 3 } }]);
	});

	it("rejects a reference to a role that does not exist", () => {
		expect(() => normalizeCodeRoles([{ slug: "a", infer: ["nope"] }])).toThrow(/unknown role `nope`/);
	});

	it("rejects an action without a where (no silent typos)", () => {
		expect(() => normalizeCodeRoles([{ slug: "a", actions: { bogus: 1 } }])).toThrow(/must be an object with `where`/);
		expect(() => normalizeCodeRoles([{ slug: "a", actions: { import: {} } }])).toThrow(/has no `where`/);
	});

	it("rejects an action that names a fact class the engine cannot see", () => {
		expect(() => normalizeCodeRoles([{ slug: "a", actions: { emit: { where: ["a"], of: "broadcast" } } }])).toThrow(/the fact layer produces import \| export \| declare \| call \| mutate \| assign \| read \| typeImport/);
	});

	it("rejects an action key it does not implement", () => {
		expect(() => normalizeCodeRoles([{ slug: "a", actions: { import: { where: ["a"], byName: true } } }])).toThrow(/is not an action key/);
	});

	it("accepts a custom action name mapped onto a fact class", () => {
		const roles = normalizeCodeRoles([{ slug: "a", actions: { emit: { where: ["a"], of: "call" } } }]);
		expect(roles.a.actions.emit.of).toBe("call");
	});

	it("keeps the order of roles and gives them no location of their own", () => {
		const roles = normalizeCodeRoles([
			{ slug: "storeModel", name: "store model", infer: [{ kind: { own: { is: { equals: "VariableDeclaration" } } } }] },
			{ slug: "action", name: "action" },
		]);
		expect(Object.keys(roles)).toEqual(["storeModel", "action"]);
		// A role says WHAT code is; the node that holds it says WHERE — so a role
		// carries no path of its own, and a role-level `where` is an error.
		expect(roles.action.where).toBeUndefined();
		expect(() => normalizeCodeRoles([{ slug: "a", where: [{ node: "x" }] }])).toThrow(/a role says WHAT code is, a node says WHERE/);
	});

	it("reports a role declared outside ALL of its homes, and stays silent inside any", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/hit.ts", "src/probes/ok.ts", "src/helpers/also-ok.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("probe hit: go");
		expect(printed).not.toContain("probe hit: fine");
		expect(printed).not.toContain("probe hit: fine2");
	});
});

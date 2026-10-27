import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// A role whose infer matches any arrow function and carries a top-level
// `report` — the pipeline must emit it for every candidate classified into
// the role, with the candidate's name and line.
const ARCH = JSON.stringify({
	nodes: {
		// `kind: []` excludes the probe role, so a classified candidate in
		// this node is a misfit and its top-level report fires.
		src: { slug: "src", name: "src", kind: [], children: ["**/*.ts"] },
	},
	codeRoles: [
		{
			slug: "probe",
			infer: [{ kind: { equals: "ArrowFunction" } }],
			report: { message: "probe hit: {what}" },
		},
	],
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-roles-report-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "src"), { recursive: true });
	fs.writeFileSync(path.join(root, "src", "hit.ts"), "export const go = () => 1;\n");
	fs.writeFileSync(path.join(root, "src", "clean.ts"), "export const n = 1;\n");
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

describe("codeRole top-level report", () => {
	it("emits the role report for every classified candidate, named and lined", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/hit.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("probe hit: go");
	});

	it("does not report for files with no matching candidate", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--files", "src/clean.ts"]);
		expect(code).toBe(0);
		expect(printed).not.toContain("probe hit");
	});
});


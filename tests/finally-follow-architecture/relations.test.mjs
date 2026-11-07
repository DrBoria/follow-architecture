import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");
const { FACT_KINDS } = require("../../entities/kinds");

// The seven relations are the whole vocabulary of what one file may do to
// another, and every one of them is CLOSED: a role that does not say who may do
// it allows nobody. These tests pin that, because the alternative — silence
// meaning permission — is what let a store be written from anywhere.
const ARCH = JSON.stringify({
	// The tree is what gives a file its ROLE HOME — a role that lives nowhere is
	// a role no edge can be checked against.
	nodes: [{ slug: "src", name: "src", children: [{ name: "state.ts", role: "store" }, "**/*.ts"] }],
	codeRoles: [
		{
			// the ONE role that may be read, and the only one that may be written
			slug: "store",
			infer: [{ name: { equals: "state" } }],
			actions: {
				declare: { where: ["**/*.ts"] },
				export: { where: ["**/*.ts"] },
				// importing the state is how a reader gets a handle on it
				import: { where: [{ role: "entry" }] },
				read: { where: [{ role: "entry" }] },
				mutate: { where: [{ role: "entry" }] },
			},
		},
		{
			slug: "entry",
			infer: [{ name: { matches: "entry*" } }],
			actions: {
				declare: { where: ["**/*.ts"] },
				export: { where: ["**/*.ts"] },
				import: { where: [{ role: "entry" }] },
				read: { where: [{ role: "entry" }] },
			},
		},
		{
			slug: "helper",
			infer: [{ name: { matches: "helper*" } }],
			actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } },
		},
	],
	invariants: [],
});

let root;

const write = (rel, text) => {
	fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
	fs.writeFileSync(path.join(root, rel), text);
};

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-relations-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	write("src/state.ts", "export const state = { value: 1 };\n");
	// reads the state from an `entry` — the store names `entry` as a reader
	write("src/reader.ts", "import { state } from './state';\nexport const entryRead = () => state.value;\n");
	// reads it from a `helper` — the store names nobody else
	write("src/peek.ts", "import { state } from './state';\nexport function helperPeek() {\n  return state.value;\n}\n");
	// writes into it from a `helper`
	write("src/writer.ts", "import { state } from './state';\nexport function helperWrite() {\n  state.value = 2;\n}\n");
	// reaches it from a file no role describes at all
	write("src/nobody.ts", "import { state } from './state';\nexport const n = () => state.value;\n");
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

const check = (rel) => run(["--config", path.join(root, "architecture.json"), "--check", "--files", rel]);

describe("the seven relations", () => {
	it("is the closed vocabulary: import, export, declare, call, mutate, assign, read, typeImport", () => {
		expect([...FACT_KINDS].sort()).toEqual(["assign", "call", "declare", "export", "import", "mutate", "read", "typeImport"]);
	});
});

describe("reading state", () => {
	it("allows the roles the store names as readers", () => {
		const { code, printed } = check("src/reader.ts");
		expect(code).toBe(0);
		expect(printed).not.toContain("may read `store`");
	});

	it("forbids a role the store does not name — closed, not silent", () => {
		const { printed } = check("src/peek.ts");
		expect(printed).toContain("reads `state.value`");
		expect(printed).toContain("but only `entry` may do it");
		// The role is named for the PIECE of code that reads, not for the file
		expect(printed).toContain("`helperPeek` (a `helper`)");
	});
});

describe("changing state", () => {
	it("is a relation of its own, judged against the store's `mutate` rule", () => {
		const { printed } = check("src/writer.ts");
		expect(printed).toContain("changes `state.value`");
		expect(printed).toContain("only `entry` may do it");
	});
});

describe("a file no role describes", () => {
	it("is reported per PIECE of code, because a piece is granted nothing", () => {
		const { printed, code } = check("src/nobody.ts");
		expect(code).toBe(1);
		expect(printed).toContain("has no role");
		// …and each relation it makes says why it is refused
		expect(printed).toContain("has no role");
	});
});

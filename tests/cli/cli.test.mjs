import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

const ARCH = JSON.stringify({
	nodes: {
		apps: { slug: "apps", name: "apps", children: ["backend"] },
		backend: { slug: "backend", name: "backend", parent: "apps", closed: true, children: ["index.ts", "package.json"] },
	},
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-cli-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "apps", "backend"), { recursive: true });
	// host.ts is a stray relative to the closed backend node → orphan finding.
	fs.writeFileSync(path.join(root, "apps", "backend", "index.ts"), "export const a = 1;\n");
	fs.writeFileSync(path.join(root, "apps", "backend", "host.ts"), "export const b = 2;\n");
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

describe("CLI --files", () => {
	it("scans only the listed files (orphans computed over that set)", () => {
		const { printed } = run(["--config", path.join(root, "architecture.json"), "--files", "apps/backend/host.ts"]);
		expect(printed).toContain("host.ts");
		expect(printed).not.toContain("index.ts");
	});

	it("skips files that do not exist", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--files", "apps/backend/nope.ts"]);
		expect(code).toBe(0);
		expect(printed).not.toContain("nope.ts");
	});

	it("without --files scans the whole tree", () => {
		const { printed } = run(["--config", path.join(root, "architecture.json")]);
		// host.ts is an orphan → flagged; index.ts is clean → absent from the findings section.
		expect(printed).toContain("host.ts");
		expect(printed).not.toContain("index.ts");
	});

	it("--check exits 1 when the listed files have findings", () => {
		const { code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "apps/backend/host.ts"]);
		expect(code).toBe(1);
	});
});


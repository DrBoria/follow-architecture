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
		backend: { slug: "backend", name: "backend", parent: "apps", role: "entry", children: ["index.ts", "package.json"] },
	},
	codeRoles: [{ slug: "entry", infer: [{ kind: { own: { is: { equals: "VariableDeclaration" } } } }], actions: { declare: { where: ["**/*.ts"] }, export: { where: ["**/*.ts"] } } }],
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
		// A finding NAMES the folder's allowed children (`index.ts` is one), so
		// "not scanned" is asserted on the section header, not on any mention.
		expect(printed).not.toContain("### `apps/backend/index.ts`");
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
		expect(printed).not.toContain("### `apps/backend/index.ts`");
	});

	it("--check exits 1 when the listed files have findings", () => {
		const { code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "apps/backend/host.ts"]);
		expect(code).toBe(1);
	});
});


describe("CLI scan scope", () => {
	it("scans the tool's default extensions, and more when --ext adds them", () => {
		// Scan scope is the TOOL's, never the architecture's — and it is an option,
		// so a repo is not locked to the built-in list.
		fs.writeFileSync(path.join(root, "apps", "backend", "notes.md"), "export const c = 3;\n");
		const before = run(["--config", path.join(root, "architecture.json")]);
		expect(before.printed).not.toContain("notes.md");
		const after = run(["--config", path.join(root, "architecture.json"), "--ext", ".md"]);
		expect(after.printed).toContain("notes.md");
	});
});

describe("CLI --overview", () => {
	it("writes a standalone HTML file instead of markdown", () => {
		const out = path.join(root, "overview.html");
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--overview", out]);
		expect(code).toBe(0);
		expect(printed).toContain("wrote overview.html");
		const html = fs.readFileSync(out, "utf8");
		expect(html.startsWith("<!doctype html>")).toBe(true);
		expect(html).toContain('id="arch-data"');
		fs.rmSync(out, { force: true });
	});

	it("defaults the path when --overview is followed by another flag", () => {
		const { printed } = run(["--config", path.join(root, "architecture.json"), "--overview", "--check"]);
		expect(printed).toContain("architecture-overview.html");
		fs.rmSync(path.join(root, "architecture-overview.html"), { force: true });
	});
});

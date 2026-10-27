import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// An action is a PLAIN exported function that mutates its store parameter,
// living in the store's `actions/` folder. The role is inferred by location
// (the same `location` entry interface as `location.allowedFrom`) PLUS a
// shape condition: a function whose body RETURNS AN OBJECT LITERAL is a
// factory, not an action — factories are forbidden in `actions/`. The
// actions node declares `kind: [action]`, so a factory (classified
// `pureFunction`) is a misfit there.
//
// The shape condition is generic — it says nothing about "actions", "mobx",
// or any store library. Any role inferred by location can carry the same
// `returns.none.exprKind` exclusion.
const ARCH = JSON.stringify({
	nodes: [
		{ slug: "src", name: "src", children: ["{kebab-case}", "**/*.ts"] },
		{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["store.ts", "actions", "**/*.ts"] },
		{
			slug: "feature-actions",
			name: "actions",
			parent: "feature",
			kind: ["action"],
			children: ["**/*.ts"],
			location: {
				declaration: ["action"],
				import: { allowedFrom: ["src/{kebab-case}/store.ts"] },
				usage: { allowedFrom: ["src/{kebab-case}/store.ts"] },
			},
		},
	],
	codeRoles: [
		{
			slug: "action",
			name: "action",
			infer: [
				{ location: { node: "feature-actions" } },
				{ returns: { none: { exprKind: { equals: "ObjectLiteralExpression" } } } },
			],
		},
		{
			slug: "pureFunction",
			name: "pure function",
			infer: [{ kind: { in: ["FunctionDeclaration", "ArrowFunction", "MethodDeclaration"] } }],
		},
	],
	invariants: [
		{
			id: "state-lives-in-store",
			where: "src/**/*.ts",
			forbid: [
				{
					mutatedParams: { length: { gt: 0 } },
					role: { not: "action" },
					report: { message: "Mutates its parameter(s) `{mutatedParams}` but is not an action.", fix: "Make it a plain action in `actions/`." },
				},
			],
		},
	],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-action-shape-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "src", "document", "actions"), { recursive: true });
	// the plain-function action — the legal shape
	fs.writeFileSync(
		path.join(root, "src", "document", "actions", "sync.ts"),
		"export const sync = (state) => {\n  state.x = 1;\n};\n",
	);
	// the factory — the forbidden shape: returns an object literal
	fs.writeFileSync(
		path.join(root, "src", "document", "actions", "factory.ts"),
		"export const createXActions = (self) => ({\n  doX() { self.x = 1; },\n});\n",
	);
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

const run = (rel) => {
	let printed = "";
	const orig = console.log;
	console.log = (s) => {
		printed += `${s}\n`;
	};
	let code = 0;
	const prevCwd = process.cwd();
	process.chdir(root);
	try {
		code = main(["--config", path.join(root, "architecture.json"), "--check", "--files", rel]);
	} finally {
		process.chdir(prevCwd);
		console.log = orig;
	}
	return { code, printed };
};

describe("action shape: plain function legal, factory forbidden", () => {
	it("allows a plain exported function that mutates its state parameter", () => {
		const { printed, code } = run("src/document/actions/sync.ts");
		expect(code).toBe(0);
		expect(printed).not.toContain("finding");
	});

	it("flags a factory (function returning an object literal) in actions/", () => {
		const { printed, code } = run("src/document/actions/factory.ts");
		expect(code).toBe(1);
		// the factory's arrow is classified pureFunction, not action —
		// the node declares kind [action], so it is a misfit
		expect(printed).toContain("pureFunction");
		// and its `self.x = 1` mutation is a state-bag violation: the
		// `role: { not: "action" }` exemption no longer applies to it
		expect(printed).toContain("not an action");
	});
});

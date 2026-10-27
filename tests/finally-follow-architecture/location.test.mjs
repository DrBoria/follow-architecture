import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// A node (`actions`) that declares a `location` restriction: its exports may
// only be imported AND called from the SAME feature's `store.ts`. The
// `{kebab-case}` placeholder in the allowedFrom glob binds to the TARGET
// file's feature, so `src/alpha/store.ts` may import `src/alpha/actions`, but
// `src/beta/thing.ts` may not.
const ARCH = JSON.stringify({
	nodes: [
		{ slug: "src", name: "src", children: ["{kebab-case}", "**/*.ts"] },
		{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["actions", "**/*.ts"] },
		{
			slug: "actions",
			name: "actions",
			parent: "feature",
			children: ["**/*.ts"],
			location: {
				import: { allowedFrom: ["src/{kebab-case}/store.ts"] },
				usage: { allowedFrom: ["src/{kebab-case}/store.ts"] },
			},
		},
	],
	codeRoles: {},
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-location-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "src", "alpha", "actions"), { recursive: true });
	fs.mkdirSync(path.join(root, "src", "beta"), { recursive: true });
	// the action under test
	fs.writeFileSync(path.join(root, "src", "alpha", "actions", "go.ts"), "export const go = () => 1;\n");
	// SAME feature's store.ts imports + calls the action -> allowed
	fs.writeFileSync(
		path.join(root, "src", "alpha", "store.ts"),
		'import { go } from "./actions/go";\nexport const run = () => go();\n',
	);
	// a DIFFERENT feature imports + calls the action -> flagged (both import and usage)
	fs.writeFileSync(
		path.join(root, "src", "beta", "thing.ts"),
		'import { go } from "../alpha/actions/go";\nexport const run = () => go();\n',
	);
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

describe("node location check", () => {
	it("does not flag the same feature's store.ts importing + calling the action", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/alpha/store.ts"]);
		expect(code).toBe(0);
		expect(findings(printed)).toBe(0);
	});

	it("flags a different feature importing the action", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/beta/thing.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("is not allowed");
		expect(printed).toContain("node `actions`");
		// the allowed set is spelled out so a fix agent knows the destination
		expect(printed).toContain("src/{kebab-case}/store.ts");
	});
});

// Scope-access location: a store node declares `location.scopeAccess` (the
// field names through which its scope is reached) plus `location.usage.
// allowedFrom`. `getRoot(self).<field>` chains from a file outside the
// allowed set are flagged; from an allowed file they are not. No imports
// involved — this is the cross-store-call check.
describe("node location.scopeAccess check", () => {
	let sroot;
	const ARCH = JSON.stringify({
		nodes: [
			{ slug: "src", name: "src", children: ["{kebab-case}", "**/*.ts"] },
			{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["store.ts", "actions", "**/*.ts"] },
			{
				slug: "store",
				name: "store.ts",
				parent: "feature",
				location: {
					scopeAccess: ["grammar"],
					usage: { allowedFrom: ["src/{kebab-case}/actions/**"] },
				},
			},
		],
		// Accessors are declared per-role (the role reached through the tree).
		codeRoles: [{ slug: "storeModel", name: "store model", scopeAccessors: [{ kind: "call", segments: ["getRoot"] }, { kind: "call", segments: ["getParent"] }] }],
		invariants: [],
	});

	beforeAll(() => {
		sroot = fs.mkdtempSync(path.join(os.tmpdir(), "fa-scope-"));
		fs.writeFileSync(path.join(sroot, "architecture.json"), ARCH);
		fs.mkdirSync(path.join(sroot, "src", "alpha", "actions"), { recursive: true });
		fs.mkdirSync(path.join(sroot, "src", "beta"), { recursive: true });
		// allowed caller: same feature's actions/ reaches the store through `grammar`
		fs.writeFileSync(
			path.join(sroot, "src", "alpha", "actions", "go.ts"),
			'const f = (self) => { getRoot(self).grammar.loadGrammar(); };\n',
		);
		// disallowed caller: a different feature reaches the same store field
		fs.writeFileSync(
			path.join(sroot, "src", "beta", "thing.ts"),
			'const f = (self) => { getRoot(self).grammar.loadGrammar(); };\n',
		);
	});

	afterAll(() => {
		fs.rmSync(sroot, { recursive: true, force: true });
	});

	const runScope = (rel) => {
		let printed = "";
		const orig = console.log;
		console.log = (s) => {
			printed += `${s}\n`;
		};
		let code = 0;
		const prevCwd = process.cwd();
		process.chdir(sroot);
		try {
			code = main(["--config", path.join(sroot, "architecture.json"), "--check", "--files", rel]);
		} finally {
			process.chdir(prevCwd);
			console.log = orig;
		}
		return { code, printed };
	};

	it("does not flag an allowed caller reaching the store through the declared field", () => {
		const { printed, code } = runScope("src/alpha/actions/go.ts");
		expect(code).toBe(0);
		expect(findings(printed)).toBe(0);
	});

	it("flags a disallowed caller reaching the store through the declared field", () => {
		const { printed, code } = runScope("src/beta/thing.ts");
		expect(code).toBe(1);
		expect(printed).toContain("node `store`");
		expect(printed).toContain("getRoot(…).grammar.loadGrammar");
		expect(printed).toContain("allowed from: src/{kebab-case}/actions/**");
	});
});

// The full cross-store action pattern (how-to-use-actions-in-mobx.md), in one
// architecture: a root store that HOLDS the sibling stores and declares them
// in `location.scopeAccess`; a feature store whose DATA is reachable only
// through the tree (import forbidden to other features); a feature action —
// a PLAIN exported function that mutates its store parameter, living in the
// feature's `actions/` folder (role inferred by the `path` location entry) —
// that reaches sibling stores through the tree in ANY dot-joined form:
// `getRoot(self).x`, `global.x.y`, `self.root.storeA.doX()`,
// `parent.get("name").feature`.
//
//   ALLOWED:  `getRoot(self).grammar.loadGrammar()` / `global.root.grammar.x`
//             / `parent.get("name").feature` from a feature action (the
//             store field is declared on the root store, whose
//             `usage.allowedFrom` covers it).
//   FORBIDDEN: a direct `import { GrammarStore } from "../grammar/store"` —
//             the feature store's `location.import.allowedFrom` does not
//             include the other feature.
describe("cross-store action pattern (tree access in any form allowed, direct import forbidden)", () => {
	const ARCH = JSON.stringify({
		nodes: [
			{ slug: "src", name: "src", children: ["store.ts", "{kebab-case}", "**/*.ts"] },
			{
				slug: "root",
				name: "store.ts",
				parent: "src",
				location: {
					scopeAccess: ["root", "grammar", "document", "feature"],
					usage: { allowedFrom: ["src/**/*.ts"] },
				},
			},
			{ slug: "feature", name: "{kebab-case}", parent: "src", children: ["store.ts", "actions", "**/*.ts"] },
			{
				slug: "feature-store",
				name: "store.ts",
				parent: "feature",
				location: {
					import: { allowedFrom: ["src/store.ts", "src/{kebab-case}/**/*.ts"] },
				},
			},
			{
				slug: "feature-actions",
				name: "actions",
				parent: "feature",
				location: { declaration: ["action"] },
				children: ["**/*.ts"],
			},
		],
		codeRoles: [
			// scopeAccessors are structured chain roots: { kind, segments }.
			// kind = the base shape of the access chain (call / identifier /
			// methodCall); an accessor only ever matches its own kind.
			{
				slug: "storeModel",
				name: "store model",
				scopeAccessors: [
					{ kind: "call", segments: ["getRoot"] },
					{ kind: "call", segments: ["getParent"] },
					{ kind: "call", segments: ["get"] },
					{ kind: "identifier", segments: ["global"] },
					{ kind: "identifier", segments: ["self", "root"] },
					{ kind: "methodCall", segments: ["parent", "get"] },
				],
			},
			// Location decides the role — the same entry interface as
			// `location.allowedFrom`.
			{ slug: "action", infer: [{ location: { node: "feature-actions" } }] },
		],
		invariants: [
			{
				id: "state-lives-in-store",
				where: "src/**/*.ts",
				forbid: [
					{
						mutatedParams: { length: { gt: 0 } },
						role: { not: "action" },
						report: {
							message: "Mutates its parameter(s) `{mutatedParams}` outside an actions folder.",
							fix: "Make it an action in the store's `actions/` folder.",
						},
					},
				],
			},
		],
	});

	let croot;
	beforeAll(() => {
		croot = fs.mkdtempSync(path.join(os.tmpdir(), "fa-cross-"));
		fs.writeFileSync(path.join(croot, "architecture.json"), ARCH);
		fs.mkdirSync(path.join(croot, "src", "document", "actions"), { recursive: true });
		fs.mkdirSync(path.join(croot, "src", "grammar"), { recursive: true });
		// root store composes the siblings
		fs.writeFileSync(path.join(croot, "src", "store.ts"), "export const Root = t.model('Root', { grammar: G, document: D });\n");
		// grammar feature store (the sibling being reached)
		fs.writeFileSync(
			path.join(croot, "src", "grammar", "store.ts"),
			"export const GrammarStore = t.model('GrammarStore', {});\n",
		);
		// plain-function actions reaching the grammar store THROUGH the tree,
		// in every supported dot-joined form
		fs.writeFileSync(
			path.join(croot, "src", "document", "actions", "sync.ts"),
			"export const sync = (state) => {\n  getRoot(state).grammar.loadGrammar();\n};\n" +
				"export const viaGlobal = (state) => {\n  global.root.grammar.loadGrammar();\n};\n" +
				"export const viaSelfRoot = (state) => {\n  self.root.grammar.loadGrammar();\n};\n" +
				'export const viaParentGet = (state) => {\n  parent.get("name").grammar.loadGrammar();\n};\n',
		);
		// a document action that reaches the grammar store by DIRECT IMPORT
		fs.writeFileSync(
			path.join(croot, "src", "document", "actions", "bad.ts"),
			'import { GrammarStore } from "../../grammar/store";\nexport const bad = (state) => {\n  state.grammar = GrammarStore;\n};\n',
		);
		// a document action reaching a field NO node declares in scopeAccess
		fs.writeFileSync(
			path.join(croot, "src", "document", "actions", "undeclared.ts"),
			"export const undeclared = (state) => {\n  getRoot(state).secret.doX();\n};\n",
		);
	});

	afterAll(() => {
		fs.rmSync(croot, { recursive: true, force: true });
	});

	const runCross = (rel) => {
		let printed = "";
		const orig = console.log;
		console.log = (s) => {
			printed += `${s}\n`;
		};
		let code = 0;
		const prevCwd = process.cwd();
		process.chdir(croot);
		try {
			code = main(["--config", path.join(croot, "architecture.json"), "--check", "--files", rel]);
		} finally {
			process.chdir(prevCwd);
			console.log = orig;
		}
		return { code, printed };
	};

	it("allows a feature action to reach a sibling store through getRoot(self)", () => {
		const { printed, code } = runCross("src/document/actions/sync.ts");
		expect(code).toBe(0);
		expect(printed).not.toContain("is not allowed");
	});

	it("forbids a direct import of another feature's store", () => {
		const { printed, code } = runCross("src/document/actions/bad.ts");
		expect(code).toBe(1);
		expect(printed).toContain("is not allowed");
		expect(printed).toContain("node `feature-store`");
	});

	it("forbids reaching a store field no node declares in scopeAccess", () => {
		const { printed, code } = runCross("src/document/actions/undeclared.ts");
		expect(code).toBe(1);
		expect(printed).toContain("no node declares");
		expect(printed).toContain("`secret`");
	});
});

// The real-world yaml shape: feature folders declared LITERALLY (one node per
// feature, no templated `{kebab-case}` ancestor). Nothing captures the
// placeholder, so `targetCapsFor` must bind it positionally from the target's
// own path — otherwise `{kebab-case}` stays a wildcard and cross-feature
// imports pass silently.
describe("cross-feature import with literal feature folders (no templated ancestor)", () => {
	const ARCH = JSON.stringify({
		nodes: [
			{ slug: "src", name: "src", children: ["store.ts", "document", "grammar", "**/*.ts"] },
			{
				slug: "root",
				name: "store.ts",
				parent: "src",
				location: {
					scopeAccess: ["grammar", "document"],
					usage: { allowedFrom: ["src/**/*.ts"] },
				},
			},
			{ slug: "document", name: "document", parent: "src", children: ["store.ts", "actions", "**/*.ts"] },
			{ slug: "grammar", name: "grammar", parent: "src", children: ["store.ts", "actions", "**/*.ts"] },
			{
				slug: "document-store",
				name: "store.ts",
				parent: "document",
				location: {
					import: { allowedFrom: ["src/store.ts", "src/{kebab-case}/**/*.ts"] },
				},
			},
			{
				slug: "grammar-store",
				name: "store.ts",
				parent: "grammar",
				location: {
					import: { allowedFrom: ["src/store.ts", "src/{kebab-case}/**/*.ts"] },
				},
			},
			{
				slug: "document-actions",
				name: "actions",
				parent: "document",
				location: { declaration: ["action"] },
				children: ["**/*.ts"],
				location: {
					import: { allowedFrom: ["src/{kebab-case}/store.ts"] },
				},
			},
			{
				slug: "grammar-actions",
				name: "actions",
				parent: "grammar",
				location: { declaration: ["action"] },
				children: ["**/*.ts"],
				location: {
					import: { allowedFrom: ["src/{kebab-case}/store.ts"] },
				},
			},
		],
		codeRoles: [
			{ slug: "storeModel", name: "store model", scopeAccessors: [{ kind: "call", segments: ["getRoot"] }, { kind: "call", segments: ["getParent"] }] },
			{ slug: "action", infer: [{ location: { node: "document-actions" } }] },
			{ slug: "grammar-action", infer: [{ location: { node: "grammar-actions" } }] },
		],
	});

	let lroot;
	beforeAll(() => {
		lroot = fs.mkdtempSync(path.join(os.tmpdir(), "fa-lit-"));
		fs.writeFileSync(path.join(lroot, "architecture.json"), ARCH);
		fs.mkdirSync(path.join(lroot, "src", "document", "actions"), { recursive: true });
		fs.mkdirSync(path.join(lroot, "src", "grammar", "actions"), { recursive: true });
		fs.writeFileSync(path.join(lroot, "src", "store.ts"), "export const Root = t.model('Root', { grammar: G, document: D });\n");
		fs.writeFileSync(path.join(lroot, "src", "document", "store.ts"), "export const DocumentStore = t.model('DocumentStore', {});\n");
		fs.writeFileSync(path.join(lroot, "src", "grammar", "store.ts"), "export const GrammarStore = t.model('GrammarStore', {});\n");
		// same-feature import: document's action importing its own store
		fs.writeFileSync(
			path.join(lroot, "src", "document", "actions", "own.ts"),
			'import { DocumentStore } from "../store";\nexport const own = (state) => {\n  state.x = 1;\n};\n',
		);
		// cross-feature import: document's action importing GRAMMAR's store
		fs.writeFileSync(
			path.join(lroot, "src", "document", "actions", "cross.ts"),
			'import { GrammarStore } from "../../grammar/store";\nexport const cross = (state) => {\n  state.grammar = GrammarStore;\n};\n',
		);
	});

	afterAll(() => {
		fs.rmSync(lroot, { recursive: true, force: true });
	});

	const runLit = (rel) => {
		let printed = "";
		const orig = console.log;
		console.log = (s) => {
			printed += `${s}\n`;
		};
		let code = 0;
		const prevCwd = process.cwd();
		process.chdir(lroot);
		try {
			code = main(["--config", path.join(lroot, "architecture.json"), "--check", "--files", rel]);
		} finally {
			process.chdir(prevCwd);
			console.log = orig;
		}
		return { code, printed };
	};

	it("allows an action to import its OWN feature's store", () => {
		const { code, printed } = runLit("src/document/actions/own.ts");
		expect(code).toBe(0);
		expect(printed).not.toContain("is not allowed");
	});

	it("forbids an action importing ANOTHER feature's store (literal folders)", () => {
		const { code, printed } = runLit("src/document/actions/cross.ts");
		expect(code).toBe(1);
		expect(printed).toContain("is not allowed");
		expect(printed).toContain("grammar-store");
	});
});

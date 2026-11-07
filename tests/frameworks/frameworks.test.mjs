import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// The same engine, three designs it was never told about. Nothing here is
// Angular/React/Vue-specific in the code: every one of these is a plain
// `codeRoles` entry with `infer` filters over AST facts (kind, decorators,
// names, calls, mutations) and `where` / `actions[].where`.
//
// It also covers what the config is supposed to give for free:
//   - an action with its own vocabulary (`emit: { of: call }`),
//   - an invariant gated by the SAME `where` a role uses (`{ role }`, filters).
const ARCH = JSON.stringify({
	nodes: [
		{ slug: "src", name: "src", children: ["**/*.ts", "**/*.vue"], role: ["plainUtil", "widget"] },
		{ slug: "components", name: "components", parent: "src", children: ["**/*.ts"], role: "angularComponent" },
		{ slug: "hooks", name: "hooks", parent: "src", children: ["**/*.ts"], role: "reactHook" },
		{ slug: "api", name: "api", parent: "src", children: ["**/*.ts"], role: "service" },
	],
	codeRoles: [
		{
			slug: "angularComponent",
			infer: [{ kind: { own: { is: { equals: "ClassDeclaration" } } } }, { kind: { decorators: { any: { name: { equals: "Component" } } } } }],
			actions: {
				call: { where: [{ role: "angularComponent" }] },
				// Its own word for it: the AST only knows it as a call.
				emit: { of: "call", where: [{ role: "angularComponent" }] },
			},
			report: { message: "component `{what}` lives outside components/" },
		},
		{
			slug: "reactHook",
			infer: [{ kind: { own: { is: { in: ["FunctionDeclaration", "ArrowFunction"] } } } }, { name: { startsWith: "use" } }],
			report: { message: "hook `{what}` lives outside hooks/" },
		},
		{
			slug: "plainUtil",
			infer: [{ kind: { own: { is: { in: ["FunctionDeclaration", "ArrowFunction"] } } } }, { name: { startsWith: "util" } }],
		},
		{
			slug: "widget",
			// A class with no decorator at all — a plain stateful object.
			infer: [{ kind: { own: { is: { equals: "ClassDeclaration" } } } }],
			actions: {
				// Only a component may write state; a widget may not write its own.
				mutate: { where: [{ role: "angularComponent" }] },
			},
		},
		{
			slug: "service",
			infer: [{ kind: { own: { is: { equals: "ClassDeclaration" } } } }, { kind: { decorators: { any: { name: { equals: "Injectable" } } } } }],
			actions: {
				// Only a component or a hook may reach a service. Both halves are
				// written out because a relation a role does not declare is FORBIDDEN:
				// naming only `import` would also ban `new TodoApi()`.
				import: { where: [{ role: "angularComponent" }, { role: "reactHook" }] },
				call: { where: [{ role: "angularComponent" }, { role: "reactHook" }] },
			},
			report: { message: "service `{what}` lives outside api/" },
		},
	],
	invariants: [
		{
			id: "components-are-small",
			// The SAME `where` a role uses: a role reference, no path at all.
			where: [{ role: "angularComponent" }],
			infer: [{ lines: { length: { gt: 8 } } }],
			report: "class is {lines} lines — split it",
		},
		{
			id: "unclassified-is-small",
			// The SAME `where` a role uses: a fact filter over the file's own facts.
			where: [{ candidates: { length: { gt: 20 } } }],
			infer: [{ lines: { length: { gt: 20 } } }],
			report: "unclassified file of {lines} lines",
		},
	],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-frameworks-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	for (const dir of ["components", "hooks", "api"]) fs.mkdirSync(path.join(root, "src", dir), { recursive: true });

	// Angular: class + decorator + DI constructor param, calling the service.
	fs.writeFileSync(
		path.join(root, "src", "components", "real.component.ts"),
		["@Component({ selector: 'x' })", "export class RealComponent {", "  constructor(private api: TodoApi) {}", "  save() { this.api.put(); }", "}", ""].join("\n"),
	);
	// The service (Injectable) in its allowed folder.
	fs.writeFileSync(path.join(root, "src", "api", "todo.api.ts"), ["@Injectable()", "export class TodoApi {", "  put() { return 1; }", "}", ""].join("\n"));
	// React: a hook.
	fs.writeFileSync(path.join(root, "src", "hooks", "useThing.ts"), "export const useThing = () => 1;\n");
	// Vue: an SFC — only the <script> block must be parsed.
	fs.writeFileSync(
		path.join(root, "src", "Counter.vue"),
		["<template>", "  <div>{{ count }}</div>", "</template>", '<script setup lang="ts">', "export const Counter = () => 2;", "</script>", ""].join("\n"),
	);
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

describe("framework-agnostic facts", () => {
	it("classifies a class by the decorator it carries", () => {
		const { printed } = run(["src/components/real.component.ts"]);
		expect(printed).not.toContain("outside components/");
	});

	it("reads the decorator as a fact — no list of framework names in the code", () => {
		// The SAME class shape declared in api/ is a component out of place.
		fs.writeFileSync(path.join(root, "src", "api", "stray.ts"), '@Component({ selector: "y" })\nexport class Stray {}\n');
		const { printed } = run(["src/api/stray.ts"]);
		expect(printed).toContain("outside components/");
	});

	it("discovers a React hook by its name prefix", () => {
		const { printed } = run(["src/hooks/useThing.ts"]);
		expect(printed).not.toContain("outside hooks/");
	});

	it("parses a Vue SFC's <script> block", () => {
		const { printed } = run(["src/Counter.vue"]);
		expect(printed).not.toContain("SyntaxError");
		expect(printed).not.toContain("<template>");
	});

	it("allows an action spelled with the role's own vocabulary through `of`", () => {
		const { printed } = run(["src/components/real.component.ts"]);
		expect(printed).not.toContain("emit");
	});

	it("allows the importers the service named, and only those", () => {
		// `import.where` names the component and the hook — a util is not on the list.
		fs.writeFileSync(path.join(root, "src", "utilBad.ts"), 'import { TodoApi } from "./api/todo.api";\nexport const utilBad = () => new TodoApi();\n');
		fs.writeFileSync(path.join(root, "src", "hooks", "useGood.ts"), 'import { TodoApi } from "../api/todo.api";\nexport const useGood = () => new TodoApi();\n');
		const bad = run(["src/utilBad.ts"]);
		expect(bad.code).toBe(1);
		expect(bad.printed).toContain("may do it with `service` code");
		const good = run(["src/hooks/useGood.ts"]);
		expect(good.printed).not.toContain("may do it with `service` code");
	});
});

describe("`this.x` is a mutation like any other", () => {
	it("checks a write to the role's own state against that role's `mutate` rule", () => {
		fs.writeFileSync(path.join(root, "src", "plain-widget.ts"), "export class PlainWidget {\n  x = 0;\n  bump() { this.x = 1; }\n}\n");
		const { code, printed } = run(["src/plain-widget.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("`widget`");
	});

	it("stays silent when the role does allow it", () => {
		fs.writeFileSync(path.join(root, "src", "components", "ok.component.ts"), "@Component({})\nexport class Ok {\n  x = 0;\n  bump() { this.x = 1; }\n}\n");
		const { printed } = run(["src/components/ok.component.ts"]);
		expect(printed).not.toContain("role `angularComponent`");
	});
});

describe("invariant `where` is the role `where`", () => {
	it("gates on a role reference", () => {
		fs.writeFileSync(
			path.join(root, "src", "components", "big.component.ts"),
			["@Component({})", "export class Big {", ...Array.from({ length: 10 }, (_, i) => `  a${i} = ${i};`), "}", ""].join("\n"),
		);
		const { printed } = run(["src/components/big.component.ts"]);
		expect(printed).toContain("split it");
	});

	it("gates on a fact filter", () => {
		fs.writeFileSync(path.join(root, "src", "api", "noise.ts"), `${Array.from({ length: 22 }, (_, i) => `export const n${i} = ${i};`).join("\n")}\n`);
		const { printed } = run(["src/api/noise.ts"]);
		expect(printed).toContain("unclassified file");
	});
});

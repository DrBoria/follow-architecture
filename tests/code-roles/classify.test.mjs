import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classifyRoles } = require("../../code-roles/classify");

const fnKinds = ["FunctionDeclaration", "FunctionExpression", "ArrowFunction", "MethodDeclaration", "GetAccessor", "SetAccessor"];

// Mirrors the md-prettify role definitions (declaration order = priority).
const codeRoles = {
	storeModel: {
		infer: [
			{ kind: { own: { is: { equals: "VariableDeclaration" } } } },
			{ kind: { initializer: { is: { in: ["CallExpression", "NewExpression"] }, origin: { equals: "t.model" } } } },
		],
	},
	factory: {
		infer: [
			{ kind: { own: { is: { in: fnKinds } } } },
			{ returns: { any: { exprKind: { equals: "ObjectLiteralExpression" }, members: { any: { isFunction: { equals: true } } } } } },
		],
	},
	pureFunction: {
		infer: [
			{ kind: { own: { is: { in: fnKinds } } } },
			{ calls: { length: { equals: 0 } } },
			{ assignments: { none: { local: { equals: true } } } },
		],
	},
	orchestrator: {
		infer: [
			{ kind: { own: { is: { in: fnKinds } } } },
			{ calls: { length: { gt: 0 } } },
		],
	},
};

// Real candidates always carry these list facts (ast.js collects them even
// when empty), so the fixtures mirror that.
const fn = (name, extra = {}) => ({
	kind: { own: { is: "ArrowFunction" } },
	name,
	line: 1,
	returns: [],
	calls: [],
	assignments: [],
	...extra,
});

describe("classifyRoles", () => {
	it("classifies a store model variable", () => {
		const { present, candidates } = classifyRoles(
			[{ kind: { own: { is: "VariableDeclaration" }, initializer: { is: "CallExpression", origin: "t.model" } }, name: "documentStore", line: 1 }],
			codeRoles,
		);
		expect(present).toEqual(["storeModel"]);
		expect(candidates[0].role).toBe("storeModel");
	});

	it("classifies a factory (returns object literal with methods)", () => {
		const { present } = classifyRoles(
			[fn("createPrettyModel", { returns: [{ kind: "ExpressionBody", exprKind: "ObjectLiteralExpression", members: [{ name: "run", isFunction: true }] }], 			calls: [{ action: "x" }] })],
			codeRoles,
		);
		expect(present).toEqual(["factory"]);
	});

	it("factory wins over orchestrator for a function that returns an object AND calls", () => {
		const c = fn("createActions", {
			returns: [{ kind: "ExpressionBody", exprKind: "ObjectLiteralExpression", members: [{ name: "run", isFunction: true }] }],
			calls: [{ action: "makeThing" }],
			assignments: [],
		});
		const { candidates } = classifyRoles([c], codeRoles);
		expect(candidates[0].role).toBe("factory");
	});

	it("classifies a pure function (zero calls, no local assignments)", () => {
		const { present } = classifyRoles([fn("toOffset", { calls: [], assignments: [{ local: false }] })], codeRoles);
		expect(present).toEqual(["pureFunction"]);
	});

	it("does NOT classify a function with local assignments as pure", () => {
		const { candidates } = classifyRoles([fn("withAssign", { calls: [], assignments: [{ local: true }] })], codeRoles);
		// No calls either → not an orchestrator either; unclassified.
		expect(candidates[0].role).toBeNull();
	});

	it("classifies an orchestrator (≥1 call, no object return)", () => {
		const { present } = classifyRoles([fn("copyWithSubstitutions", { calls: [{ action: "a" }, { action: "b" }], assignments: [{ local: true }] })], codeRoles);
		expect(present).toEqual(["orchestrator"]);
	});

	it("first matching role in declaration order wins", () => {
		// Matches both factory (object return) and pureFunction? No — pure needs
		// zero calls; give it a call so only factory + orchestrator match.
		const c = fn("dual", {
			returns: [{ kind: "ReturnStatement", exprKind: "ObjectLiteralExpression", members: [{ name: "run", isFunction: true }] }],
			calls: [{ action: "x" }],
			assignments: [],
		});
		const { candidates } = classifyRoles([c], codeRoles);
		expect(candidates[0].role).toBe("factory");
	});

	it("unclassifiable candidates get role null and are excluded from present", () => {
		const { present, candidates } = classifyRoles([fn("mystery", { calls: [], assignments: [{ local: true }] })], codeRoles);
		expect(present).toEqual([]);
		expect(candidates[0].role).toBeNull();
	});

	it("keeps function and variable roles separate (no more kind-split maps)", () => {
		const { roleCtx } = classifyRoles(
			[
				{ kind: { own: { is: "VariableDeclaration" }, initializer: { is: "CallExpression", origin: "t.model" } }, name: "store", line: 1 },
				fn("runThing", { calls: [{ action: "x" }] }),
			],
			codeRoles,
		);
		expect(roleCtx.candidates.find((c) => c.kind.own.is === "VariableDeclaration").role).toBe("storeModel");
		expect(roleCtx.candidates.find((c) => c.kind.own.is === "ArrowFunction").role).toBe("orchestrator");
		expect(roleCtx.present).toEqual(["storeModel", "orchestrator"]);
	});

	it("roles without infer are skipped", () => {
		const roles = { ...codeRoles, noInfer: {} };
		const { present } = classifyRoles([fn("x", { calls: [] })], roles);
		expect(present).toEqual(["pureFunction"]);
	});

	it("classifies a .actions() method as an action but not the bag callback", () => {
		// Mirrors the md-prettify `action` role: a function that WRITES into state it
		// was handed, and whose parent is not the `.actions()` call itself.
		const roles = {
			action: {
				infer: [
					{ kind: { own: { is: { in: fnKinds } } } },
					{ assignments: { length: { gt: 0 } } },
					{ kind: { parent: { is: { notIn: ["CallExpression"] } } } },
				],
			},
			...codeRoles,
		};
		const write = [{ line: 2, target: "self.x", value: "self", param: true, relation: "assign" }];
		const actionMethod = fn("toggleLine", { assignments: write, kind: { own: { is: "MethodDeclaration" }, parent: { is: "ObjectLiteralExpression" } } });
		const bagCallback = fn(null, { assignments: [], kind: { own: { is: "ArrowFunction" }, parent: { is: "CallExpression" } } });
		const { candidates } = classifyRoles([bagCallback, actionMethod], roles);
		expect(candidates.find((c) => c.name === "toggleLine").role).toBe("action");
		// The callback that RETURNS the bag is not an action.
		expect(candidates.find((c) => c.name === null).role).not.toBe("action");
	});

});

describe("classifyRoles — a role may be recognised by what the FILE depends on", () => {
	// "Host adapter, not a helper" is a property of the dependency, not of the
	// folder: the same function is glue wherever it sits, so a misplaced one is
	// still classified (and therefore still reported) instead of being ignored.
	const roles = {
		extensionCode: {
			infer: [{ kind: { own: { is: { in: fnKinds } } } }, { file: { imports: { any: { source: { in: ["vscode", "webstorm"] } } } } }],
		},
		pureFunction: { infer: [{ kind: { own: { is: { in: fnKinds } } } }] },
	};
	const hostFile = { imports: [{ source: "vscode", named: [], line: 1, resolved: null }], path: { dir: "packages/vscode-extension" } };
	const plainFile = { imports: [{ source: "path", named: [], line: 1, resolved: null }], path: { dir: "packages/utils" } };

	it("picks the role whose file filter matches the file", () => {
		const { candidates } = classifyRoles([fn("activate", { file: hostFile })], roles);
		expect(candidates[0].role).toBe("extensionCode");
	});

	it("falls through to the generic role when the file does not touch the host", () => {
		const { candidates } = classifyRoles([fn("capitalise", { file: plainFile })], roles);
		expect(candidates[0].role).toBe("pureFunction");
	});

	it("sees the whole file fact set, not a hand-picked field", () => {
		const archRoles = { inHostDir: { infer: [{ file: { path: { dir: { equals: "packages/vscode-extension" } } } }] } };
		const { candidates } = classifyRoles([fn("anything", { file: hostFile })], archRoles);
		expect(candidates[0].role).toBe("inHostDir");
	});
});

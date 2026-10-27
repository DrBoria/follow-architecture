import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classifyRoles } = require("../../code-roles/classify");

const fnKinds = ["FunctionDeclaration", "FunctionExpression", "ArrowFunction", "MethodDeclaration", "GetAccessor", "SetAccessor"];

// Mirrors the md-prettify role definitions (declaration order = priority).
const codeRoles = {
	storeModel: {
		infer: [
			{ kind: { equals: "VariableDeclaration" } },
			{ initializer: { kind: { in: ["CallExpression", "NewExpression"] }, origin: { equals: "t.model" } } },
		],
	},
	factory: {
		infer: [
			{ kind: { in: fnKinds } },
			{ returns: { some: { exprKind: { equals: "ObjectLiteralExpression" }, members: { some: { isFunction: { equals: true } } } } } },
		],
	},
	pureFunction: {
		infer: [
			{ kind: { in: fnKinds } },
			{ calls: { length: { equals: 0 } } },
			{ assignments: { none: { local: { equals: true } } } },
		],
	},
	orchestrator: {
		infer: [
			{ kind: { in: fnKinds } },
			{ calls: { length: { gt: 0 } } },
		],
	},
};

// Real candidates always carry these list facts (ast.js collects them even
// when empty), so the fixtures mirror that.
const fn = (name, extra = {}) => ({
	kind: "ArrowFunction",
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
			[{ kind: "VariableDeclaration", name: "documentStore", line: 1, initializer: { kind: "CallExpression", origin: "t.model" } }],
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
				{ kind: "VariableDeclaration", name: "store", line: 1, initializer: { kind: "CallExpression", origin: "t.model" } },
				fn("runThing", { calls: [{ action: "x" }] }),
			],
			codeRoles,
		);
		expect(roleCtx.candidates.find((c) => c.kind === "VariableDeclaration").role).toBe("storeModel");
		expect(roleCtx.candidates.find((c) => c.kind === "ArrowFunction").role).toBe("orchestrator");
		expect(roleCtx.present).toEqual(["storeModel", "orchestrator"]);
	});

	it("roles without infer are skipped", () => {
		const roles = { ...codeRoles, noInfer: {} };
		const { present } = classifyRoles([fn("x", { calls: [] })], roles);
		expect(present).toEqual(["pureFunction"]);
	});

	it("classifies a .actions() method as an action but not the bag callback", () => {
		// Mirrors the md-prettify `action` role: calledBy "actions" plus a
		// parentKind that is not the .actions() CallExpression itself.
		const roles = {
			action: {
				infer: [
					{ kind: { in: fnKinds } },
					{ calledBy: { equals: "actions" } },
					{ parentKind: { notIn: ["CallExpression"] } },
				],
			},
			...codeRoles,
		};
		const actionMethod = fn("toggleLine", { kind: "MethodDeclaration", calledBy: "actions", parentKind: "ObjectLiteralExpression" });
		const bagCallback = fn(null, { calledBy: "actions", parentKind: "CallExpression" });
		const { candidates } = classifyRoles([bagCallback, actionMethod], roles);
		expect(candidates.find((c) => c.name === "toggleLine").role).toBe("action");
		// The callback that RETURNS the bag is not an action.
		expect(candidates.find((c) => c.name === null).role).not.toBe("action");
	});
});


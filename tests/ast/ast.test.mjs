import { createRequire } from "node:module";
import { describe, expect, it, beforeAll } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectFileFacts, collectCandidates, importNameModules } = require("../../ast");

let project;

beforeAll(() => {
	project = createTsProject();
});

const factsFor = (code, rel = "a/x.ts", repoFiles) => {
	const files = repoFiles ?? [rel];
	const sf = loadSourceFile(project, rel, code);
	const importMap = importNameModules(sf, ".", {}, files);
	const candidates = collectCandidates(sf, importMap);
	return { sf, facts: collectFileFacts(sf, { rel, repoFiles: files, aliases: {}, repoRoot: ".", candidates }) };
};

// A function-like candidate (not the VariableDeclaration that shares its name).
const fn = (facts, name) => facts.candidates.find((c) => c.name === name && c.kind !== "VariableDeclaration");

const scopeFactsFor = (code, rel = "a/x.ts", scopeAccessors = [{ kind: "call", segments: ["getRoot"] }, { kind: "call", segments: ["getParent"] }]) => {
	const sf = loadSourceFile(project, rel, code);
	const importMap = importNameModules(sf, ".", {}, [rel]);
	const candidates = collectCandidates(sf, importMap);
	return collectFileFacts(sf, { rel, repoFiles: [rel], aliases: {}, repoRoot: ".", candidates, scopeAccessors });
};

describe("ast.collectFileFacts — lines & kinds", () => {
	it("counts lines (split on \\n, trailing newline adds one)", () => {
		const { facts } = factsFor("const a = 1;\nconst b = 2;\n");
		expect(facts.lines).toBe(3);
		const { facts: f2 } = factsFor("const a = 1;\nconst b = 2;");
		expect(f2.lines).toBe(2);
	});

	it("top-level statements are descendants at depth 0", () => {
		const { facts } = factsFor("const a = 1;\nfunction f() {}\nexport class C {}\n");
		const top = facts.descendants.filter((d) => d.depth === 0);
		const kinds = top.map((d) => d.kind);
		expect(kinds).toContain("VariableStatement");
		expect(kinds).toContain("FunctionDeclaration");
		expect(kinds).toContain("ClassDeclaration");
	});
});

describe("ast — candidate facts", () => {
	it("collects function-like candidates with names", () => {
		const { facts } = factsFor("const run = () => 1;\nfunction named() { return 2; }\n");
		const names = facts.candidates.map((c) => c.name);
		expect(names).toContain("run");
		expect(names).toContain("named");
	});

	it("a variable and its arrow initializer both appear as candidates", () => {
		const { facts } = factsFor("const run = () => 1;\n");
		const runs = facts.candidates.filter((c) => c.name === "run");
		expect(runs.map((c) => c.kind).sort()).toEqual(["ArrowFunction", "VariableDeclaration"]);
	});

	it("collects variable declarations with initializer facts", () => {
		const { facts } = factsFor("const store = t.model({});\n");
		const v = facts.candidates.find((c) => c.kind === "VariableDeclaration");
		expect(v).toBeDefined();
		expect(v.name).toBe("store");
		expect(v.initializer.kind).toBe("CallExpression");
		expect(v.initializer.origin).toBe("t.model");
	});

	it("counts calls with origin, action and resolved module", () => {
		const { facts } = factsFor("import { helper } from './helper';\nconst run = () => { helper(); store.doX(); const x = 1; return x; };\n", "a/x.ts", ["a/x.ts", "a/helper.ts"]);
		const c = fn(facts, "run");
		expect(c.calls).toHaveLength(2);
		const bare = c.calls.find((x) => x.action === "helper");
		expect(bare.origin).toBe("helper");
		expect(bare.module).toBe("a/helper.ts");
		const member = c.calls.find((x) => x.action === "doX");
		expect(member.origin).toBe("store");
	});

	it("marks local assignments", () => {
		const { facts } = factsFor("const run = () => { const a = 1; a = 2; return a; };\n");
		const c = fn(facts, "run");
		expect(c.assignments.some((a) => a.local)).toBe(true);
	});

	it("no calls / no assignments for a bare function", () => {
		const { facts } = factsFor("const pure = () => 42;\n");
		const c = fn(facts, "pure");
		expect(c.calls).toEqual([]);
		expect(c.assignments).toEqual([]);
	});

	it("assigning to a property of a local is a local assignment", () => {
		const { facts } = factsFor("const run = () => { const state = { n: 0 }; state.n = 1; return state; };\n");
		const c = fn(facts, "run");
		expect(c.assignments.some((a) => a.local && /state/.test(a.target))).toBe(true);
	});

	it("a method shorthand inside .actions((self) => ({...})) has calledBy 'actions'", () => {
		const { facts } = factsFor("const m = t.model({}).actions((self) => ({ doX() { self.n = 1; } }));\n");
		const c = facts.candidates.find((x) => x.name === "doX");
		expect(c).toBeDefined();
		expect(c.calledBy).toBe("actions");
	});
});

describe("ast — returns facts", () => {
	it("block body: ReturnStatement with value", () => {
		const { facts } = factsFor("function f() { return { a: 1 }; }\n");
		const c = fn(facts, "f");
		expect(c.returns).toHaveLength(1);
		expect(c.returns[0].kind).toBe("ReturnStatement");
		expect(c.returns[0].exprKind).toBe("ObjectLiteralExpression");
		expect(c.hasReturn).toBe(true);
	});

	it("expression body: ObjectLiteralExpression with paren unwrap, members as raw data", () => {
		const { facts } = factsFor("const make = () => ({ run: () => 1, n: 0 });\n");
		const c = fn(facts, "make");
		const body = c.returns.find((r) => r.kind === "ExpressionBody");
		expect(body).toBeDefined();
		expect(body.exprKind).toBe("ObjectLiteralExpression");
		// `members` is raw data — "has methods" is a query over it, not a fact.
		expect(body.members.map((m) => m.name).sort()).toEqual(["n", "run"]);
		expect(body.members.find((m) => m.name === "run").isFunction).toBe(true);
		expect(body.members.find((m) => m.name === "n").isFunction).toBe(false);
	});

	it("expression body without parens", () => {
		const { facts } = factsFor("const make = () => 42;\n");
		const c = fn(facts, "make");
		const body = c.returns.find((r) => r.kind === "ExpressionBody");
		expect(body.exprKind).toBe("NumericLiteral");
		expect(body.members).toEqual([]);
	});

	it("function without a return", () => {
		const { facts } = factsFor("function f() { const a = 1; }\n");
		const c = fn(facts, "f");
		expect(c.returns).toEqual([]);
	});

	it("returns.origin: the leftmost base of a chained call", () => {
		const { facts } = factsFor("function create() { return t.model({}).actions((s) => ({})); }\n");
		const c = fn(facts, "create");
		expect(c.returns[0].origin).toBe("t.model");
	});

	it("returns.origin: a plain identifier return is its own origin (no call)", () => {
		const { facts } = factsFor("function make() { return model; }\n");
		const c = fn(facts, "make");
		expect(c.returns[0].origin).toBe("model");
		expect(c.returns[0].exprKind).toBe("Identifier");
	});

	it("returns.origin: an expression body returning a constructor call", () => {
		const { facts } = factsFor("const create = () => t.model({});\n");
		const c = fn(facts, "create");
		const body = c.returns.find((r) => r.kind === "ExpressionBody");
		expect(body.origin).toBe("t.model");
	});

	it("returns.origin: a new-expression chain and a property-access chain", () => {
		const { facts } = factsFor("const a = () => new Store({}).create();\nfunction b() { return a.b.c(); }\nconst d = () => arr[0].run();\n");
		expect(fn(facts, "a").returns.find((r) => r.kind === "ExpressionBody").origin).toBe("new Store");
		expect(fn(facts, "b").returns[0].origin).toBe("a.b.c");
		expect(fn(facts, "d").returns.find((r) => r.kind === "ExpressionBody").origin).toBe("arr[0]");
	});

	it("returns.origin: null for a bare return and a non-call value", () => {
		const { facts } = factsFor("function a() { return; }\nconst b = () => 42;\n");
		const a = fn(facts, "a");
		expect(a.returns[0].origin).toBeNull();
		const b = fn(facts, "b");
		expect(b.returns.find((r) => r.kind === "ExpressionBody").origin).toBeNull();
	});
});

describe("ast — nesting", () => {
	it("marks nested functions with parentName", () => {
		const { facts } = factsFor("function outer() { function inner() { return 1; } return inner(); }\n");
		const inner = fn(facts, "inner");
		expect(inner.parentName).toBe("outer");
		expect(inner.moduleScope).toBe(false);
		// The nested flag lives on the descendant facts.
		const outer = fn(facts, "outer");
		expect(outer.descendants.some((d) => d.kind === "FunctionDeclaration" && d.nested)).toBe(true);
	});

	it("top-level functions are module-scope", () => {
		const { facts } = factsFor("function outer() { return 1; }\n");
		const c = fn(facts, "outer");
		expect(c.moduleScope).toBe(true);
	});
});

describe("ast — module scope variables (candidates with moduleScope: true)", () => {
	it("collects module-scope mutable variables", () => {
		const { facts } = factsFor("let counter = 0;\nconst frozen = 1;\n");
		const vars = facts.candidates.filter((c) => c.moduleScope && c.kind === "VariableDeclaration");
		expect(vars.some((v) => v.name === "counter" && v.mutable)).toBe(true);
		expect(vars.some((v) => v.name === "frozen" && !v.mutable)).toBe(true);
	});

	it("records the initializer origin (constructor for `new X`, kind otherwise)", () => {
		const { facts } = factsFor("const cache = new Map();\nconst set = new Set();\nconst obj = { a: 1 };\n");
		const byName = Object.fromEntries(
			facts.candidates.filter((c) => c.moduleScope && c.kind === "VariableDeclaration").map((v) => [v.name, v]),
		);
		expect(byName.cache.initializer.origin).toBe("new Map");
		expect(byName.set.initializer.origin).toBe("new Set");
		expect(byName.obj.initializer.kind).toBe("ObjectLiteralExpression");
	});
});

// Facts that depend on the folder's sibling files: pass the whole folder.
const folderFactsFor = (files, rel) => {
	const repoFiles = Object.keys(files);
	const sf = loadSourceFile(project, rel, files[rel]);
	const importMap = importNameModules(sf, ".", {}, repoFiles);
	const candidates = collectCandidates(sf, importMap);
	return collectFileFacts(sf, { rel, repoFiles, aliases: {}, repoRoot: ".", candidates });
};

describe("ast — path fact", () => {
	it("splits dir and fileName (basename without extension)", () => {
		const { facts } = factsFor("const a = 1;\n", "apps/backend/utils/host-types.ts");
		expect(facts.path.dir).toBe("apps/backend/utils");
		expect(facts.path.fileName).toBe("host-types");
	});

	it("records folder siblings: filesPerFolder, folderFiles, subfolders", () => {
		const facts = folderFactsFor(
			{
				"a/text-mate.ts": "",
				"a/other.ts": "",
				"a/sub/inner.ts": "",
			},
			"a/text-mate.ts",
		);
		expect(facts.path.filesPerFolder).toBe(2);
		expect(facts.path.folderFiles).toEqual(["other", "text-mate"]);
		expect(facts.path.subfolders).toEqual(["sub"]);
	});
});

describe("ast — path.sharedPrefixes fact", () => {
	it("finds leading dash-boundary stems shared by several siblings", () => {
		const facts = folderFactsFor(
			{
				"a/text-mate.ts": "",
				"a/text-mate-grammar.ts": "",
				"a/text-mate-resolve.ts": "",
				"a/other.ts": "",
			},
			"a/text-mate.ts",
		);
		const byStem = Object.fromEntries(facts.path.sharedPrefixes.map((p) => [p.stem, p]));
		// `text` is shared by all three text-mate files. `text-mate` is a stem
		// only of the two longer names (a stem must be followed by a dash).
		expect(byStem["text"].count).toBe(3);
		expect(byStem["text-mate"].count).toBe(2);
		// A stem shared by only one file is not recorded.
		expect(byStem["other"]).toBeUndefined();
	});

	it("is empty when no stem is shared", () => {
		const facts = folderFactsFor(
			{
				"a/alpha.ts": "",
				"a/beta.ts": "",
			},
			"a/alpha.ts",
		);
		expect(facts.path.sharedPrefixes).toEqual([]);
	});
});

describe("ast — exports fact", () => {
	it("records named, namespace and star exports", () => {
		const { facts } = factsFor(
			"import { x } from './mod';\nexport { x, y as z } from './mod';\nexport * as ns from './ns';\nexport * from './all';\n",
			"a/x.ts",
			["a/x.ts", "a/mod.ts", "a/ns.ts", "a/all.ts"],
		);
		expect(facts.exports).toHaveLength(3);
		const named = facts.exports.find((e) => e.kind === "named");
		expect(named.named).toEqual(["x", "z"]);
		expect(named.from).toBe("a/mod.ts");
		const ns = facts.exports.find((e) => e.kind === "namespace");
		expect(ns.named).toEqual(["ns"]);
		expect(ns.from).toBe("a/ns.ts");
		expect(facts.exports.find((e) => e.kind === "star")).toBeDefined();
	});
});

describe("ast — import facts", () => {
	it("records imports with source and local binding names", () => {
		const { facts } = factsFor("import { a, b as c } from './mod';\nimport def from './other';\n");
		expect(facts.imports.length).toBe(2);
		const named = facts.imports.find((i) => i.source === "./mod");
		// `b as c` → local binding "c", not the original "b".
		expect(named.named).toEqual(["a", "c"]);
		const def = facts.imports.find((i) => i.source === "./other");
		expect(def.defaultName).toBe("def");
	});
});

describe("ast — candidate kinds", () => {
	it("collects function-like and variable-declaration candidates", () => {
		const { facts } = factsFor("function f() {}\nconst g = () => 1;\nconst h = { a: 1 };\n");
		const kinds = facts.candidates.map((c) => c.kind);
		expect(kinds).toContain("FunctionDeclaration");
		expect(kinds).toContain("ArrowFunction");
		expect(kinds).toContain("VariableDeclaration");
	});

	it("marks exported candidates", () => {
		const { facts } = factsFor("export function f() { return 1; }\n");
		const c = facts.candidates.find((k) => k.name === "f");
		expect(c.exported).toBe(true);
	});
});

describe("ast — scopeAccesses fact", () => {
	it("records property-access chains rooted at a configured scope accessor", () => {
		const code = `
import { getRoot } from "mobx-state-tree";
const f = (self) => {
	getRoot(self).grammar.loadGrammar();
	getRoot(self).reparse.schedule();
};
`;
		const facts = scopeFactsFor(code);
		const byChain = Object.fromEntries(facts.scopeAccesses.map((s) => [s.chain.join("."), s]));
		// Every level of the chain is a fact (both the bare store ref and the method call).
		expect(byChain["grammar"]).toBeDefined();
		expect(byChain["grammar.loadGrammar"]).toBeDefined();
		expect(byChain["reparse.schedule"]).toBeDefined();
		expect(byChain["grammar"].via).toBe("getRoot");
		expect(byChain["grammar"].line).toBe(4);
		expect(byChain["reparse.schedule"].line).toBe(5);
	});

	it("records getParent chains with via = the accessor as written", () => {
		const code = `
const f = (self) => {
	getParent(self).sibling.doThing();
};
`;
		const facts = scopeFactsFor(code);
		expect(facts.scopeAccesses).toContainEqual(expect.objectContaining({ via: "getParent", chain: ["sibling", "doThing"] }));
	});

	it("ignores chains whose base is not a configured accessor", () => {
		const code = `
const f = (self) => {
	self.other.doThing();
	lookup().x.y();
};
`;
		const facts = scopeFactsFor(code);
		expect(facts.scopeAccesses).toEqual([]);
	});

	it("respects the accessor list — unconfigured accessors are not recorded", () => {
		const code = `
const f = (self) => {
	getRoot(self).a.b();
	fromStore(self).c.d();
};
`;
		const facts = scopeFactsFor(code, "a/x.ts", [{ kind: "call", segments: ["getRoot"] }]);
		// the outermost (method-call) access is recorded first, the bare ref after
		expect(facts.scopeAccesses.map((s) => s.chain.join("."))).toEqual(["a.b", "a"]);
	});

	it("is empty when no accessors are configured", () => {
		const code = `
const f = (self) => {
	getRoot(self).a.b();
};
`;
		const facts = scopeFactsFor(code, "a/x.ts", []);
		expect(facts.scopeAccesses).toEqual([]);
	});
});


import { createRequire } from "node:module";
import { describe, expect, it, beforeAll } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectFileFacts, collectCandidates, importNameModules } = require("../../entities/ast");

let project;

beforeAll(() => {
	project = createTsProject();
});

const factsFor = (code, rel = "a/x.ts", repoFiles) => {
	const files = repoFiles ?? [rel];
	const sf = loadSourceFile(project, rel, code);
	const importMap = importNameModules(sf, ".", {}, files);
	const candidates = collectCandidates(sf, importMap, rel, ".");
	return { sf, facts: collectFileFacts(sf, { rel, repoFiles: files, aliases: {}, repoRoot: ".", candidates }) };
};

// A function-like candidate (not the VariableDeclaration that shares its name).
const fn = (facts, name) => facts.candidates.find((c) => c.name === name && c.kind.own.is !== "VariableDeclaration");

describe("ast.collectFileFacts — lines & kinds", () => {
	it("lines is ONE array: first line, everything inside, last line", () => {
		const { facts } = factsFor("const a = 1;\nconst b = 2;\n");
		expect(facts.lines).toEqual([1, 2, 3]);
		const { facts: f2 } = factsFor("const a = 1;\nconst b = 2;");
		expect(f2.lines).toEqual([1, 2]);
	});

	it("top-level statements are descendants at depth 0", () => {
		const { facts } = factsFor("const a = 1;\nfunction f() {}\nexport class C {}\n");
		const top = facts.kind.descendants.filter((d) => d.depth === 0);
		const kinds = top.map((d) => d.is);
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
		expect(runs.map((c) => c.kind.own.is).sort()).toEqual(["ArrowFunction", "VariableDeclaration"]);
	});

	it("collects variable declarations with initializer facts", () => {
		const { facts } = factsFor("const store = t.model({});\n");
		const v = facts.candidates.find((c) => c.kind.own.is === "VariableDeclaration");
		expect(v).toBeDefined();
		expect(v.name).toBe("store");
		expect(v.kind.initializer.is).toBe("CallExpression");
		expect(v.kind.initializer.origin).toBe("t.model");
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

	// A chain broken across lines is the SAME callee. The facts are compared to
	// what the architecture writes (`origin: { equals: "t.model" }`), so the
	// source formatting must not leak into the value: an origin read as
	// "t\n\t.model" made every multi-line `t.model(…)` miss its role.
	it("origin does not depend on how the chain is laid out", () => {
		const oneLine = factsFor("const store = t.model('X', {});\n").facts.candidates.find((c) => c.kind.own.is === "VariableDeclaration");
		const wrapped = factsFor("const store = t\n\t.model('X', {})\n\t.volatile(() => ({}));\n").facts.candidates.find((c) => c.kind.own.is === "VariableDeclaration");
		expect(wrapped.kind.initializer.origin).toBe("t.model");
		expect(wrapped.kind.initializer.origin).toBe(oneLine.kind.initializer.origin);
	});

	it("call origin and action do not depend on the layout either", () => {
		const { facts } = factsFor("const run = () => t\n\t.model('X', {});\n");
		const c = fn(facts, "run");
		expect(c.calls[0].origin).toBe("t");
		expect(c.calls[0].action).toBe("model");
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

	it("a method shorthand inside .actions((self) => ({...})) is a candidate with its own lines", () => {
		const { facts } = factsFor("const m = t.model({}).actions((self) => ({ doX() { self.n = 1; } }));\n");
		const c = facts.candidates.find((x) => x.name === "doX");
		expect(c).toBeDefined();
		expect(c.lines[0]).toBe(1);
		// The callback it lives in is anonymous, so no NAMED piece encloses it.
		expect(c.location.piece).toBe(null);
	});
});

describe("ast — body shape", () => {
	it("an empty body holds nothing but the Block — no action at all", () => {
		const { facts } = factsFor(
			"function empty() {}\nconst expr = () => 1;\nconst block = () => { a(); b(); };\ndeclare function noBody(): void;\n",
		);
		expect(fn(facts, "empty").kind.descendants.map((d) => d.is).filter((is) => !is.endsWith("Keyword"))).toEqual(["Block"]);
		expect(fn(facts, "empty").calls).toEqual([]);
		expect(fn(facts, "expr").calls).toEqual([]);
		expect(fn(facts, "block").calls).toHaveLength(2);
		expect(fn(facts, "noBody").calls).toEqual([]);
		expect(fn(facts, "noBody").returns).toEqual([]);
	});
});

describe("ast — returns facts", () => {
	it("block body: ReturnStatement with value", () => {
		const { facts } = factsFor("function f() { return { a: 1 }; }\n");
		const c = fn(facts, "f");
		expect(c.returns).toHaveLength(1);
		expect(c.returns[0].kind).toBe("ReturnStatement");
		expect(c.returns[0].exprKind).toBe("ObjectLiteralExpression");
	});

	it("expression body: ObjectLiteralExpression with paren unwrap, members as raw data", () => {
		const { facts } = factsFor("const make = () => ({ run: () => 1, n: 0 });\n");
		const c = fn(facts, "make");
		const body = c.returns.find((r) => r.kind === "ExpressionBody");
		expect(body).toBeDefined();
		expect(body.exprKind).toBe("ObjectLiteralExpression");
		// `members` is raw data — "has methods" is a query over it, not a fact.
		expect(body.members.map((m) => m.name).sort()).toEqual(["n", "run"]);
		// The member's KIND is the data: "has methods" is asked by the rule.
		expect(body.members.find((m) => m.name === "run").is).toBe("PropertyAssignment");
		expect(body.members.find((m) => m.name === "n").is).toBe("PropertyAssignment");
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
	it("records the piece a nested function sits in", () => {
		const { facts } = factsFor("function outer() { function inner() { return 1; } return inner(); }\n");
		const inner = fn(facts, "inner");
		expect(inner.location.piece).toBe("outer");
		expect(inner.kind.ancestors.some((a) => a.is === "FunctionDeclaration")).toBe(true);
		// The nested flag lives on the descendant facts.
		const outer = fn(facts, "outer");
		expect(outer.kind.descendants.some((d) => d.is === "FunctionDeclaration" && d.depth > 0)).toBe(true);
	});

	it("top-level functions are module-scope", () => {
		const { facts } = factsFor("function outer() { return 1; }\n");
		const c = fn(facts, "outer");
		expect(c.location.piece).toBe(null);
		expect(c.kind.ancestors.some((a) => a.is === "FunctionDeclaration")).toBe(false);
	});
});

describe("ast — module scope variables (candidates with piece: null)", () => {
	it("collects module-scope variables and whether the binding may change", () => {
		const { facts } = factsFor("let counter = 0;\nconst frozen = 1;\n");
		const vars = facts.candidates.filter((c) => c.location.piece === null && c.kind.own.is === "VariableDeclaration");
		expect(vars.some((v) => v.name === "counter" && v.mutable === true)).toBe(true);
		expect(vars.some((v) => v.name === "frozen" && v.mutable === false)).toBe(true);
	});

	it("records the initializer origin (constructor for `new X`, kind otherwise)", () => {
		const { facts } = factsFor("const cache = new Map();\nconst set = new Set();\nconst obj = { a: 1 };\n");
		const byName = Object.fromEntries(
			facts.candidates.filter((c) => c.location.piece === null && c.kind.own.is === "VariableDeclaration").map((v) => [v.name, v]),
		);
		expect(byName.cache.kind.initializer.origin).toBe("new Map");
		expect(byName.set.kind.initializer.origin).toBe("new Set");
		expect(byName.obj.kind.initializer.is).toBe("ObjectLiteralExpression");
	});
});

// Facts that depend on the folder's sibling files: pass the whole folder.
const folderFactsFor = (files, rel) => {
	const repoFiles = Object.keys(files);
	const sf = loadSourceFile(project, rel, files[rel]);
	const importMap = importNameModules(sf, ".", {}, repoFiles);
	const candidates = collectCandidates(sf, importMap, rel, ".");
	return collectFileFacts(sf, { rel, repoFiles, aliases: {}, repoRoot: ".", candidates });
};

describe("ast — path fact", () => {
	it("splits dir and fileName (basename without extension)", () => {
		const { facts } = factsFor("const a = 1;\n", "apps/backend/utils/host-types.ts");
		expect(facts.location.segments.slice(0, -1).join("/")).toBe("apps/backend/utils");
		expect(facts.location.fileName).toBe("host-types");
	});

	it("records the folder's own files — the count is files.length", () => {
		const facts = folderFactsFor(
			{
				"a/text-mate.ts": "",
				"a/other.ts": "",
				"a/sub/inner.ts": "",
			},
			"a/text-mate.ts",
		);
		// Every entry is a PLACE: the name is read off it, the count off the list.
		expect(facts.location.files.map((f) => f.fileName)).toEqual(["other", "text-mate"]);
		expect(facts.location.files).toHaveLength(2);
		// A file one folder deeper is not a neighbour.
		expect(facts.location.files.map((f) => f.path)).toEqual(["a/other.ts", "a/text-mate.ts"]);
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
		const named = facts.exports.find((e) => e.form === "named");
		expect(named.named).toEqual(["x", "z"]);
		expect(named.from).toBe("a/mod.ts");
		const ns = facts.exports.find((e) => e.form === "namespace");
		expect(ns.named).toEqual(["ns"]);
		expect(ns.from).toBe("a/ns.ts");
		expect(facts.exports.find((e) => e.form === "star")).toBeDefined();
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
		const kinds = facts.candidates.map((c) => c.kind.own.is);
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

describe("ast.collectFileFacts — before classification", () => {
	// The pipeline asks for the file facts BEFORE it knows any roles: a role may
	// be recognised by what the file depends on, not only by its own shape. Only
	// `candidates` / `roles` need the classification, so the facts are complete
	// without them — that is what makes one collector enough for both readers.
	it("is complete with no candidates, and gets its candidates later", () => {
		const sf = loadSourceFile(project, "a/x.ts", "import * as vscode from 'vscode';\nexport const go = () => 1;\n");
		const early = collectFileFacts(sf, { rel: "a/x.ts", repoFiles: ["a/x.ts"], aliases: {}, repoRoot: ".", candidates: [] });
		expect(early.candidates).toEqual([]);
		expect(early.roles).toEqual([]);
		// Everything a role may want to filter on is already there.
		expect(early.imports.map((i) => i.source)).toEqual(["vscode"]);
		expect(early.location.segments).toEqual(["a", "x.ts"]);
		expect(early.lines).toEqual([1, 2, 3]);
		expect(early.roles).toEqual([]);
	});
});

describe("ast — one fact per question", () => {
	// The fact set is a CONTRACT: every fact answers ONE question, and a question
	// already answered by an action (`call`, `assign`, `declare`, `export`) has no
	// second field. Pinned so the old duplicates cannot creep back.
	// `file` and `role` are attached by the pipeline (classification), not here.
	const CANDIDATE_FACTS = ["assignments", "branches", "calls", "exported", "implementations", "kind", "lines", "location", "mutable", "name", "parameters", "references", "returns"];

	it("a candidate is location + lines + parameters + actions, and nothing else", () => {
		const { facts } = factsFor("export const run = (state: { x: number }) => { state.x = 1; return 1; };\n");
		const c = fn(facts, "run");

		expect(Object.keys(c).sort()).toEqual(CANDIDATE_FACTS);
		// `line` and `lines` are one thing: the array says where it starts.
		expect(c.lines[0]).toBe(1);
		// `parentName`, `calledBy`, `modifiers`, `declarationToken`, `bodyStatements`,
		// `mutatedParams`, `callModules`, `writes`, `mutations` are gone: each was a
		// second spelling of `piece`, a `call`, an `export`, a `declare` or a write.
		for (const gone of ["line", "path", "piece", "descendants", "parentName", "calledBy", "modifiers", "declarationToken", "bodyStatements", "mutatedParams", "callModules", "writes", "mutations"]) {
			expect(c).not.toHaveProperty(gone);
		}
	});

	it("a comment is a candidate: place, lines, kind and its text", () => {
		const { facts } = factsFor("/** @param {number} a why a */\nexport function run(a: number) {\n\t/* inside */\n\treturn 1;\n}\n");
		const comments = facts.candidates.filter((c) => c.text != null);

		// The three forms the language has, each with the lines it covers — a
		// comment that spans lines is one comment, and `lines` says so.
		expect(comments.map((c) => [c.kind.own.is, c.lines])).toEqual([
			["JSDocComment", [1]],
			["MultiLineCommentTrivia", [3]],
		]);
		// Every fact a candidate has, plus what only a comment has: its text.
		expect(Object.keys(comments[0]).sort()).toEqual([...CANDIDATE_FACTS, "text"].sort());
		// A doc block ABOVE a declaration is not inside it (it starts before the
		// declaration does); the block in the body is, and `piece` names the function.
		expect(comments.map((c) => c.location.piece)).toEqual([null, "run"]);
		// The INSIDE of a doc block is the parser's own subtree — the tags are nodes
		// like any other, told apart by `is`, so no rule needs a list of tag names.
		expect(comments[0].kind.descendants.map((d) => [d.is, d.name]).filter(([is]) => is === "JSDocParameterTag")).toEqual([["JSDocParameterTag", "a"]]);
		// A plain block comment is a node with nothing inside it — an empty subtree,
		// not a missing one.
		expect(comments[1].kind.descendants).toEqual([]);
	});

	it("a write carries its own classification: mutate, assign, or nothing", () => {
		const { facts } = factsFor(
			"import { store } from './s';\nconst run = (state: { x: number }) => { const out = { n: 0 }; out.n = 1; state.x = 2; store.y = 3; this.z = 4; };\n",
			"a/x.ts",
			["a/x.ts", "a/s.ts"],
		);
		const byTarget = Object.fromEntries(fn(facts, "run").assignments.map((a) => [a.target, a.relation]));
		expect(byTarget["out.n"]).toBe(null);
		expect(byTarget["state.x"]).toBe("assign");
		expect(byTarget["store.y"]).toBe("mutate");
		expect(byTarget["this.z"]).toBe("mutate");
	});

	it("a file's imports and exports are ONE list each, told apart by `form`", () => {
		const { facts } = factsFor(
			'import a from "./a";\nconst b = require("./b");\nconst c = import("./c");\nexport * as ns from "./ns";\nmodule.exports.r = 1;\n',
			"a/x.ts",
			["a/x.ts", "a/a.ts", "a/b.ts", "a/c.ts", "a/ns.ts"],
		);
		expect(facts.imports.map((i) => i.form).sort()).toEqual(["dynamic", "require", "statement"]);
		expect(facts.exports.map((e) => e.form).sort()).toEqual(["commonjs", "namespace"]);
		// A `require` inside a function belongs to that piece; a statement to the file.
		expect(facts.imports.find((i) => i.form === "statement").piece).toBe(null);
	});

	it("everything about the file's place in the tree is `location`, and the count is files.length", () => {
		const facts = folderFactsFor({ "a/x.ts": "", "a/y.ts": "", "a/deep/z.ts": "" }, "a/x.ts");
		// The place is described the way the DOM describes a node: its own names, its
		// parts, its folder, its parent, its neighbours and its position among them —
		// one fact, nothing beside it.
		// Only what cannot be read off the list: the path, its segments, the
		// name's extensions and words, and the neighbours (each a place).
		expect(Object.keys(facts.location).sort()).toEqual([
			"exts", "fileName", "files", "path", "segments", "siblings", "words",
		]);
		expect(facts.location.path).toBe("a/x.ts");
		expect(facts.location.segments).toEqual(["a", "x.ts"]);
		// The folder is a segment, not a stored string; the count is `length`.
		expect(facts.location.segments.at(-1)).toBe("x.ts");
		expect(facts.location.files.map((f) => f.path)).toEqual(["a/x.ts", "a/y.ts"]);
		expect(facts.location.siblings.map((f) => f.fileName)).toEqual(["y"]);
		expect(facts.location.fileName).toBe("x");
		expect(facts.location.exts).toEqual([".ts"]);
	});
});

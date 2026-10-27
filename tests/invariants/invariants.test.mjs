import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { normalizeInvariant } = require("../../invariants/normalize");
const { checkInvariants } = require("../../invariants/index");

// A finding sink: findingFrom is called with (item, rule, rel, key, vars).
const findingFrom = (item, rule, rel, key, vars) => ({ item, rule, rel, key, vars });

const ctxOf = (rel, facts) => ({
	rel,
	dir: rel.split("/").slice(0, -1).join("/"),
	basename: rel.split("/").pop(),
	facts,
});

const run = (raw, ctx) => {
	const out = [];
	checkInvariants([normalizeInvariant(raw)], ctx, out, findingFrom);
	return out;
};

describe("invariants — gates", () => {
	it("where glob gates the invariant", () => {
		const inv = { id: "x", where: ["**/store.ts"], forbid: [{ lines: { gt: 0 } }], report: "too big" };
		expect(run(inv, ctxOf("a/store.ts", { lines: 10 }))).toHaveLength(1);
		expect(run(inv, ctxOf("a/other.ts", { lines: 10 }))).toHaveLength(0);
	});

	it("where supports naming-convention placeholders", () => {
		const inv = { id: "x", where: ["apps/backend/{kebab-case}/*.ts"], forbid: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("apps/backend/document/model.ts", { lines: 10 }))).toHaveLength(1);
		expect(run(inv, ctxOf("apps/backend/Document/model.ts", { lines: 10 }))).toHaveLength(0);
	});

	it("except glob skips the file", () => {
		const inv = { id: "x", except: ["**/generated/**"], forbid: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("a/generated/x.ts", { lines: 10 }))).toHaveLength(0);
		expect(run(inv, ctxOf("a/hand/x.ts", { lines: 10 }))).toHaveLength(1);
	});

	it("when gates on present roles (plain filter over file facts)", () => {
		const inv = { id: "x", when: { roles: { some: { equals: "orchestrator" } } }, forbid: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 10, roles: ["orchestrator"] }))).toHaveLength(1);
		expect(run(inv, ctxOf("a/x.ts", { lines: 10, roles: [] }))).toHaveLength(0);
	});

	it("queries the scopeAccesses file fact through the unified interface (via + chain)", () => {
		const facts = {
			lines: 10,
			scopeAccesses: [
				{ via: "getRoot", chain: ["grammar"], line: 4 },
				{ via: "getRoot", chain: ["grammar", "loadGrammar"], line: 4 },
				{ via: "getParent", chain: ["sibling", "doThing"], line: 6 },
			],
		};
		// a method call (2+ chain segments) through getRoot
		const inv = { id: "x", forbid: [{ scopeAccesses: { some: { via: { equals: "getRoot" }, chain: { length: { gte: 2 } } } } } ] };
		expect(run(inv, ctxOf("a/x.ts", facts))).toHaveLength(1);
		// `contains` on the chain list: any access touching `loadGrammar`
		const inv2 = { id: "x", forbid: [{ scopeAccesses: { some: { chain: { contains: "loadGrammar" } } } }] };
		expect(run(inv2, ctxOf("a/x.ts", facts))).toHaveLength(1);
		// no match → no finding
		const inv3 = { id: "x", forbid: [{ scopeAccesses: { some: { via: { equals: "getGlobal" } } } }] };
		expect(run(inv3, ctxOf("a/x.ts", facts))).toHaveLength(0);
		// bare store ref (length 1) does not satisfy the method-call filter
		const bare = { lines: 10, scopeAccesses: [{ via: "getRoot", chain: ["grammar"], line: 4 }] };
		expect(run(inv, ctxOf("a/x.ts", bare))).toHaveLength(0);
	});

	it("when gates on nesting via parentRole", () => {
		const facts = {
			lines: 10,
			roles: ["orchestrator", "pureFunction"],
			candidates: [
				{ name: "outer", role: "orchestrator", parentRole: null },
				{ name: "inner", role: "pureFunction", parentRole: "orchestrator" },
			],
		};
		const inv = { id: "x", when: { candidates: { some: { role: { equals: "pureFunction" }, parentRole: { equals: "orchestrator" } } } }, forbid: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("a/x.ts", facts))).toHaveLength(1);
		expect(run(inv, ctxOf("a/x.ts", { lines: 10, roles: [], candidates: [{ name: "inner", role: "pureFunction", parentRole: null }] }))).toHaveLength(0);
	});
});

describe("invariants — checks", () => {
	it("forbid fires when the file facts match", () => {
		const inv = { id: "big", forbid: [{ lines: { gt: 200 } }], report: "{lines} lines" };
		const out = run(inv, ctxOf("a/x.ts", { lines: 300 }));
		expect(out).toHaveLength(1);
		expect(out[0].key).toBe("invariant:big:forbid");
		expect(out[0].vars.lines).toBe(300);
	});

	it("forbid is silent when the facts do not match", () => {
		const inv = { id: "big", forbid: [{ lines: { gt: 200 } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 100 }))).toHaveLength(0);
	});

	it("forbid on candidate facts reports the candidate's line and name", () => {
		const inv = { id: "naming", forbid: [{ name: { endsWith: "_" } }], report: "bad name {what}" };
		const facts = { lines: 10, candidates: [{ name: "bad_", line: 7, kind: "FunctionDeclaration" }] };
		const out = run(inv, ctxOf("a/x.ts", facts));
		expect(out).toHaveLength(1);
		expect(out[0].vars.what).toBe("bad_");
	});

	it("candidate filter vs file filter: a filter with a file-level key is file-level", () => {
		// `lines` is a FILE_FACT_KEY, so this is a file-level forbid even
		// though it could look candidate-shaped.
		const inv = { id: "x", forbid: [{ lines: { gt: 5 } }] };
		const facts = { lines: 3, candidates: [{ lines: 9, name: "c" }] };
		expect(run(inv, ctxOf("a/x.ts", facts))).toHaveLength(0);
	});

	it("must fires when the facts do NOT match", () => {
		const inv = { id: "x", must: [{ lines: { gt: 5 } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 3 }))).toHaveLength(1);
		expect(run(inv, ctxOf("a/x.ts", { lines: 9 }))).toHaveLength(0);
	});

	it("assert fires when the filter does not match", () => {
		const inv = { id: "x", assert: { lines: { gt: 5 } } };
		expect(run(inv, ctxOf("a/x.ts", { lines: 3 }))).toHaveLength(1);
		expect(run(inv, ctxOf("a/x.ts", { lines: 9 }))).toHaveLength(0);
	});

	it("an invariant with no checks is its own finding when it passes the gates", () => {
		const facts = {
			lines: 10,
			roles: ["orchestrator", "pureFunction"],
			candidates: [
				{ name: "outer", role: "orchestrator", parentRole: null },
				{ name: "inner", role: "pureFunction", parentRole: "orchestrator" },
			],
		};
		const inv = { id: "nested", when: { candidates: { some: { role: { equals: "pureFunction" }, parentRole: { equals: "orchestrator" } } } }, report: "nested pure function" };
		const out = run(inv, ctxOf("a/x.ts", facts));
		expect(out).toHaveLength(1);
		expect(out[0].key).toBe("root:nested");
	});

	it("children are checked recursively", () => {
		const inv = {
			id: "parent",
			report: "p",
			children: [{ id: "child", forbid: [{ lines: { gt: 0 } }], report: "c" }],
		};
		const out = run(inv, ctxOf("a/x.ts", { lines: 1 }));
		// The parent has no checks of its own, so with a report it is its own
		// finding; the child's forbid fires on top.
		expect(out.map((f) => f.key)).toEqual(["root:parent", "invariant:child:forbid"]);
	});

	it("report variables include scalar file facts", () => {
		const inv = { id: "x", forbid: [{ lines: { gt: 0 } }], report: "{lines} lines in {basename}" };
		const out = run(inv, ctxOf("a/x.ts", { lines: 42, folder: "a" }));
		expect(out[0].vars.lines).toBe(42);
		expect(out[0].vars.basename).toBe("x.ts");
	});

	it("forbids re-exports: any export with a set `from` (named, namespace, star)", () => {
		const inv = { id: "no-re-exports", where: ["apps/backend/**/*.ts"], except: ["apps/backend/test/**"], forbid: [{ exports: { some: { from: { isSet: true } } } }] };
		// a plain export (no `from`) is fine
		const plain = { lines: 5, exports: [{ kind: "named", named: ["x"], from: null, source: null, line: 1 }] };
		expect(run(inv, ctxOf("apps/backend/a/x.ts", plain))).toHaveLength(0);
		// a named re-export (`export { x } from "./mod"`) is flagged
		const named = { lines: 5, exports: [{ kind: "named", named: ["x"], from: "apps/backend/a/mod.ts", source: "./mod", line: 2 }] };
		expect(run(inv, ctxOf("apps/backend/a/x.ts", named))).toHaveLength(1);
		// a star re-export (`export * from "./all"`) is flagged
		const star = { lines: 5, exports: [{ kind: "star", named: [], from: "apps/backend/a/all.ts", source: "./all", line: 2 }] };
		expect(run(inv, ctxOf("apps/backend/a/x.ts", star))).toHaveLength(1);
		// a namespace re-export (`export * as ns from "./all"`) is flagged
		const ns = { lines: 5, exports: [{ kind: "namespace", named: ["ns"], from: "apps/backend/a/all.ts", source: "./all", line: 2 }] };
		expect(run(inv, ctxOf("apps/backend/a/x.ts", ns))).toHaveLength(1);
		// the except glob (test dir) is skipped
		expect(run(inv, ctxOf("apps/backend/test/x.ts", named))).toHaveLength(0);
	});
});

describe("invariants — normalize", () => {
	it("requires an id", () => {
		expect(() => normalizeInvariant({})).toThrow(/missing id/);
	});

	it("defaults where/except/forbid/must/children", () => {
		const n = normalizeInvariant({ id: "x" });
		expect(n.where).toEqual([]);
		expect(n.except).toEqual([]);
		expect(n.forbid).toEqual([]);
		expect(n.must).toEqual([]);
		expect(n.assert).toBeNull();
		expect(n.children).toEqual([]);
	});

	it("coerces scalar where/except to arrays", () => {
		const n = normalizeInvariant({ id: "x", where: "**/*.ts", except: "a" });
		expect(n.where).toHaveLength(1);
		expect(n.where[0].re.test("a/store.ts")).toBe(true);
		expect(n.where[0].re.test("a/x.js")).toBe(false);
		expect(n.except).toHaveLength(1);
		expect(n.except[0].re.test("a")).toBe(true);
	});
});


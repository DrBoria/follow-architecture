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
		const inv = { id: "x", where: ["**/store.ts"], infer: [{ lines: { gt: 0 } }], report: "too big" };
		expect(run(inv, ctxOf("a/store.ts", { lines: 10 }))).toHaveLength(1);
		expect(run(inv, ctxOf("a/other.ts", { lines: 10 }))).toHaveLength(0);
	});

	it("where supports naming-convention placeholders", () => {
		const inv = { id: "x", where: ["apps/backend/{kebab-case}/*.ts"], infer: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("apps/backend/document/model.ts", { lines: 10 }))).toHaveLength(1);
		expect(run(inv, ctxOf("apps/backend/Document/model.ts", { lines: 10 }))).toHaveLength(0);
	});

	it("ignore glob skips the file", () => {
		const inv = { id: "x", ignore: ["**/generated/**"], infer: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("a/generated/x.ts", { lines: 10 }))).toHaveLength(0);
		expect(run(inv, ctxOf("a/hand/x.ts", { lines: 10 }))).toHaveLength(1);
	});

	it("when gates on present roles (plain filter over file facts)", () => {
		const inv = { id: "x", when: { roles: { any: { equals: "orchestrator" } } }, infer: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 10, roles: ["orchestrator"] }))).toHaveLength(1);
		expect(run(inv, ctxOf("a/x.ts", { lines: 10, roles: [] }))).toHaveLength(0);
	});

	it("queries the scopeChains file fact through the unified interface (via + chain)", () => {
		const facts = {
			lines: 10,
			scopeChains: [
				{ via: "getRoot", chain: ["grammar"], line: 4 },
				{ via: "getRoot", chain: ["grammar", "loadGrammar"], line: 4 },
				{ via: "getParent", chain: ["sibling", "doThing"], line: 6 },
			],
		};
		// a method call (2+ chain segments) through getRoot
		const inv = { id: "x", infer: [{ scopeChains: { any: { via: { equals: "getRoot" }, chain: { length: { gte: 2 } } } } } ] };
		expect(run(inv, ctxOf("a/x.ts", facts))).toHaveLength(1);
		// `contains` on the chain list: any access touching `loadGrammar`
		const inv2 = { id: "x", infer: [{ scopeChains: { any: { chain: { contains: "loadGrammar" } } } }] };
		expect(run(inv2, ctxOf("a/x.ts", facts))).toHaveLength(1);
		// no match → no finding
		const inv3 = { id: "x", infer: [{ scopeChains: { any: { via: { equals: "getGlobal" } } } }] };
		expect(run(inv3, ctxOf("a/x.ts", facts))).toHaveLength(0);
		// bare store ref (length 1) does not satisfy the method-call filter
		const bare = { lines: 10, scopeChains: [{ via: "getRoot", chain: ["grammar"], line: 4 }] };
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
		const inv = { id: "x", when: { candidates: { any: { role: { equals: "pureFunction" }, parentRole: { equals: "orchestrator" } } } }, infer: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf("a/x.ts", facts))).toHaveLength(1);
		expect(run(inv, ctxOf("a/x.ts", { lines: 10, roles: [], candidates: [{ name: "inner", role: "pureFunction", parentRole: null }] }))).toHaveLength(0);
	});
});

describe("invariants — checks", () => {
	it("an infer fires when the file facts match", () => {
		const inv = { id: "big", infer: [{ lines: { gt: 200 } }], report: "{lines} lines" };
		const out = run(inv, ctxOf("a/x.ts", { lines: 300 }));
		expect(out).toHaveLength(1);
		expect(out[0].key).toBe("invariant:big:infer");
		expect(out[0].vars.lines).toBe(300);
	});

	it("a rule is silent when the facts do not match", () => {
		const inv = { id: "big", infer: [{ lines: { gt: 200 } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 100 }))).toHaveLength(0);
	});

	it("a rule on candidate facts reports the candidate's line and name", () => {
		const inv = { id: "naming", infer: [{ name: { endsWith: "_" } }], report: "bad name {what}" };
		const facts = { lines: 10, candidates: [{ name: "bad_", line: 7, kind: "FunctionDeclaration" }] };
		const out = run(inv, ctxOf("a/x.ts", facts));
		expect(out).toHaveLength(1);
		expect(out[0].vars.what).toBe("bad_");
	});

	it("asks the file first, then each candidate — one finding, no key list", () => {
		// The file answers → a finding about the file, and the candidate that also
		// happens to answer does not produce a second one.
		const inv = { id: "x", infer: [{ lines: { gt: 5 } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 9, candidates: [{ lines: 9, name: "c" }] }))).toHaveLength(1);
		// The file does not answer (`bodyStatements` is not a file fact) → the same
		// filter is asked of every candidate, and the finding names that one.
		const perCandidate = { id: "y", infer: [{ bodyStatements: { equals: 0 } }] };
		const out = run(perCandidate, ctxOf("a/x.ts", { lines: 9, candidates: [{ lines: 3, name: "empty", bodyStatements: 0 }, { lines: 4, name: "full", bodyStatements: 2 }] }));
		expect(out).toHaveLength(1);
		expect(out[0].vars.what).toBe("empty");
	});

	it("`not:` turns a rule into a requirement — the same filter, read backwards", () => {
		const inv = { id: "x", infer: [{ not: { lines: { gt: 5 } } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 3 }))).toHaveLength(1);
		expect(run(inv, ctxOf("a/x.ts", { lines: 9 }))).toHaveLength(0);
	});

	it("names the offending values when a rule fails (through `not:`)", () => {
		const inv = { id: "x", infer: [{ not: { roles: { every: { in: ["action"] } } } }] };
		const out = run(inv, ctxOf("a/x.ts", { lines: 3, roles: ["action", "storeModel"], candidates: [] }));
		expect(out).toHaveLength(1);
		expect(out[0].vars.violations).toBe("storeModel");
	});

	it("takes the full filter grammar: and / or / xor at the top of a rule", () => {
		const or = { id: "x", infer: [{ or: [{ lines: { gt: 100 } }, { lines: { lt: 2 } }] }] };
		expect(run(or, ctxOf("a/x.ts", { lines: 500 }))).toHaveLength(1);
		const xor = { id: "x", infer: [{ xor: [{ lines: { gt: 100 } }, { lines: { lt: 2000 } }] }] };
		expect(run(xor, ctxOf("a/x.ts", { lines: 500 }))).toHaveLength(0);
	});

	it("classifies a wrapped filter by what it wraps (file facts stay file-level)", () => {
		// `{ not: { lines: … } }` must not be treated as a candidate filter: a
		// candidate-level check would never see the file's `lines`.
		const inv = { id: "x", infer: [{ not: { lines: { gt: 5 } } }] };
		expect(run(inv, ctxOf("a/x.ts", { lines: 3, candidates: [] }))).toHaveLength(1);
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
		const inv = { id: "nested", when: { candidates: { any: { role: { equals: "pureFunction" }, parentRole: { equals: "orchestrator" } } } }, report: "nested pure function" };
		const out = run(inv, ctxOf("a/x.ts", facts));
		expect(out).toHaveLength(1);
		expect(out[0].key).toBe("root:nested");
	});

	it("children are checked recursively", () => {
		const inv = {
			id: "parent",
			report: "p",
			children: [{ id: "child", infer: [{ lines: { gt: 0 } }], report: "c" }],
		};
		const out = run(inv, ctxOf("a/x.ts", { lines: 1 }));
		// The parent has no checks of its own, so with a report it is its own
		// finding; the child's rule fires on top.
		expect(out.map((f) => f.key)).toEqual(["root:parent", "invariant:child:infer"]);
	});

	it("report variables include scalar file facts", () => {
		const inv = { id: "x", infer: [{ lines: { gt: 0 } }], report: "{lines} lines in {basename}" };
		const out = run(inv, ctxOf("a/x.ts", { lines: 42, folder: "a" }));
		expect(out[0].vars.lines).toBe(42);
		expect(out[0].vars.basename).toBe("x.ts");
	});

	it("forbids re-exports: any export with a set `from` (named, namespace, star)", () => {
		const inv = { id: "no-re-exports", where: ["apps/backend/**/*.ts"], ignore: ["apps/backend/test/**"], infer: [{ exports: { any: { from: { isSet: true } } } }] };
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
		// the ignore glob (test dir) is skipped
		expect(run(inv, ctxOf("apps/backend/test/x.ts", named))).toHaveLength(0);
	});
});

describe("invariants — normalize", () => {
	it("requires an id", () => {
		expect(() => normalizeInvariant({})).toThrow(/missing id/);
	});

	it("defaults where/ignore/rule/children", () => {
		const n = normalizeInvariant({ id: "x" });
		expect(n.where).toEqual([]);
		expect(n.ignore).toEqual([]);
		expect(n.infer).toEqual([]);
		expect(n.children).toEqual([]);
	});

	it("coerces scalar where/ignore to arrays", () => {
		const n = normalizeInvariant({ id: "x", where: "**/*.ts", ignore: "a" });
		expect(n.where).toHaveLength(1);
		// `where` entries go through the shared mechanism: a glob stays a glob.
		expect(n.where[0]).toMatchObject({ type: "glob", glob: "**/*.ts" });
		expect(n.ignore).toHaveLength(1);
		expect(n.ignore[0]).toMatchObject({ type: "glob", glob: "a" });
	});
});


describe("invariants — declared keys", () => {
	it("a key the entity does not have fails loudly instead of doing nothing", () => {
		expect(() => normalizeInvariant({ id: "x", forbid: [] })).toThrow(/`forbid` is not a key/);
		expect(() => normalizeInvariant({ id: "x", except: [] })).toThrow(/`except` is not a key/);
	});

	it("an unknown key is an error, not a silent no-op", () => {
		expect(() => normalizeInvariant({ id: "x", dedupe: "dir" })).toThrow(/`dedupe` is not a key/);
	});

	it("the error lists the keys the entity does have", () => {
		expect(() => normalizeInvariant({ id: "x", must: [{ lines: { lt: 9 } }] })).toThrow(/`must` is not a key — an invariant is id, where, ignore, when, infer, report, dedupeBy, children/);
	});

	it("`rule` is not a key — `infer` is the one filter language", () => {
		expect(() => normalizeInvariant({ id: "x", rule: [] })).toThrow(/`rule` is not a key/);
	});
});

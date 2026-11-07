import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect } from "vitest";
const { FACT_KINDS, EDGE_FACTS } = require("../../entities/kinds");

// `entities/kinds.js` is a CONTRACT, not a helper library: the vocabulary and
// its producers must agree exactly, or a role could declare a rule the engine
// cannot check (or the engine could produce a relation nobody can name). The
// module asserts this at load; these tests pin the shape.
describe("the fact layer's contract", () => {
	it("has a producer for every declared relation and no undeclared producer", () => {
		expect(Object.keys(EDGE_FACTS).sort()).toEqual([...FACT_KINDS].sort());
	});

	const facts = {
		location: { path: "src/feature/a.ts", piece: null },
		imports: [
			{ source: "./b", resolved: "src/feature/b.ts", line: 2 },
			{ source: "./shape", resolved: "src/feature/shape.ts", line: 4, typeOnly: true },
		],
		exports: [{ from: "src/shared/c.ts", line: 3 }],
		reads: [{ module: "src/shared/c.ts", what: "c.value", line: 8 }],
		candidates: [
			{
				lines: [5, 6, 7],
				// exported, one call, returns it — a re-declaration
				exported: true,
				name: "runIt",
				calls: [{ action: "doIt", module: "src/shared/c.ts" }],
				assignments: [
					{ via: "assign", target: "state.x", value: "state", module: "src/shared/c.ts", line: 6, relation: "mutate" },
					{ via: "assign", target: "this.x", value: null, onThis: true, line: 7, relation: "mutate" },
					// a write into the piece's OWN local: private, not a relation
					{ via: "assign", target: "out.n", value: "out", line: 8, local: true, relation: null },
					{ via: "assign", target: "state.y", value: "state", line: 9, param: true, relation: "assign" },
				],
			},
		],
	};

	it("derives one edge per relation, each as {path, line, what}", () => {
		for (const kind of FACT_KINDS) {
			const edges = EDGE_FACTS[kind](facts);
			expect(edges.length).toBeGreaterThan(0);
			for (const e of edges) {
			// `{ path, line, what, piece, role, fact }` is the edge every consumer
			// reads: a role belongs to the PIECE of code that makes the relation
			// (`getHost` is a view, `storeSettings` in the same file is an action),
			// so the edge carries both. `call` names the callee as well — "which
			// function of that module" is what tells a declared store accessor
			// from any other reach. `fact` is the same observation with NO words in
			// it: `report/errorTypes/phrases.js` writes the sentence, so the AST
			// layer cannot disagree with the report about what happened.
			const allowed = kind === "call" ? ["action", "fact", "line", "path", "piece", "role", "what"] : ["fact", "line", "path", "piece", "role", "what"];
				expect(Object.keys(e).sort()).toEqual(allowed);
				expect(typeof e.path).toBe("string");
				expect(typeof e.line).toBe("number");
				expect(typeof e.what).toBe("string");
			}
		}
	});

	it("points a `this.x` write at the file itself — its own role decides", () => {
		const paths = EDGE_FACTS.mutate(facts).map((e) => e.path);
		expect(paths).toContain("src/feature/a.ts");
		expect(paths).toContain("src/shared/c.ts");
	});

	it("splits the same write fact into `assign` (own value) and `mutate` (somebody else's)", () => {
		// A write is a write: WHERE it lands is the only difference, and it decides
		// which edge it becomes — never two edges for one line.
		const assigned = EDGE_FACTS.assign(facts);
		expect(assigned.map((e) => e.path)).toEqual(["src/feature/a.ts"]);
		expect(assigned.map((e) => e.what)).toEqual(["writes into `state.y`"]);
		const mutated = EDGE_FACTS.mutate(facts).map((e) => e.what);
		expect(mutated).toContain("changes `state.x` of `src/shared/c.ts`");
		expect(mutated).toContain("changes `this.x` of its own file");
	});

	it("ignores calls and imports that resolve to nothing", () => {
		const empty = { location: { path: "src/a.ts" }, imports: [{ source: "lodash" }], candidates: [{ lines: [1], calls: [{ action: "x" }], assignments: [] }] };
		// `declare` always answers — a declaration is a fact even with nothing behind
		// it, and its edge points at the file that declares it.
		for (const kind of FACT_KINDS.filter((k) => k !== "declare")) expect(EDGE_FACTS[kind](empty)).toEqual([]);
		expect(EDGE_FACTS.declare(empty).map((e) => e.path)).toEqual(["src/a.ts"]);
	});

	it("does not count `import type` as a dependency", () => {
		// Nothing runs and nothing is bound: an adapter may name a type of the
		// code it must not import, and a store may type a value it holds without
		// depending on the module that produces it.
		const withTypeOnly = {
			rel: "src/a.ts",
			imports: [
				{ source: "./real", resolved: "src/real.ts", line: 1 },
				{ source: "./shape", resolved: "src/shape.ts", line: 2, typeOnly: true },
			],
		};
		expect(EDGE_FACTS.import(withTypeOnly).map((e) => e.path)).toEqual(["src/real.ts"]);
	});
});

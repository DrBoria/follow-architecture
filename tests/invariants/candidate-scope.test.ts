import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
import { normalizeInvariant } from "../../invariants/normalize";
import { checkInvariants } from "../../invariants/index";

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

const fn = (over = {}) => ({
	name: "f",
	kind: { own: { is: "FunctionDeclaration" }, descendants: [] },
	parameters: [],
	returns: [],
	location: { piece: null },
	lines: [1, 1],
	...over,
});

const sameLength = () => ({ parameters: { length: { equals: "$parameters.length" } } });

describe("infer — `$` in a candidate filter names the CANDIDATE's own facts", () => {
	it("`$parameters.length` resolves to the candidate (0 params → 0 == 0 fires)", () => {
		// Discriminating case: the FILE has no `parameters`, so if `$` resolved to
		// the file the length op would fail on `undefined`. The finding can only
		// appear if `$` read the candidate's own `parameters`.
		expect(run({ id: "x", infer: [sameLength()] }, ctxOf("pkg/x.ts", { candidates: [fn({ parameters: [] })] }))).toHaveLength(1);
	});

	it("compares the candidate's real length (2 == 2 fires)", () => {
		const candidate = fn({ parameters: [{ name: "a" }, { name: "b" }] });

		expect(run({ id: "x", infer: [sameLength()] }, ctxOf("pkg/x.ts", { candidates: [candidate] }))).toHaveLength(1);
	});

	it("kind and the `$` comparison are AND-ed (a class candidate does not fire)", () => {
		const candidate = fn({ kind: { own: { is: "ClassDeclaration" }, descendants: [] }, parameters: [{ name: "a" }] });
		const filter = { kind: { own: { is: { equals: "FunctionDeclaration" } } }, ...sameLength() };

		expect(run({ id: "x", infer: [filter] }, ctxOf("pkg/x.ts", { candidates: [candidate] }))).toHaveLength(0);
	});

	it("reports only the candidate that matches, by name", () => {
		const a = fn({ name: "a", parameters: [{ name: "x" }] });
		const b = fn({ name: "b", kind: { own: { is: "ClassDeclaration" }, descendants: [] }, parameters: [{ name: "y" }] });
		const filter = { kind: { own: { is: { equals: "FunctionDeclaration" } } }, ...sameLength() };
		const out = run({ id: "x", infer: [filter] }, ctxOf("pkg/x.ts", { candidates: [a, b] }));

		expect(out).toHaveLength(1);
		expect(out[0].vars.what).toBe("a");
	});

	it("a filter that cannot hold for the candidate fires nothing", () => {
		const candidate = fn({ parameters: [{ name: "a" }] });
		// 1 parameter, but ask for length > 1 — impossible, so no finding.
		const filter = { parameters: { length: { gt: 1, equals: "$parameters.length" } } };

		expect(run({ id: "x", infer: [filter] }, ctxOf("pkg/x.ts", { candidates: [candidate] }))).toHaveLength(0);
	});

	it("file-level `$` refs are untouched (file facts still resolve)", () => {
		expect(run({ id: "x", infer: [{ lines: { equals: "$lines" } }] }, ctxOf("pkg/x.ts", { lines: 7 }))).toHaveLength(1);
	});

	it("file-level filters still win when the file answers first", () => {
		// The file has `lines`, so a `lines`-only filter is a FILE finding; the
		// candidate branch is never reached and the count stays 1.
		const candidate = fn({ lines: [9, 9] });

		expect(run({ id: "x", infer: [{ lines: { length: { gt: 0 } } }] }, ctxOf("pkg/x.ts", { lines: [1, 2, 3], candidates: [candidate] }))).toHaveLength(1);
	});
});

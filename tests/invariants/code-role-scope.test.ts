import { describe, expect, it } from "vitest";
import { normalizeInvariant } from "../../invariants/normalize";
import { checkInvariants } from "../../invariants/index";

// The `codeRole` scope object: role slug → the project-wide pieces carrying it.
// It is navigable as a filter field (`codeRole.<slug>`) and readable as a
// `$codeRole.<slug>` reference, with the shape the pipeline attaches. These
// tests pin the SCOPE mechanics; the project-wide classification that fills it
// is exercised through the CLI/ESLint integration.

const findingFrom = (item, rule, rel, key, vars) => ({ item, rule, rel, key, vars });

const ctxOf = (facts) => ({ rel: "a/x.ts", dir: "a", basename: "x.ts", facts });

const run = (raw, ctx) => {
	const out = [];
	checkInvariants([normalizeInvariant(raw)], ctx, out, findingFrom);

	return out;
};

describe("invariants — the codeRole scope", () => {
	it("`$codeRole.<slug>` resolves a project-wide fact in value position", () => {
		const inv = { id: "x", infer: [{ lines: { gt: "$codeRole.theme.length" } }] };
		// 3 lines vs one theme candidate → 3 > 1 → the filter matches.
		expect(run(inv, ctxOf({ lines: 3, codeRole: { theme: [{ name: "viking" }] } }))).toHaveLength(1);
		// No role named → the reference is absent, so nothing matches.
		expect(run(inv, ctxOf({ lines: 3 }))).toHaveLength(0);
	});

	it("a `when` gate reads the project-wide codeRole array", () => {
		const inv = { id: "g", when: { codeRole: { theme: { length: { gt: 0 } } } }, infer: [{ lines: { gt: 0 } }] };
		expect(run(inv, ctxOf({ lines: 3, codeRole: { theme: [{ name: "viking" }] } }))).toHaveLength(1);
		expect(run(inv, ctxOf({ lines: 3, codeRole: { theme: [] } }))).toHaveLength(0);
		expect(run(inv, ctxOf({ lines: 3 }))).toHaveLength(0);
	});
});

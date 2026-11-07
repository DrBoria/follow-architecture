import { describe, it, expect } from "vitest";

const wrongAction = require("../../report/errorTypes/types/wrongAction");
const wrongPlacement = require("../../report/errorTypes/types/wrongPlacement");
const unknownRole = require("../../report/errorTypes/types/unknownRole");
const structure = require("../../report/errorTypes/codes/structure");
const decisionMaker = require("../../report/errorTypes/decision-maker");
const { normalize } = decisionMaker;

// A repair is an OBJECT — `{ code, text, to }` — because the picture draws the
// same array the text prints. A bare string would be a second format, and two
// formats is how the text and the graph start to disagree.
const EDITS_THE_RULE =
	/(from:` list|re-declare|declare it|node's children|may really|rule is wrong|declare a role|say so in the architecture|in the architecture: add)/i;

const shapeOf = (o) => {
	expect(typeof o.code).toBe("string");
	expect(typeof o.text).toBe("string");
	expect(Array.isArray(o.to)).toBe(true);
};

const RELATION = {
	kind: "call",
	from: "backend-feature",
	to: ["backend-feature-actions"],
	target: { node: "action", paths: ["apps/backend/x/actions/a.ts"], exact: true },
	actors: ["orchestrator", "testCode"],
	token: {
		fact: { kind: "call", action: "run", module: "apps/backend/x/actions/a.ts" },
		subject: { pieces: ["helper"], roles: ["constants"], plural: false },
		why: { code: "allowed", roles: ["orchestrator", "testCode", "constants"], sameRoles: ["orchestrator"], targetNode: "action" },
		via: "registerCommand(…)",
	},
};

// The tree, as the report sees it: roles with declared homes. `places` is the
// ONLY source of a destination — never the list of who may do it.
const places = {
	pathOf: (s) => `path/${s}`,
			roles: () => ["constants", "pureFunction", "action", "testCode"],
	rolesAtPath: () => ["constants"],
	homeTemplates: (role) => ({ constants: ["apps/backend/constants.ts"], pureFunction: ["apps/backend/{kebab-case}/lib/{kebab-case}.ts"], action: ["apps/backend/{kebab-case}/actions/{kebab-case}.ts"], testCode: ["apps/backend/test/{kebab-case}.test.ts"] })[role] ?? [],
	homeFor: (role) =>
		({
			constants: { role, path: "apps/backend/constants.ts", folder: false, concrete: true, node: "backend-constants" },
			pureFunction: { role, path: "apps/backend/x/lib/run.ts", folder: false, concrete: true, node: "backend-feature-lib" },
			action: { role, path: "apps/backend/x/actions", folder: true, concrete: false, node: "backend-feature-actions" },
			testCode: { role, path: "apps/backend/test", folder: true, concrete: true, node: "backend-test" },
		})[role] ?? null,
};

const CTX = { file: "apps/backend/x/constants.ts", ownerNode: { slug: "backend-feature" }, places };

describe("errorTypes: one repair shape, and a repair never edits the rule", () => {
	it("a refused relation offers objects carrying the boxes the picture draws", () => {
		// The decision maker runs ONCE, in `describe`; a type only renders what it
		// decided. Here the same call is made by hand, so the test exercises the
		// real pipeline order.
		const story = { ...RELATION, destinations: decisionMaker.decide({ story: RELATION, ctx: CTX }) };
		const opts = wrongAction.fixes(story, CTX);
		expect(opts.length).toBeGreaterThan(0);
		for (const o of opts) {
			shapeOf(o);
			expect(EDITS_THE_RULE.test(o.text)).toBe(false);
		}
		// The destination comes from CODE ROLES: `constants` is what the tree calls
		// this file, its home names this very file, and the place exists — so it wins
		// with a stated confidence. `testCode` is in `why.roles` and is NOT a
		// destination, because a permission is not a place.
		const move = opts.find((o) => o.code === "move");
		expect(move.to).toEqual(["backend-constants"]);
		expect(move.text).toMatch(/fit \d+%/);
	});

	it("the decision maker scores every candidate role from separate sources", () => {
		const out = decisionMaker.decide({ story: RELATION, ctx: CTX });
		expect(out.length).toBeGreaterThan(0);
		for (const d of out) {
			// ONE output format, whatever the input source.
			expect(typeof d.role).toBe("string");
			expect(typeof d.node).toBe("string");
			expect(typeof d.path).toBe("string");
			expect(d.confidence).toBeGreaterThanOrEqual(decisionMaker.DEFAULT_THRESHOLDS.move);
			expect(d.confidence).toBeLessThanOrEqual(1);
			expect(d.tier).toBe("move");
			expect(typeof d.reason).toBe("string");
			expect(d.reason).toMatch(/evidence /);
			// Enough data, always: one source alone never carries a move.
			expect(d.evidence.length).toBeGreaterThanOrEqual(2);
			// The code role is the decision: 0.45 + 0.30 of the total.
			expect(d.weights.declared + d.weights.inferred).toBeCloseTo(0.75, 5);
			expect(Object.keys(d.contributions).sort()).toEqual(["branch", "declared", "hostable", "inferred", "named"]);
		}
		// Best first: the file `constants.ts` going to `constants.ts` beats a guess.
		expect(out[0].role).toBe("constants");
		// declared .45 + inferred .30 + named .13 + hostable .07 + branch .05
		expect(out[0].confidence).toBe(1);
	});

	it("a role that only MAY do the relation is not a destination", () => {
		// `testCode` passes the gate (it is allowed) but nothing says this CODE is a
		// test, and the move is decided by the code's own role — so it is dropped.
		const out = decisionMaker.decide({ story: RELATION, ctx: CTX });
		expect(out.map((d) => d.role)).not.toContain("testCode");
	}, 10);

	it("a placement finding offers objects whose `to` is the story's destinations", () => {
		for (const story of [
			{ type: "wrongPlacement", shape: "move", from: "backend-feature", to: ["packages-utils"] },
			{ type: "wrongPlacement", shape: "split", from: "backend-feature", to: ["packages-utils", "backend-feature-actions"] },
			{ type: "wrongPlacement", shape: "move", from: "backend-feature", to: ["packages-utils"], invariant: "one-role-per-file" },
		]) {
			const opts = wrongPlacement.fixes(story, CTX);
			expect(opts.length).toBeGreaterThan(0);
			for (const o of opts) {
				shapeOf(o);
				expect(o.to).toEqual(story.to);
				expect(EDITS_THE_RULE.test(o.text)).toBe(false);
			}
		}
	});

	it("a path in the sentence is not a destination", () => {
		// `apps/backend/constants.ts` looks like a place, and it is one — but the
		// sentence is PROSE. The report draws only what the producer stated
		// (`plan.after`); a sentence is what the reader is told, not what moves.
		const ctx = {
			plan: { before: { node: "backend-feature", paths: ["apps/backend/x"] }, after: null },
			ownerNode: { slug: "backend-feature" },
			finding: { message: "the shared name belongs in `apps/backend/constants.ts`", fix: "" },
		};

		expect(wrongPlacement.classify(ctx)).toBe(null);
	});

	it("a stated destination is the one drawn", () => {
		const ctx = {
			plan: { before: { node: "backend-feature", paths: ["apps/backend/x"] }, after: { node: "backend-constants" } },
			ownerNode: { slug: "backend-feature" },
			finding: { message: "" },
		};

		expect(wrongPlacement.classify(ctx).to).toEqual(["backend-constants"]);
	});

	it("an undeclared role offers one object", () => {
		const opts = unknownRole.fixes({ type: "unknownRole", from: "backend-feature" });
		expect(opts.length).toBe(1);
		shapeOf(opts[0]);
		expect(EDITS_THE_RULE.test(opts[0].text)).toBe(false);
	});

	it("a structure code offers code repairs only", () => {
		const facts = { basename: "stray.ts", seen: " A `feature` folder holds: `store.ts`.", dest: "packages/utils", duplicate: "a/b.ts", homeHere: ["x"], roles: ["pureFunction"], held: ["pureFunction"], named: "store.ts", asDir: false };
		for (const id of Object.keys(structure.CODES)) {
			const { fix } = structure.render(id, facts);
			if (fix) expect(EDITS_THE_RULE.test(fix)).toBe(false);
		}
	});

	it("normalize turns a legacy string into the one shape", () => {
		expect(normalize(["Delete it."])).toEqual([{ code: "rules", to: [], from: null, path: null, text: "Delete it." }]);
	});
});

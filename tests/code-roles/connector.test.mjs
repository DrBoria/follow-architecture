import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { enrichWithRoles, roleOfTarget } = require("../../code-roles/connector");

describe("roleOfTarget", () => {
	const toMap = (cands) => new Map(cands.filter((c) => c.name && c.role).map((c) => [c.name, c]));

	it("resolves a bare call by its action", () => {
		const map = toMap([{ name: "makeThing", role: "factory" }]);
		expect(roleOfTarget({ action: "makeThing", origin: "makeThing" }, map)).toBe("factory");
	});

	it("resolves a member call (obj.method) by the bare member name", () => {
		const map = toMap([{ name: "toggleLine", role: "action" }]);
		expect(roleOfTarget({ action: "toggleLine", origin: "self" }, map)).toBe("action");
	});

	it("falls back to the origin when the action is not a known candidate", () => {
		const map = toMap([{ name: "makeThing", role: "factory" }]);
		expect(roleOfTarget({ action: "run", origin: "makeThing" }, map)).toBe("factory");
	});

	it("returns null when no candidate matches", () => {
		const map = toMap([{ name: "toggleLine", role: "action" }]);
		expect(roleOfTarget({ action: "other", origin: "self" }, map)).toBeNull();
	});
});

describe("enrichWithRoles", () => {
	it("tags call targets with the resolved role of the callee", () => {
		const roles = {
			action: { infer: [{ kind: { equals: "MethodDeclaration" } }] },
			orchestrator: { infer: [{ kind: { equals: "ArrowFunction" }, calls: { length: { gt: 0 } } }] },
		};
		const candidates = [
			{ kind: "MethodDeclaration", name: "toggleLine", line: 1, calls: [], returns: [], assignments: [] },
			{ kind: "ArrowFunction", name: "run", line: 2, calls: [{ action: "toggleLine", origin: "self" }], returns: [], assignments: [] },
		];
		const enriched = enrichWithRoles(candidates, roles);
		const run = enriched.find((c) => c.name === "run");
		expect(run.role).toBe("orchestrator");
		expect(run.calls[0].targetRole).toBe("action");
	});
});

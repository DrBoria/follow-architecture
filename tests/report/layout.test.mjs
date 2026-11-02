import { describe, it, expect } from "vitest";
import { buildGraph, edgeLines, COL } from "../../report/user-report/src/utils/layout.js";

// The canvas must stay readable: a label is drawn ABOVE or BELOW its own arrow,
// and it may never sit on a box, on another arrow, or on another label. These
// are the invariants the placement search exists to satisfy — measured with the
// same `edgeLines` the renderer draws, so a label can never be narrower in the
// layout than it is on screen.

const pillRect = (link) => {
	const { kinds, via } = edgeLines(link.edge);
	const lines = [...kinds, ...via];
	const w = Math.max(...lines.map((t) => t.length * 5.4 + 10));
	const h = lines.length * 11 + 2;
	return { x: link.lx - w / 2, y: link.ly - 8.5, w, h };
};

const hitsSegment = (seg, r) => {
	const xm = Math.min(seg[0][0], seg[1][0]) - 1.5;
	const xM = Math.max(seg[0][0], seg[1][0]) + 1.5;
	const ym = Math.min(seg[0][1], seg[1][1]) - 1.5;
	const yM = Math.max(seg[0][1], seg[1][1]) + 1.5;
	return xM > r.x && xm < r.x + r.w && yM > r.y && ym < r.y + r.h;
};

const hitsRect = (a, b) => a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;

const violations = (g) => {
	const out = [];
	const pills = [];
	for (const l of g.links) {
		for (const [slug, b] of g.positions) {
			for (let i = 0; i < l.points.length - 1; i += 1) {
				// Leaving the source box and entering the target box are the two
				// points ON a box; everything in between must stay outside.
				if (slug === l.edge.from && i === 0) continue;
				if (slug === l.edge.to && i === l.points.length - 2) continue;
				if (hitsSegment([l.points[i], l.points[i + 1]], b)) out.push(`arrow ${l.edge.from}->${l.edge.to} crosses box ${slug}`);
			}
		}
		if (l.lx == null) continue;
		const r = pillRect(l);
		for (const b of g.positions.values()) if (hitsRect(r, b)) out.push(`label ${l.edge.from}->${l.edge.to} on a box`);
		for (const o of g.links) {
			if (o === l) continue;
			for (let i = 0; i < o.points.length - 1; i += 1) {
				if (hitsSegment([o.points[i], o.points[i + 1]], r)) out.push(`label ${l.edge.from}->${l.edge.to} on another arrow`);
			}
		}
		for (const o of pills) if (hitsRect(r, o)) out.push(`label ${l.edge.from}->${l.edge.to} on another label`);
		// Nor on its OWN line: the label belongs above (or below) the arrow it
		// names, never struck through by it.
		for (let i = 0; i < l.points.length - 1; i += 1) {
			if (hitsSegment([l.points[i], l.points[i + 1]], r) && Math.abs(l.points[i][1] - l.points[i + 1][1]) < 0.5) {
				out.push(`label ${l.edge.from}->${l.edge.to} sits on its own arrow`);
			}
		}
		pills.push(r);
	}
	return out;
};

describe("layout: labels and arrows never collide", () => {
	const n = (slug) => ({ slug, paths: [slug] });

	it("keeps every label off boxes, arrows and other labels", () => {
		// One source, three targets, two actions each: the crowded case that used
		// to stack labels on top of each other.
		const nodes = ["store", "actions", "controller", "root", "test"].map(n);
		const scope = ["getRoot(…)", "getParent(…)", "get(…)", "global", "self.root", "parent.get(…)"];
		const edges = [];
		for (const to of ["actions", "controller", "root"]) edges.push({ from: "store", to, kind: "import", kinds: ["import"], scope: [] });
		for (const to of ["actions", "controller"]) edges.push({ from: "store", to, kind: "call", kinds: ["call"], scope });
		edges.push({ from: "actions", to: "controller", kind: "import", kinds: ["import"], scope: [] });
		edges.push({ from: "root", to: "test", kind: "import", kinds: ["import"], scope: [] });

		const g = buildGraph(nodes, edges);
		expect(violations(g)).toEqual([]);
		// Every arrow is labelled: a picture with fewer labels than arrows is a
		// picture the reader has to hover to understand.
		expect(g.links.filter((l) => l.lx != null)).toHaveLength(g.links.length);
	});

	it("writes the reach mechanisms into the label, with the `via` prefix measured", () => {
		const e = { kind: "call", kinds: ["call"], scope: ["getRoot(…)", "getParent(…)"] };
		const { kinds, via } = edgeLines(e);
		expect(kinds).toEqual(["call"]);
		expect(via[0].startsWith("via ")).toBe(true);
		// The prefix is part of the measured text, not added by the renderer.
		const widest = Math.max(...[...kinds, ...via].map((t) => t.length));
		expect(widest).toBe(via[0].length);
	});

	it("fits four columns into a canvas the panel can scale", () => {
		const nodes = ["a", "b", "c", "d"].map(n);
		const edges = [
			{ from: "a", to: "b", kind: "import", kinds: ["import"] },
			{ from: "b", to: "c", kind: "import", kinds: ["import"] },
			{ from: "c", to: "d", kind: "import", kinds: ["import"] },
		];
		const g = buildGraph(nodes, edges);
		expect(g.width).toBeGreaterThan(3 * COL.width);
		expect(g.height).toBeGreaterThan(COL.row);
	});
});

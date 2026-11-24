import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { createTsProject, loadSourceFile, collectCandidates, importNameModules } from "../../entities/ast";
import { attachCallDepth } from "../../entities/ast/depth";
import { normalizeInvariant } from "../../invariants/normalize";
import { checkInvariants } from "../../invariants/index";
import type { Candidate } from "../../entities/facts";

// The depth walk asks ONE question: how does this piece hand work to the next?
// Calls, rendered components and class methods are the same link — the walk
// reads facts (calls, `framework.links`) and names no framework of its own.
// Everything below runs on REAL files on disk: the walk re-reads a file to
// follow a link, so a fixture must exist where the resolver can find it.

const writeTree = (files: Record<string, string>): string => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-depth-"));
	for (const [name, text] of Object.entries(files)) {
		const abs = path.join(dir, name);
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		fs.writeFileSync(abs, text);
	}

	return dir;
};

const depthOf = (files: Record<string, string>, rel: string): Candidate[] => {
	const repoRoot = writeTree(files);
	const repoFiles = Object.keys(files);
	const project = createTsProject({ repoRoot });
	const sf = loadSourceFile(project, path.join(repoRoot, rel), files[rel]);
	const importMap = importNameModules(sf, repoRoot, {}, repoFiles);
	const candidates = collectCandidates(sf, importMap, rel, repoRoot);
	attachCallDepth(candidates, { rel, project, repoRoot, aliases: {}, repoFiles });

	return candidates;
};

const chainOf = (candidates: Candidate[], name: string): string[] => {
	const piece = candidates.find((candidate) => candidate.name === name && (candidate.calls?.length ?? 0) > 0) ?? candidates.find((candidate) => candidate.name === name);

	return (piece?.kind?.chain ?? []).map((link) => link.name);
};

// Fire the chain rule the YAML writes: `kind.chain length gt 3`.
const fired = (candidates: Candidate[]): number => {
	const raw = { id: "chain", infer: [{ kind: { chain: { length: { gt: 3 } } } }], report: "too deep" };
	const out: unknown[] = [];
	checkInvariants([normalizeInvariant(raw)], { rel: "src/x.ts", dir: "src", basename: "x.ts", facts: { candidates } }, out, (item: unknown) => item);

	return out.length;
};

describe("depth — what a piece hands work to", () => {
	it("follows rendered components across files (JSX tags, renamed props)", () => {
		const candidates = depthOf(
			{
				"src/chain.tsx": 'import { D } from "./d";\nexport const A = ({ x }: { x: string }) => <B b={x} />;\nconst B = ({ b }: { b: string }) => <C c={b} />;\nconst C = ({ c }: { c: string }) => <D d={c} />;\n',
				"src/d.tsx": "export const D = ({ d }: { d: string }) => <div>{d}</div>;\n",
			},
			"src/chain.tsx",
		);

		expect(chainOf(candidates, "A")).toEqual(["A", "B", "C", "D"]);
		expect(fired(candidates)).toBeGreaterThan(0);
	});

	it("a two-component render is a chain of two, not a violation", () => {
		const candidates = depthOf({ "src/chain.tsx": "const B = () => <div />;\nexport const A = () => <B />;\n" }, "src/chain.tsx");

		expect(chainOf(candidates, "A")).toEqual(["A", "B"]);
		expect(fired(candidates)).toBe(0);
	});

	it("a function call chain still counts", () => {
		const candidates = depthOf({ "src/fns.ts": "export const f1 = () => f2();\nconst f2 = () => f3();\nconst f3 = () => f4();\nconst f4 = () => 42;\n" }, "src/fns.ts");

		expect(chainOf(candidates, "f1")).toEqual(["f1", "f2", "f3", "f4"]);
		expect(fired(candidates)).toBeGreaterThan(0);
	});

	it("follows class methods: new B().n() is a link to n", () => {
		const code = ["class A { m() { return new B().n(); } }", "class B { n() { return new C().p(); } }", "class C { p() { return new D().q(); } }", "class D { q() { return 1; } }", "export { A };"].join("\n");
		const candidates = depthOf({ "src/klass.ts": `${code}\n` }, "src/klass.ts");

		expect(chainOf(candidates, "m")).toEqual(["m", "n", "p", "q"]);
		expect(fired(candidates)).toBeGreaterThan(0);
	});

	it("mixes a rendered component with the helper chain it calls", () => {
		const code = ["const h2 = () => 1;", "const h1 = () => h2();", "const Inner = () => h1();", "export const Outer = () => <Inner />;"].join("\n");
		const candidates = depthOf({ "src/mixed.tsx": `${code}\n` }, "src/mixed.tsx");

		expect(chainOf(candidates, "Outer")).toEqual(["Outer", "Inner", "h1", "h2"]);
		expect(fired(candidates)).toBeGreaterThan(0);
	});

	it("a render cycle terminates instead of walking forever", () => {
		const candidates = depthOf({ "src/cycle.tsx": "const A = () => <B />;\nconst B = () => <A />;\nexport { A, B };\n" }, "src/cycle.tsx");

		expect(chainOf(candidates, "A")).toEqual(["A", "B"]);
	});
});

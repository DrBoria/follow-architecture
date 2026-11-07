import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectCandidates, importNameModules } = require("../../../entities/ast");
const frameworks = require("../../../frameworks");

// React facts are a READING of the same AST: what a component renders, what it
// receives and what it hands down. The rule decides what to do with the number —
// the facet only counts.

const candidatesOf = (code, rel = "a/card.tsx") => {
	const project = createTsProject();
	const sf = loadSourceFile(project, rel, code);
	const importMap = importNameModules(sf, ".", {}, [rel]);
	const candidates = collectCandidates(sf, importMap, rel, ".");

	return frameworks.enrich(candidates, { rel, sf, text: code, repoRoot: "." });
};

const component = (candidates, name) =>
	candidates.find((c) => c.name === name && c.kind?.own?.is !== "VariableDeclaration");

describe("react — what a component renders", () => {
	it("lists the elements with their attributes and spreads", () => {
		const [card] = [component(candidatesOf('export const Card = (props) => <div><Button label={props.title} {...props} /></div>;'), "Card")];

		expect(card.framework.id).toBe("react");
		expect(card.framework.component).toBe(true);
		expect(card.framework.jsx.map((j) => j.tag)).toEqual(["div", "Button"]);
		const button = card.framework.jsx.find((j) => j.tag === "Button");
		expect(button.attributes).toEqual([{ name: "label", value: "{props.title}" }]);
		expect(button.spreads).toEqual(["props"]);
	});

	it("counts forwarded props — the number a rule compares with `gt`", () => {
		const code = "export const Panel = ({ a, b, c, d }) => <Card a={a} b={b} c={c} d={d} title=\"x\" />;";
		const panel = component(candidatesOf(code), "Panel");

		expect(panel.framework.props).toEqual(["a", "b", "c", "d"]);
		expect(panel.framework.forwarded).toEqual(["a", "b", "c", "d"]);
	});

	it("a spread forwards everything the component received", () => {
		const panel = component(candidatesOf("export const Panel = ({ a, b, c }) => <Card {...({ a, b, c })} />;"), "Panel");

		expect(panel.framework.forwarded).toEqual(["a", "b", "c"]);
	});

	it("keeps a nested component's markup to itself", () => {
		const code = `export function Outer() {
	const Inner = () => <Card only={1} />;
	return <section><Inner /></section>;
}`;
		const outer = component(candidatesOf(code), "Outer");
		const inner = component(candidatesOf(code), "Inner");

		expect(outer.framework.jsx.map((j) => j.tag)).toEqual(["section", "Inner"]);
		expect(inner.framework.jsx.map((j) => j.tag)).toEqual(["Card"]);
	});

	it("a function that renders nothing is not a component", () => {
		const helper = component(candidatesOf("export const sum = (a: number, b: number) => a + b;"), "sum");

		expect(helper.framework.component).toBe(false);
		expect(helper.framework.forwarded).toEqual([]);
	});
});

describe("react — the gate", () => {
	it("does not read a plain .ts file", () => {
		const facts = frameworks.facets().find((f) => f.id === "react");
		expect(facts.applies({ rel: "a/util.ts", sf: { getFullText: () => "export const a = 1;" } })).toBe(false);
		expect(facts.applies({ rel: "a/card.tsx", sf: { getFullText: () => "" } })).toBe(true);
	});

	it("vue and angular attach their namespace without pretending to know the markup", () => {
		const candidates = candidatesOf("export const Card = () => null;", "a/card.tsx");
		const vue = require("../../../frameworks/vue");
		expect(vue.applies({ rel: "a/Card.vue", text: "<template><div /></template>" })).toBe(true);
		vue.enrich(candidates, {});
		expect(candidates[0].framework.id).toBe("vue");
	});
});

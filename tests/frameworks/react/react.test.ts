import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
import { createTsProject, loadSourceFile, collectCandidates, importNameModules } from "../../../entities/ast";
import * as frameworks from "../../../frameworks";
import * as vue from "../../../frameworks/vue";

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

	it("marks the function an event attribute wires as a handler", () => {
		const code = `export const Modal = () => {
	const close = () => {};
	const other = () => {};
	return <Overlay onClick={close} onKeyUp={other} />;
};`;
		const candidates = candidatesOf(code);
		const close = component(candidates, "close");

		expect(close.framework.handler).toBe(true);
		expect(component(candidates, "Modal").framework.handler).toBe(false);
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

describe("react — a type annotation does not hide the component", () => {
	// The bug: a component's ownership was matched by the DECLARATION's start
	// line. When the type annotation wraps, the arrow (the function that really
	// renders) starts lower, so the declaration saw no markup and was not a
	// component; the same code on one line happened to match. The binding must be
	// judged by the function it is initialised with, not by where the keyword is.
	const bindingOf = (candidates, name) => candidates.find((c) => c.name === name && c.kind?.own?.is === "VariableDeclaration");
	const arrowOf = (candidates, name) => candidates.find((c) => c.name === name && c.kind?.own?.is === "ArrowFunction");

	it("classifies the single-line control as a component", () => {
		const candidates = candidatesOf("export const Single: React.FC<{ a: string }> = ({ a }) => <Widget a={a} />;");
		const single = bindingOf(candidates, "Single");

		expect(single.framework.component).toBe(true);
		expect(single.framework.jsx.map((j) => j.tag)).toEqual(["Widget"]);
		expect(arrowOf(candidates, "Single").framework.forwarded).toEqual(["a"]);
	});

	it("classifies a multiline type annotation as a component", () => {
		const code = `export const Multi: React.FC<{
	a: string;
	b: number;
}> = ({ a, b }) => (<Widget a={a} b={b} />);`;
		const candidates = candidatesOf(code);
		const multi = bindingOf(candidates, "Multi");

		expect(multi.framework.component).toBe(true);
		expect(multi.framework.jsx.map((j) => j.tag)).toEqual(["Widget"]);
		expect(arrowOf(candidates, "Multi").framework.forwarded).toEqual(["a", "b"]);
	});

	it("reads both components of the Validation fixture", () => {
		const code = readFileSync(new URL("./fixtures/validation.tsx", import.meta.url), "utf8");
		const candidates = candidatesOf(code, "packages/components/atoms/Validation/index.tsx");
		const message = bindingOf(candidates, "ErrorValidationMessage");
		const container = bindingOf(candidates, "ErrorValidationContainer");

		expect(message.framework.component).toBe(true);
		expect(message.framework.jsx.map((j) => j.tag)).toEqual(["StyledErrorValidationMessage"]);
		expect(container.framework.component).toBe(true);
		expect(container.framework.jsx.map((j) => j.tag)).toEqual(["StyledErrorValidationContainer"]);
		// The transient styled prop (`$isError`) is forwarded like any other name.
		expect(arrowOf(candidates, "ErrorValidationContainer").framework.forwarded).toEqual(["$isError", "props"]);
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
				expect(vue.applies({ rel: "a/Card.vue", text: "<template><div /></template>" })).toBe(true);
		vue.enrich(candidates, {});
		expect(candidates[0].framework.id).toBe("vue");
	});
});

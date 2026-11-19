"use strict";

// React: what a component RENDERS and what it HANDS DOWN.
//
// The engine sees JSX as syntax; this facet turns it into facts a rule can ask
// about:
//   jsx       every element the component itself renders (nearest enclosing
//             function is the component, so a nested component's markup is its
//             own), with the attributes and the spreads it passes
//   props     the names the component RECEIVES (destructured params, or the
//             parameter name when it takes the object whole)
//   forwarded the received names that reappear on a child — `{...props}` counts
//             as everything it received. This is props drilling as a NUMBER, so
//             a rule says `gt: 3` or `gt: 10` without any engine change.

import { Node, type JsxAttribute, type JsxElement, type JsxSelfClosingElement, type JsxOpeningElement } from "ts-morph";
import { SK } from "../../entities/ast/tree";
import { climbFrom } from "../../entities/ast/climb";
import { distinctFlat } from "../../utils/distinct";
import type { LooseNode } from "../../entities/ast/loose";
import type { Candidate, JsxElementFact, ParameterFact } from "../../entities/facts";
import type { FacetContext } from "../facet";

const id = "react";

// "Is this a function?" is asked of the SHAPE, not of a list of kind names: a
// function-like node has parameters and a body. Anything TypeScript calls a
// function answers yes, and nothing here has to be updated when it adds one.
// The capabilities are probed through the shared optional-shape view.
const isFunctionLike = (node: LooseNode): boolean => typeof node.getParameters === "function" && typeof node.getBody === "function";

// A CANDIDATE carries facts, not a node: it is read as a function when the facts a
// function has are there (`parameters`, `returns`), which the AST module records
// only for function-shaped pieces.
const isFunctionCandidate = (candidate: Candidate): boolean => Array.isArray(candidate.parameters) && Array.isArray(candidate.returns);

// The nearest function-like owner: the shared climb, with this facet's own
// holder test (the shape probe above).
const nearestFunction = (node: Node): Node | null => {
	const stop = climbFrom(node, { isHolder: isFunctionLike });

	return stop.found ? stop.node : null;
};

type JsxElementNode = JsxElement | JsxSelfClosingElement;
const openingOf = (element: JsxElementNode): JsxOpeningElement | JsxSelfClosingElement => (Node.isJsxElement(element) ? element.getOpeningElement() : element);

const tagOf = (element: JsxElementNode): string | null => {
	const tag = openingOf(element).getTagNameNode();

	return tag ? String(tag.getText()) : null;
};

// `{a}` from `a={a}` — the value a child is handed, as written. The initializer's
// own text is the fact; a missing initializer is nothing handed.
const attributeValueText = (attribute: JsxAttribute): string | null => {
	const initializer = attribute.getInitializer();
	if (!initializer) return null;

	return initializer.getText();
};

const elementFacts = (element: JsxElementNode): JsxElementFact => {
	const opening = openingOf(element);
	const attributes: { name: string; value: string | null }[] = [];
	const spreads: string[] = [];

	for (const attribute of opening.getAttributes()) {
		if (Node.isJsxSpreadAttribute(attribute)) {
			spreads.push(String(attribute.getExpression().getText()));
			continue;
		}
		const name = attribute.getNameNode().getText();
		attributes.push({ name: String(name), value: attributeValueText(attribute) });
	}

	return { tag: tagOf(element), line: element.getStartLineNumber(), attributes, spreads };
};

// One parameter's contribution: the destructured field names when it takes the
// object apart, the parameter's own name when it takes the object whole.
const namesOfParameter = (parameter: ParameterFact): string[] => {
	if (Array.isArray(parameter.bindings) && parameter.bindings.length) {
		return parameter.bindings.flatMap((binding) => (binding.name ? [String(binding.name)] : []));
	}

	return parameter.name ? [String(parameter.name)] : [];
};

// `{ props, item }` / `(props)` — what the component was given. The
// distinct-collect walk is the shared `distinctFlat` core.
const receivedOf = (candidate: Candidate): string[] => distinctFlat(candidate.parameters ?? [], namesOfParameter);

// Does a received prop's NAME appear in a value as a whole word (not as a member
// of something else, `props.title` does not forward `title`)? One reading, used
// for both attributes and spreads.
const mentions = (value: string, name: string): boolean => new RegExp(`(^|[^\\w$.])${name}([^\\w$]|$)`).test(value);

// The received names an element's ATTRIBUTES mention, in attribute order.
const forwardedByAttributes = (element: JsxElementFact, received: string[]): string[] => {
	const names: string[] = [];
	for (const attribute of element.attributes) {
		const fromOwnProp = received.find((name) => mentions(attribute.value ?? "", name));
		if (fromOwnProp) names.push(fromOwnProp);
	}

	return names;
};

// The received names an element's SPREADS mention, in spread order.
// `{...props}` counts as everything it received.
const forwardedBySpreads = (element: JsxElementFact, received: string[]): string[] => {
	const names: string[] = [];
	for (const spread of element.spreads) {
		for (const name of received) if (mentions(spread, name)) names.push(name);
	}

	return names;
};

// The received names a component hands down: through attributes first (in order),
// then through spreads. One dedup at the end keeps first-mention order.
const forwardedOf = (own: JsxElementFact[], received: string[]): string[] => {
	const byAttributes = own.flatMap((element) => forwardedByAttributes(element, received));
	const bySpreads = own.flatMap((element) => forwardedBySpreads(element, received));

	return [...new Set([...byAttributes, ...bySpreads])];
};

// One rendered element, owned by the nearest enclosing function's start line.
type OwnedElement = { pos: number; owner: number | null; facts: JsxElementFact };

const elementsOf = (sf: NonNullable<FacetContext["sf"]>): OwnedElement[] => {
	const elements: JsxElementNode[] = [...sf.getDescendantsOfKind(SK.JsxSelfClosingElement), ...sf.getDescendantsOfKind(SK.JsxElement)];

	return elements
		.map((element): OwnedElement => ({ pos: element.getStart(), owner: nearestFunction(element)?.getStartLineNumber() ?? null, facts: elementFacts(element) }))
		.filter((entry) => entry.facts.tag)
		.sort((a, b) => a.pos - b.pos);
};

const enrich = (candidates: Candidate[], ctx: FacetContext): Candidate[] => {
	const { sf } = ctx;
	if (!sf) return candidates;
	const elements = elementsOf(sf);

	for (const candidate of candidates) {
		if (!isFunctionCandidate(candidate)) continue;
		const startLine = candidate.lines?.[0] ?? null;
		const own = elements.filter((entry) => startLine !== null && entry.owner === startLine).map((entry) => entry.facts);
		const received = receivedOf(candidate);

		candidate.framework = { id, component: own.length > 0, jsx: own, props: received, forwarded: forwardedOf(own, received) };
	}

	return candidates;
};

// Cheap gate: JSX only exists in these files, so a .ts helper pays nothing.
const applies = ({ rel, sf }: FacetContext): boolean => /\.(tsx|jsx)$/i.test(String(rel ?? "")) || /<[A-Za-z]/.test(sf?.getFullText() ?? "");
// React's own spelling of the class attribute.
const classAttributes = ["className"];

export { id, applies, classAttributes, enrich };

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
import type { Candidate, JsxElementFact, ParameterFact, DescendantFact } from "../../entities/facts";
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

// Where the code this candidate DECLARES starts rendering. A function is its own
// renderer, so its start line is the declaration's. A BINDING is judged by the
// function it is initialised WITH: a wrapped type annotation
// (`const X: FC<{\n…\n}> = (p) => …`) pushes the arrow onto a later line than the
// `const`, so the declaration's start line cannot be compared with the element's
// owner. The initializer is the TOPMOST function descendant (smallest depth) —
// nested callbacks and inner components sit deeper and are their own pieces.
const RENDER_FUNCTION_KINDS = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunction"]);
const renderStartLine = (candidate: Candidate): number | null => {
	if (candidate.kind?.own?.is !== "VariableDeclaration") return candidate.lines?.[0] ?? null;
	const functions = (candidate.kind?.descendants ?? []).filter((descendant) => RENDER_FUNCTION_KINDS.has(String(descendant.is)));
	const initialization = functions.reduce<DescendantFact | null>((top, descendant) => (top === null || (descendant.depth ?? 0) < (top.depth ?? 0) ? descendant : top), null);

	return initialization?.line ?? null;
};

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
// for both attributes and spreads. The name is ESCAPED: a transient styled prop
// (`$isError`) is a legal name, and an unescaped `$` is a regex anchor.
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (value: string, name: string): boolean => new RegExp(`(^|[^\\w$.])${escapeRegExp(name)}([^\\w$]|$)`).test(value);

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

// A rendered COMPONENT (not a host tag): the JSX convention is an upper-case
// identifier. A host tag (`div`, `span`) is a leaf — it renders nothing of ours.
const componentTag = (tag: string | null): string | null => (tag && /^[A-Z][\w$]*$/.test(tag) ? tag : null);

// A local wrapper that hands the render to a component: `const Card = styled(Box)`
// / `memo(Box)` — the tag is the wrapper, the renderable component is its first
// identifier argument that names a piece in this file. One hop only; anything
// else is the wrapper itself.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- a one-hop alias probe, not a name reader
const aliasTargetOf = (sf: NonNullable<FacetContext["sf"]>, tag: string, names: ReadonlySet<string>): string | null => {
	const initializer = sf.getVariableDeclarations().find((declaration) => declaration.getName() === tag)?.getInitializer();
	if (!initializer || !Node.isCallExpression(initializer)) return null;
	const target = initializer.getArguments().find((argument) => Node.isIdentifier(argument) && names.has(argument.getText()));

	return target && Node.isIdentifier(target) ? target.getText() : null;
};

// The links the depth walk follows: every component this piece renders, and the
// module declaring it (null = this file). Imported names resolve through the
// import map; local components and one-hop wrappers stay in this file. This is
// the facet's answer — the depth walk itself names no framework.
const linksOf = (own: JsxElementFact[], ctx: FacetContext, names: ReadonlySet<string>): { name: string; module: string | null }[] => {
	const links: { name: string; module: string | null }[] = [];
	for (const element of own) {
		const tag = componentTag(element.tag);
		if (!tag) continue;
		const module = ctx.importMap?.get(tag) ?? null;
		if (module) {
			links.push({ name: tag, module });
			continue;
		}
		if (names.has(tag)) {
			links.push({ name: tag, module: null });
			continue;
		}
		const alias = ctx.sf ? aliasTargetOf(ctx.sf, tag, names) : null;
		if (alias) links.push({ name: alias, module: null });
	}

	return links;
};

// The event attribute convention: `onClick`, `onChange`, `on*`. The value names
// the function the event runs — that function is the component's handler.
const EVENT_ATTRIBUTE = /^on[A-Z]/;
const IDENTIFIER = /[A-Za-z_$][\w$]*/g;

// The local names one event attribute references. A braced expression may name
// one or several (`onClick={busy ? stop : go}`); a name the file does not
// declare is not one of ours.
const namesInEvent = (attribute: { name: string; value: string | null }, names: ReadonlySet<string>): string[] =>
	attribute.value ? [...attribute.value.matchAll(IDENTIFIER)].map((match) => match[0]).filter((name) => names.has(name)) : [];

const handlerNamesOf = (own: JsxElementFact[], names: ReadonlySet<string>): Set<string> => {
	const handlers = new Set<string>();
	for (const element of own) {
		for (const attribute of element.attributes) {
			if (!EVENT_ATTRIBUTE.test(attribute.name)) continue;
			for (const name of namesInEvent(attribute, names)) handlers.add(name);
		}
	}

	return handlers;
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
	const names = new Set(candidates.map((candidate) => candidate.name).filter((name): name is string => Boolean(name)));
	// A handler is named where the event is wired, once for the whole file.
	const handlers = handlerNamesOf(elements.map((entry) => entry.facts), names);

	for (const candidate of candidates) {
		if (!isFunctionCandidate(candidate)) continue;
		const startLine = renderStartLine(candidate);
		const own = elements.filter((entry) => startLine !== null && entry.owner === startLine).map((entry) => entry.facts);
		const received = receivedOf(candidate);

		candidate.framework = { id, component: own.length > 0, jsx: own, props: received, forwarded: forwardedOf(own, received), links: linksOf(own, ctx, names), handler: candidate.name ? handlers.has(candidate.name) : false };
	}

	return candidates;
};

// Cheap gate: JSX only exists in these files, so a .ts helper pays nothing.
const applies = ({ rel, sf }: FacetContext): boolean => /\.(tsx|jsx)$/i.test(String(rel ?? "")) || /<[A-Za-z]/.test(sf?.getFullText() ?? "");
// React's own spelling of the class attribute.
const classAttributes = ["className"];

export { id, applies, classAttributes, enrich };

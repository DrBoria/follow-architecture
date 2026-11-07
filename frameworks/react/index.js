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

const { SK } = require("../../entities/ast/tree");

const FUNCTION_KINDS = new Set([SK.FunctionDeclaration, SK.ArrowFunction, SK.FunctionExpression, SK.MethodDeclaration]);
const JSX_KINDS = new Set([SK.JsxSelfClosingElement, SK.JsxElement]);
const FUNCTION_NAMES = new Set(["FunctionDeclaration", "ArrowFunction", "FunctionExpression", "MethodDeclaration"]);

const isFunctionCandidate = (candidate) => FUNCTION_NAMES.has(candidate?.kind?.own?.is);

const isFunctionLike = (node) => {
	const kind = node.getKind?.();

	return FUNCTION_KINDS.has(kind);
};

const nearestFunction = (node) => {
	for (let current = node.getParent?.(); current; current = current.getParent?.()) {
		if (isFunctionLike(current)) return current;
	}

	return null;
};

const tagOf = (element) => {
	const opening = element.getKind() === SK.JsxElement ? element.getOpeningElement() : element;
	const tag = opening?.getTagNameNode?.() ?? null;

	return tag ? String(tag.getText()) : null;
};

// `{a}` from `a={a}` — the value a child is handed, and whether it is one of the
// component's own props.
const attributeValueText = (attribute) => {
	const initializer = attribute.getInitializer?.();
	if (!initializer) return null;

	return typeof initializer.getText === "function" ? initializer.getText() : null;
};

const elementFacts = (element) => {
	const opening = element.getKind() === SK.JsxElement ? element.getOpeningElement() : element;
	const attributes = [];
	const spreads = [];

	for (const attribute of opening?.getAttributes?.() ?? []) {
		if (attribute.getKind() === SK.JsxSpreadAttribute) {
			spreads.push(String(attribute.getExpression?.().getText?.() ?? ""));
			continue;
		}
		const name = attribute.getNameNode?.()?.getText?.() ?? null;
		if (!name) continue;
		attributes.push({ name: String(name), value: attributeValueText(attribute) });
	}

	return {
		tag: tagOf(element),
		line: element.getStartLineNumber?.() ?? null,
		attributes,
		spreads,
	};
};

// `{ props, item }` / `(props)` — what the component was given.
const receivedOf = (candidate) => {
	const names = [];
	for (const parameter of candidate.parameters ?? []) {
		if (Array.isArray(parameter.bindings) && parameter.bindings.length) {
			for (const binding of parameter.bindings) if (binding.name) names.push(String(binding.name));
			continue;
		}
		if (parameter.name) names.push(String(parameter.name));
	}

	return [...new Set(names)];
};

const enrich = (candidates, ctx) => {
	const { sf } = ctx;
	const elements = sf
		.getDescendantsOfKind(SK.JsxSelfClosingElement)
		.concat(sf.getDescendantsOfKind(SK.JsxElement))
		.map((element) => ({ pos: element.getStart(), owner: nearestFunction(element)?.getStartLineNumber?.() ?? null, facts: elementFacts(element) }))
		.filter((entry) => entry.facts.tag)
		.sort((a, b) => a.pos - b.pos);

	for (const candidate of candidates) {
		if (!isFunctionCandidate(candidate)) continue;
		const startLine = candidate.lines?.[0] ?? null;
		const own = elements.filter((entry) => startLine !== null && entry.owner === startLine).map((entry) => entry.facts);
		const received = receivedOf(candidate);
		const forwarded = [];
		const spreadNames = new Set();

		for (const element of own) {
			for (const attribute of element.attributes) {
				const value = attribute.value ?? "";
				const fromOwnProp = received.find((name) => new RegExp(`(^|[^\\w$.])${name}([^\\w$]|$)`).test(value));
				if (fromOwnProp && !forwarded.includes(fromOwnProp)) forwarded.push(fromOwnProp);
			}
			for (const spread of element.spreads) {
				for (const name of received) {
					if (new RegExp(`(^|[^\\w$.])${name}([^\\w$]|$)`).test(spread)) spreadNames.add(name);
				}
			}
		}
		for (const name of spreadNames) if (!forwarded.includes(name)) forwarded.push(name);

		candidate.framework = {
			id: "react",
			component: own.length > 0,
			jsx: own,
			props: received,
			forwarded,
		};
	}

	return candidates;
};

module.exports = {
	id: "react",
	// Cheap gate: JSX only exists in these files, so a .ts helper pays nothing.
	applies: ({ rel, sf }) => /\.(tsx|jsx)$/i.test(String(rel ?? "")) || /<[A-Za-z]/.test(sf.getFullText()),
	enrich,
};

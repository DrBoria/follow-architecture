"use strict";

// Angular: components are classes with `@Component({ template })`, and inputs are
// `@Input()` fields — a different reading from React's functions, which is exactly
// why it lives in its own facet instead of in the engine.
//
// Placeholder with the gate in place: the namespace is attached (empty) so a rule
// written against `framework.*` is predictable, while the decorator/markup reading
// comes next.

const enrich = (candidates) => {
	for (const candidate of candidates) {
		candidate.framework = { id: "angular", component: false, jsx: [], props: [], forwarded: [] };
	}

	return candidates;
};

module.exports = {
	id: "angular",
	applies: ({ rel, text }) => /\.component\.ts$/i.test(String(rel ?? "")) || /@Component\s*\(/.test(String(text ?? "")),
	enrich,
};

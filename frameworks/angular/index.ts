"use strict";

// Angular: components are classes with `@Component({ template })`, and inputs are
// `@Input()` fields — a different reading from React's functions, which is exactly
// why it lives in its own facet instead of in the engine.
//
// Placeholder with the gate in place: the namespace is attached (empty) so a rule
// written against `framework.*` is predictable, while the decorator/markup reading
// comes next.

import type { Candidate } from "../../entities/facts";
import type { FacetContext } from "../facet";

const id = "angular";

const enrich = (candidates: Candidate[]): Candidate[] => {
	for (const candidate of candidates) {
		candidate.framework = { id, component: false, props: [], forwarded: [] };
	}

	return candidates;
};

// A template writes the class list into `class`, like HTML does.
const applies = ({ rel, text }: FacetContext): boolean => /\.component\.ts$/i.test(String(rel ?? "")) || /@Component\s*\(/.test(String(text ?? ""));
const classAttributes = ["class"];

export { id, applies, classAttributes, enrich };

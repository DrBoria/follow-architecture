"use strict";

// Vue: the same reading as react, over `<template>` markup instead of JSX.
//
// A `.vue` file is loaded by the engine as a single-file component: only its
// `<script>` reaches the TypeScript AST (see `entities/ast/file.ts`), so the
// template — where props are actually passed — has to be read from the source
// text. This facet is a placeholder with the gate in place: it recognises a
// single-file component and attaches the empty namespace, so rules written
// against `framework.*` behave predictably until the markup reading lands.

import type { Candidate } from "../../entities/facts";
import type { FacetContext } from "../facet";

const id = "vue";

const enrich = (candidates: Candidate[]): Candidate[] => {
	for (const candidate of candidates) {
		candidate.framework = { id, component: false, props: [], forwarded: [] };
	}

	return candidates;
};

// A template writes the class list into `class`, like HTML does.
const applies = ({ rel, text }: FacetContext): boolean => /\.vue$/i.test(String(rel ?? "")) || /<template[\s>]/.test(String(text ?? ""));
const classAttributes = ["class"];

export { id, applies, classAttributes, enrich };

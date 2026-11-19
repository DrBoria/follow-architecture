"use strict";

// Framework registry — a READING of the AST, never a change to it.
//
// The engine knows TypeScript; it does not know React, Vue or Angular. A facet is
// a separate module that attaches its own namespace to the candidates it
// understands (`framework.jsx`, `framework.forwarded`, …), so the rules read it
// exactly like any other fact and the core stays framework-free. This is the same
// shape the sibling tools use (`entities-uniqueness/frameworks`): a module per
// framework, `applies` as the cheap gate, enrichment as the only side effect.
//
// Facets never edit core facts. A facet that throws is isolated and reported — a
// broken reader must not take the analysis of a file down with it.

import { notice } from "../report/notices";
import { reasonOf } from "../utils/reason";
import * as react from "./react";
import * as vue from "./vue";
import * as angular from "./angular";
import type { Candidate } from "../entities/facts";
import type { FacetContext, FrameworkFacet } from "./facet";

// The built-in facets, by id. Adding a framework is a module plus an entry here —
// the engine never changes.
const REGISTRY: Record<string, () => FrameworkFacet> = {
	react: () => react,
	vue: () => vue,
	angular: () => angular,
};

let cache: FrameworkFacet[] | null = null;
const warned = new Set<string>();

const isFacet = (facet: FrameworkFacet): boolean => Boolean(facet.id) && typeof facet.applies === "function" && typeof facet.enrich === "function";

const facets = (): FrameworkFacet[] => {
	if (cache) return cache;
	cache = [];
	for (const [id, load] of Object.entries(REGISTRY)) {
		try {
			const facet = load();
			if (isFacet(facet)) cache.push(facet);
		} catch (error) {
			const e: { message?: string } = error;
			notice(`framework \`${id}\` could not be loaded`, reasonOf(e));
		}
	}

	return cache;
};

// `ctx` is the run context a facet may ask about: the file, its path, its text.
// Enrichment happens once per file, before classification, so a code role can be
// defined on a framework fact just like on `kind`.
const enrich = (candidates: Candidate[], ctx: FacetContext): Candidate[] => {
	for (const facet of facets()) {
		let applies = false;
		try {
			applies = facet.applies(ctx);
		} catch {
			applies = false;
		}
		if (!applies) continue;
		try {
			facet.enrich(candidates, ctx);
		} catch (error) {
			const key = `${facet.id}:${ctx.rel}`;
			if (warned.has(key)) continue;
			warned.add(key);
			const e: { message?: string } = error;
			notice(`${facet.id} facts are incomplete for ${ctx.rel}`, reasonOf(e));
		}
	}

	return candidates;
};

// THE ATTRIBUTE A CLASS LIST IS WRITTEN INTO. The vocabulary belongs to the
// facet that knows the framework (`className` is React's word, `class` is the
// template word); this is only the union, so the css facet can read a class list
// without ever spelling a framework's attribute name itself.
const classAttributes = (): Set<string> => {
	const names = new Set<string>();
	for (const facet of facets()) {
		for (const name of facet.classAttributes ?? []) names.add(String(name));
	}

	return names;
};

// Test hook: the registry is memoised, and a test that stubs a facet needs a
// clean read.
const resetFacets = (): void => {
	cache = null;
	warned.clear();
};

export { enrich, facets, classAttributes, resetFacets, REGISTRY };
export type { FacetContext, FrameworkFacet };

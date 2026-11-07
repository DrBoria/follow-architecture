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

const REGISTRY = {
	react: () => require("./react"),
	vue: () => require("./vue"),
	angular: () => require("./angular"),
};

let cache = null;
const warned = new Set();

const facets = () => {
	if (cache) return cache;
	cache = [];
	for (const [id, load] of Object.entries(REGISTRY)) {
		try {
			const facet = load();
			if (facet && facet.id && typeof facet.applies === "function" && typeof facet.enrich === "function") cache.push(facet);
		} catch (error) {
			console.warn(`[follow-architecture] framework \`${id}\` could not be loaded: ${error && error.message ? error.message : error}`);
		}
	}

	return cache;
};

// `ctx` is the run context a facet may ask about: the file, its path, its text.
// Enrichment happens once per file, before classification, so a code role can be
// defined on a framework fact just like on `kind`.
const enrich = (candidates, ctx) => {
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
			console.warn(`[follow-architecture] ${facet.id} facts are incomplete for ${ctx.rel}: ${error && error.message ? error.message : error}`);
		}
	}

	return candidates;
};

// Test hook: the registry is memoised, and a test that stubs a facet needs a
// clean read.
const resetFacets = () => {
	cache = null;
	warned.clear();
};

module.exports = { enrich, facets, resetFacets, REGISTRY };

"use strict";

// Vue: the same reading as react, over `<template>` markup instead of JSX.
//
// A `.vue` file is loaded by the engine as a single-file component: only its
// `<script>` reaches the TypeScript AST (see `entities/ast/file.js`), so the
// template — where props are actually passed — has to be read from the source
// text. This facet is a placeholder with the gate in place: it recognises a
// single-file component and attaches the empty namespace, so rules written
// against `framework.*` behave predictably until the markup reading lands.

const enrich = (candidates) => {
	for (const candidate of candidates) {
		candidate.framework = { id: "vue", component: false, jsx: [], props: [], forwarded: [] };
	}

	return candidates;
};

module.exports = {
	id: "vue",
	applies: ({ rel, text }) => /\.vue$/i.test(String(rel ?? "")) || /<template[\s>]/.test(String(text ?? "")),
	enrich,
};

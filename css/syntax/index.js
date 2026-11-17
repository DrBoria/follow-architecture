const configError = require("../../report/configErrors");
"use strict";

// A SYNTAX provider is what makes a new stylesheet language a file, not a
// rewrite:
//
//   { id, exts, parse(text), facts(text, options) }
//
//   id     the name rules and the report use (`css`, `scss`, …)
//   exts   which files it claims
//   parse  text → postcss root (the only syntax-specific part)
//   facts  the document facts, optionally enriched (SCSS adds `$variables`)
//
// The registry is DATA, not a switch: adding `less` or `stylus` is a
// `register()` call, and every rule written against `css.declarations` keeps
// working because the SHAPE does not change — only who parsed the text.

const providers = new Map();

const register = (provider) => {
	if (!provider?.id || typeof provider.facts !== "function") throw configError.syntaxProviderIncomplete();
	providers.set(provider.id, { exts: [], ...provider });

	return provider;
};

const list = () => [...providers.values()];

const byId = (id) => providers.get(id) ?? null;

// Which provider claims a file: by extension. No provider, no facts — a syntax
// nobody registered is not silently read as CSS.
const forExt = (ext) => {
	const wanted = String(ext ?? "").toLowerCase();

	return list().find((provider) => provider.exts.includes(wanted)) ?? null;
};

const forFile = (rel) => {
	const ext = String(rel ?? "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";

	return forExt(ext);
};

// Test hook and extension point: the built-ins are registered on load, and a
// consumer may register its own or replace one.
const reset = () => {
	providers.clear();
	require("./css");
	require("./scss");
};

register(require("./css"));
register(require("./scss"));

module.exports = { register, list, byId, forExt, forFile, reset };

"use strict";

// Normalize the YAML `codeRoles` section. The roles are passed through as-is:
// the engine (classify.js) interprets them directly. Normalization validates
// that each role is an object, compiles its optional `except` globs (the same
// pattern language as invariant `except`) to regexes, and normalizes its
// `scopeAccessors` to structured `{ kind, segments }` roots (kind ∈ call /
// identifier / methodCall — see `normalizeScopeAccessor` below).

const { compilePattern } = require("../utils/pattern");

const listOf = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// One `scopeAccessors` entry: `{ kind, segments }` where kind is one of
// "call" / "identifier" / "methodCall" and segments is a non-empty list of
// identifier names. For `identifier` entries the list spans the base
// identifier plus leading property names (e.g. `["self", "root"]`); for
// `call` / `methodCall` it is exactly the callee segments.
const normalizeScopeAccessor = (e) => {
	if (typeof e === "string") throw new Error(`scopeAccessors entries must be structured { kind, segments } objects, got string "${e}"`);
	const kind = e?.kind;
	if (!["call", "identifier", "methodCall"].includes(kind)) throw new Error(`scopeAccessors entry has invalid kind ${JSON.stringify(kind)} (expected "call" | "identifier" | "methodCall")`);
	const segments = listOf(e.segments).map(String);
	if (!segments.length || segments.some((s) => !s)) throw new Error(`scopeAccessors entry for kind "${kind}" needs a non-empty segments list of identifiers`);
	return { kind, segments };
};

const normalizeCodeRoles = (raw) => {
	if (!raw) return {};
	// Roles may be declared as a LIST of `{ slug, ... }` entries or as a MAP
	// keyed by slug. Both normalize to the same `{ [slug]: role }` shape; in
	// the list form order matters (first match wins), in the map form the
	// YAML key order is preserved by the parser.
	const defs = Array.isArray(raw)
		? raw
		: Object.entries(raw).map(([k, v]) => (v && typeof v === "object" ? { ...v, slug: v.slug ?? k } : null));
	if (defs.length === 0) return {};
	const out = {};
	for (const def of defs) {
		if (!def || typeof def !== "object") throw new Error("codeRoles: each entry must be an object with a `slug`");
		const name = def.slug;
		if (!name) throw new Error("codeRoles: each entry needs a `slug`");
		// `scopeAccessors` declares the structured chain roots that REACH this
		// role (e.g. call `getRoot`, identifier `global` / `self.root`,
		// methodCall `parent.get` for a store model). Per-role on purpose:
		// different roles may be reached through different mechanisms.
		out[name] = { ...def, except: listOf(def.except).map((p) => compilePattern(String(p))), scopeAccessors: listOf(def.scopeAccessors).map(normalizeScopeAccessor) };
	}
	return out;
};

module.exports = { normalizeCodeRoles };

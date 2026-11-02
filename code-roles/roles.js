"use strict";

// Normalize the YAML `codeRoles` section — the architecture's model of WHAT
// code is. A role is the whole description of one kind of code:
//
//   infer    — how to recognise it (filters over ts-morph facts)
//   where    — WHERE code of this role may be declared (its home)
//   report   — what to say when it is declared elsewhere
//   actions  — what may be done with it, and BY WHOM:
//                actions.import.where   — who may import it
//                actions.call.where     — who may call it
//                actions.mutate.where   — who may write INTO it
//                actions.assign.where   — who may write into what it was handed
//                actions.read.where     — who may read it
//              `where` is THE shared mechanism (utils/where.js): the same
//              entry interface invariants use for `where` / `except`.
//
// `scopeAccess` (on an action) lists the chain roots through which that code
// is reached WITHOUT an import: `{ scope, segments }` — `scope` says what the
// root IS (`function` / `object` / `method`), `segments` says how it is
// spelled (`getRoot`, `self.root`, `parent.get`).

const { parseWhere, toList } = require("../utils/where");
const { FACT_KINDS } = require("../entities/kinds");

// Keys of a role that describe the role itself, not an action on it.
const ROLE_KEYS = new Set(["slug", "name", "infer", "report", "actions"]);

// `infer` entries: a bare string is a REFERENCE to another role ("this is code
// that already got that role"), which is how roles compose.
const parseInfer = (entry) => (typeof entry === "string" ? { role: { equals: entry } } : entry);

// What a chain root IS. `scope`, not `kind`: this entry describes a place code
// is reached from, and `kind` already means "the ts-morph kind of a node"
// everywhere else in the engine.
const SCOPES = ["function", "object", "method"];

// One `scopeAccess` entry — what the root is, and how it is spelled:
//   { scope: function, segments: [getRoot] }        `getRoot(self).x`
//   { scope: object,   segments: [self, root] }     `self.root.x`
//   { scope: method,   segments: [parent, get] }    `parent.get("n").x`
const normalizeScopeAccessor = (e) => {
	if (typeof e === "string") return { scope: "function", segments: [e] };
	const scope = e?.scope;
	if (!SCOPES.includes(scope)) {
		throw new Error(`scopeAccess scope must be one of ${SCOPES.join(" | ")}, got ${JSON.stringify(scope)}`);
	}
	const segments = toList(e.segments).map(String);
	if (!segments.length || segments.some((x) => !x)) throw new Error(`scopeAccess entry for scope "${scope}" needs a non-empty segments list`);
	return { scope, segments };
};

// Everything an action may carry, and how each key is read. This map IS the
// validation: a key that is not here is a rule the YAML believes it made, and
// is rejected by name. There is no second list to keep in sync.
const ACTION_KEYS = {
	where: (spec, roles) => parseWhere(spec.where, roles),
	// `of: call` — this action is checked against the `call` fact class. Lets a
	// design use its own vocabulary (emit / subscribe / dispatch / provide)
	// without the engine knowing that vocabulary.
	of: (spec) => {
		if (!FACT_KINDS.includes(spec.of)) {
			throw new Error(`codeRoles: action says \`of: ${spec.of}\` — the fact layer produces ${FACT_KINDS.join(" | ")}`);
		}
		return String(spec.of);
	},
	scopeAccess: (spec) => (toList(spec.scopeAccess).length ? toList(spec.scopeAccess).map(normalizeScopeAccessor) : null),
};

const normalizeAction = (name, spec, roles) => {
	for (const key of Object.keys(spec)) {
		if (!(key in ACTION_KEYS)) {
			throw new Error(`codeRoles: action \`${name}.${key}\` is not an action key — use ${Object.keys(ACTION_KEYS).join(", ")}`);
		}
	}
	const out = { where: parseWhere(spec.where, roles) };
	if (spec.of != null) out.of = ACTION_KEYS.of(spec);
	if (spec.scopeAccess != null) {
		const scopeAccess = ACTION_KEYS.scopeAccess(spec);
		if (scopeAccess) out.scopeAccess = scopeAccess;
	}
	return out;
};

// Roles may name other roles in `infer` (a bare string): a typo must not
// silently classify nothing.
const checkReferences = (roles) => {
	const bySlug = new Map(roles.map((r) => [r.slug, r]));
	for (const role of roles) {
		for (const entry of toList(role.infer)) {
			if (typeof entry !== "string") continue;
			if (!bySlug.has(entry)) throw new Error(`codeRoles: \`${role.slug}\` infers by unknown role \`${entry}\``);
			if (entry === role.slug) throw new Error(`codeRoles: \`${role.slug}\` infers by itself`);
		}
	}
	return roles;
};

const normalizeCodeRoles = (raw) => {
	if (!raw) return {};
	// Roles may be declared as a LIST of `{ slug, … }` entries or as a MAP
	// keyed by slug. Both normalize to the same `{ [slug]: role }` shape; in
	// the list form order matters (first match wins).
	const defs = Array.isArray(raw)
		? raw
		: Object.entries(raw).map(([k, v]) => (v && typeof v === "object" ? { ...v, slug: v.slug ?? k } : null));
	if (defs.length === 0) return {};
	for (const def of defs) {
		if (!def || typeof def !== "object") throw new Error("codeRoles: each entry must be an object with a `slug`");
		if (!def.slug) throw new Error("codeRoles: each entry needs a `slug`");
	}
	checkReferences(defs);

	const roleSlugs = new Set(defs.map((d) => d.slug));
	const out = {};
	for (const def of defs) {
		const actions = {};
		for (const [kind, spec] of Object.entries(def.actions ?? {})) {
			// `declare` is the role's own `where` — one statement, not two.
			if (!spec || typeof spec !== "object") throw new Error(`codeRoles: \`${def.slug}.actions.${kind}\` must be an object with \`where\``);
			if (spec.where == null) throw new Error(`codeRoles: \`${def.slug}.actions.${kind}\` has no \`where\``);
			actions[kind] = normalizeAction(`${def.slug}.actions.${kind}`, spec, roleSlugs);
		}
		if (def.where != null) {
			throw new Error(
				`codeRoles: \`${def.slug}.where\` — a role says WHAT code is, a node says WHERE it lives: move it to a child of the node that holds it — \`- { name: <file>, role: ${def.slug} }\` for one file, \`- { name: <folder>, role: ${def.slug} }\` for a whole folder`,
			);
		}
		for (const key of Object.keys(def)) {
			if (!ROLE_KEYS.has(key)) throw new Error(`codeRoles: \`${def.slug}.${key}\` is not a role key — actions belong under \`actions\``);
		}
		out[def.slug] = {
			slug: def.slug,
			name: def.name ?? def.slug,
			infer: toList(def.infer).map(parseInfer),
			report: def.report ?? null,
			actions,
		};
	}
	return out;
};

module.exports = {normalizeCodeRoles};

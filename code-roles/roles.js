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

const { parseWhere, toList } = require("../entities/location");
const { FACT_KINDS } = require("../entities/kinds");
const { SCHEMA } = require("../entities/schema");
const configError = require("../report/configErrors");

// Keys of a role that describe the role itself, not an action on it.
const ROLE_KEYS = new Set(SCHEMA.role);

// `infer` entries: a bare string is a REFERENCE to another role ("this is code
// that already got that role"), which is how roles compose.
const parseInfer = (entry) => (typeof entry === "string" ? { role: { equals: entry } } : entry);

// What a chain root IS. `scope`, not `kind`: this entry describes a place code
// is reached from, and `kind` already means "the ts-morph kind of a node"
// everywhere else in the engine.
const SCOPE = Object.freeze({ FUNCTION: "function", OBJECT: "object", METHOD: "method" });
const SCOPES = Object.values(SCOPE);

// One `scopeAccess` entry — what the root is, and how it is spelled:
//   { scope: function, segments: [getRoot] }        `getRoot(self).x`
//   { scope: object,   segments: [self, root] }     `self.root.x`
//   { scope: method,   segments: [parent, get] }    `parent.get("n").x`
const normalizeScopeAccessor = (e) => {
	if (typeof e === "string") return { scope: SCOPE.FUNCTION, segments: [e] };
	const scope = e?.scope;
	if (!SCOPES.includes(scope)) throw configError.scopeNotOneOf({ got: scope, allowed: SCOPES });
	const segments = toList(e.segments).map(String);
	if (!segments.length || segments.some((x) => !x)) throw configError.emptyAccessorSegments({ scope });
	return { scope, segments };
};

// Every key an action may carry, with the ONE reader for it. `where` and
// `except` are the same list shape — who may, and when that allowance stops —
// so both point at the same parser instead of a copy of it. This map IS the
// validation: a key that is not here is a rule the YAML believes it made, and
// is rejected by name.
const ACTION_KEYS = {
	where: parseWhere,
	except: parseWhere,
	// `of: call` — this action is checked against the `call` fact class. Lets a
	// design use its own vocabulary (emit / subscribe / dispatch / provide)
	// without the engine knowing that vocabulary.
	of: (value) => {
		if (!FACT_KINDS.includes(value)) {
			throw configError.unknownActionFact({ value, known: FACT_KINDS });
		}
		return String(value);
	},
	scopeAccess: (value) => (toList(value).length ? toList(value).map(normalizeScopeAccessor) : null),
};

const normalizeAction = (name, spec, roles) => {
	for (const key of Object.keys(spec)) {
		if (!(key in ACTION_KEYS)) {
			throw configError.unknownActionKey({ name, key, allowed: Object.keys(ACTION_KEYS) });
		}
	}
	const out = {};
	for (const [key, read] of Object.entries(ACTION_KEYS)) {
		if (spec[key] == null) continue;
		const value = read(spec[key], roles);
		if (value != null) out[key] = value;
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
			if (!bySlug.has(entry)) throw configError.roleInfersUnknown({ role: role.slug, entry });
			if (entry === role.slug) throw configError.roleInfersItself({ role: role.slug });
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
		if (!def || typeof def !== "object") throw configError.roleNotAnObject();
		if (!def.slug) throw configError.roleWithoutSlug();
	}
	checkReferences(defs);

	const roleSlugs = new Set(defs.map((d) => d.slug));
	const out = {};
	for (const def of defs) {
		const actions = {};
		for (const [kind, spec] of Object.entries(def.actions ?? {})) {
			// `declare` is the role's own `where` — one statement, not two.
			if (!spec || typeof spec !== "object") throw configError.actionNotAnObject({ role: def.slug, action: kind });
			if (spec.where == null) throw configError.actionWithoutWhere({ role: def.slug, action: kind });
			actions[kind] = normalizeAction(`${def.slug}.actions.${kind}`, spec, roleSlugs);
		}
		if (def.where != null) {
			throw configError.roleWhereNotAllowed({ role: def.slug });
		}
		for (const key of Object.keys(def)) {
			if (!ROLE_KEYS.has(key)) throw configError.unknownRoleKey({ role: def.slug, key, allowed: SCHEMA.role });
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

module.exports = {normalizeCodeRoles, SCOPE};

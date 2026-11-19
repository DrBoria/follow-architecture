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

import { parseWhere, toList } from "../entities/location";
import { FACT_KINDS } from "../entities/kinds";
import { SCHEMA } from "../entities/schema";
import { isObj, fieldOf, type FieldValue } from "../utils/field";
import { keyedDefs } from "../utils/keyed";
import { typedField } from "../utils/typed-field";
import { mapRecord } from "../utils/map-record";
import * as configError from "../report/configErrors";
import type { ActionDef, CodeRoles, QueryFilter, RawCodeRoles, RawRole, RoleDef, ScopeAccessor } from "../entities/architecture";

// Keys of a role that describe the role itself, not an action on it.
const ROLE_KEYS = new Set(SCHEMA.role);

// `infer` entries: a bare string is a REFERENCE to another role ("this is code
// that already got that role"), which is how roles compose.
const parseInfer = (entry: FieldValue): QueryFilter => (typeof entry === "string" ? { role: { equals: entry } } : entry);

// What a chain root IS. `scope`, not `kind`: this entry describes a place code
// is reached from, and `kind` already means "the ts-morph kind of a node"
// everywhere else in the engine.
const SCOPE = Object.freeze({ FUNCTION: "function", OBJECT: "object", METHOD: "method" });
const SCOPES: string[] = Object.values(SCOPE);

// One `scopeAccess` entry — what the root is, and how it is spelled:
//   { scope: function, segments: [getRoot] }        `getRoot(self).x`
//   { scope: object,   segments: [self, root] }     `self.root.x`
//   { scope: method,   segments: [parent, get] }    `parent.get("n").x`
// The scope is read through the shared typed-field walk; a bare string is the
// function scope's own spelling.
const isScopeName = (v: FieldValue): v is string => typeof v === "string" && SCOPES.includes(v);

const accessorScopeOf = (e: FieldValue): string => {
	const scope = typedField(e, "scope", isScopeName);
	if (scope === undefined) throw configError.scopeNotOneOf({ got: fieldOf(e, "scope"), allowed: SCOPES });

	return scope;
};

const normalizeScopeAccessor = (e: FieldValue): ScopeAccessor => {
	if (typeof e === "string") return { scope: SCOPE.FUNCTION, segments: [e] };
	const scope = accessorScopeOf(e);
	const segments = toList(fieldOf(e, "segments")).map(String);
	if (!segments.length || segments.some((x) => !x)) throw configError.emptyAccessorSegments({ scope });

	return { scope, segments };
};

// The `of:` reader — this action is checked against the named fact class. Lets
// a design use its own vocabulary (emit / subscribe / dispatch / provide)
// without the engine knowing that vocabulary.
const readActionFact = (value: FieldValue): string => {
	if (typeof value !== "string" || !FACT_KINDS.includes(value)) {
		throw configError.unknownActionFact({ value, known: FACT_KINDS });
	}

	return value;
};

const readScopeAccess = (value: FieldValue): ScopeAccessor[] | null => {
	const list = toList(value);

	return list.length ? list.map(normalizeScopeAccessor) : null;
};

// Every key an action may carry, with the ONE reader for it. `where` and
// `except` are the same list shape — who may, and when that allowance stops —
// so both point at the same parser instead of a copy of it. This map IS the
// validation: a key that is not here is a rule the YAML believes it made, and
// is rejected by name.
type ActionReader = (value: FieldValue, roles: Set<string> | null) => FieldValue | ActionDef["where"] | ScopeAccessor[] | null;
const ACTION_KEYS: Record<string, ActionReader> = {
	where: (value, roles) => parseWhere(value, roles),
	except: (value, roles) => parseWhere(value, roles),
	of: (value) => readActionFact(value),
	scopeAccess: (value) => readScopeAccess(value),
};

const normalizeAction = (name: string, spec: { readonly [key: string]: FieldValue }, roles: Set<string> | null): ActionDef => {
	for (const key of Object.keys(spec)) {
		if (!(key in ACTION_KEYS)) {
			throw configError.unknownActionKey({ name, key, allowed: Object.keys(ACTION_KEYS) });
		}
	}
	const out: Record<string, FieldValue | ActionDef["where"] | ScopeAccessor[]> = {};
	for (const [key, read] of Object.entries(ACTION_KEYS)) {
		if (spec[key] == null) continue;
		const value = read(spec[key], roles);
		if (value != null) out[key] = value;
	}

	return out;
};

// Roles may name other roles in `infer` (a bare string): a typo must not
// silently classify nothing.
const checkReferences = (roles: RawRole[]): RawRole[] => {
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

// Roles may be declared as a LIST of `{ slug, … }` entries or as a MAP keyed
// by slug — the shared `keyedDefs` walk, the same one the nodes section reads.
// In the list form order matters (first match wins).
const checkDefs = (defs: (RawRole | null)[]): RawRole[] => {
	const checked: RawRole[] = [];
	for (const def of defs) {
		if (!isObj(def)) throw configError.roleNotAnObject();
		if (!def.slug) throw configError.roleWithoutSlug();
		checked.push(def);
	}

	return checked;
};

// One action spec: an object with a `where` — a permission that names nobody
// allows nobody.
const actionSpecOf = (def: RawRole, kind: string, spec: FieldValue): { readonly [key: string]: FieldValue } => {
	if (!isObj(spec)) throw configError.actionNotAnObject({ role: def.slug, action: kind });
	if (spec.where == null) throw configError.actionWithoutWhere({ role: def.slug, action: kind });

	return spec;
};

const actionsOf = (def: RawRole, roleSlugs: Set<string>): Record<string, ActionDef> => {
	const declared = isObj(def.actions) ? def.actions : {};

	// `declare` is the role's own `where` — one statement, not two. The
	// entry-by-entry walk is the shared `mapRecord` core.
	return mapRecord(declared, (kind, spec) => normalizeAction(`${def.slug}.actions.${kind}`, actionSpecOf(def, kind, spec), roleSlugs));
};

const checkRoleKeys = (def: RawRole): void => {
	if (def.where != null) throw configError.roleWhereNotAllowed({ role: def.slug });
	for (const key of Object.keys(def)) {
		if (!ROLE_KEYS.has(key)) throw configError.unknownRoleKey({ role: def.slug, key, allowed: SCHEMA.role });
	}
};

const roleOf = (def: RawRole, roleSlugs: Set<string>): RoleDef => ({
	slug: String(def.slug),
	name: typeof def.name === "string" ? def.name : String(def.slug),
	infer: toList(def.infer).map(parseInfer),
	report: typeof def.report === "string" || isObj(def.report) ? def.report : null,
	actions: actionsOf(def, roleSlugs),
});

const normalizeCodeRoles = (raw: RawCodeRoles | null | undefined): CodeRoles => {
	const defs = checkDefs(keyedDefs(raw));
	checkReferences(defs);
	const roleSlugs = new Set(defs.map((d) => String(d.slug)));
	for (const def of defs) checkRoleKeys(def);

	return Object.fromEntries(defs.map((def) => [String(def.slug), roleOf(def, roleSlugs)]));
};

export { normalizeCodeRoles, SCOPE };

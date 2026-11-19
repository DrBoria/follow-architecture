"use strict";

// The single generic filter engine. Every `when` / `where` / classification
// filter in the plugin is evaluated against a fact (a raw value collected by
// ast.js). No domain logic lives here — only operators, Keystone-GraphQL-
// filters style (https://keystonejs.com/docs/graphql/filters/).
//
// A filter is an object of entries (AND), a list of filters (AND), or null.
// Each entry is either an operator or a field of the item.
//
// Values are plain data — the `FieldValue` model every fact is written in — so
// the engine walks any fact without ever meeting `any`. The scope a `$ref` is
// read from may also carry `arch` (a built model with compiled regexes), so the
// scope is typed apart from the values.

import { compilePattern } from "../utils/pattern";
import * as configError from "../report/configErrors";
import { matchesLocation } from "./location";
import { fieldOf, isObj, isList, isRecordValue, type FieldValue } from "../utils/field";
import { readWhen } from "../utils/read-when";
import { recordWithout } from "../utils/record";
import type { QueryFilter, QueryScope, ScopeValue } from "./architecture";

// A record view of a value (never an array): used where a key would otherwise
// collide with an Array method (`filter`, `length`, …). The guards themselves are
// the ONE implementation in `utils/field`, re-exported below for the engine.
const objOf = (v: FieldValue): { readonly [key: string]: FieldValue } | null => (isRecordValue(v) ? v : null);

// A plain-data record or an `arch`-carrying scope: anything object-shaped.
type ScopeRecord = { readonly [key: string]: ScopeValue };
const isScopeRecord = (scope: QueryScope): scope is ScopeRecord => scope !== null && scope !== undefined && typeof scope === "object" && !Array.isArray(scope);

const isArchLike = (v: ScopeValue): boolean => v != null && typeof v === "object" && !Array.isArray(v) && "nodes" in v && "codeRoles" in v;
// A scope entry that is plain data (everything except `arch`).
const isFieldValue = (v: ScopeValue): v is FieldValue => !isArchLike(v);

// The `$`-scope as a plain-data fact: the facts and `fileRel`, without `arch`
// (which carries compiled regexes, not data). The record-minus-keys walk is
// the shared `recordWithout` core; the non-data keys are named by this
// engine's own verdict.
const scopeFacts = (scope: QueryScope): FieldValue => {
	if (!isScopeRecord(scope)) return scope;
	const data: Record<string, FieldValue> = {};
	const nonData: string[] = [];
	for (const [k, v] of Object.entries(scope)) {
		if (isFieldValue(v)) data[k] = v;
		else nonData.push(k);
	}

	return recordWithout(data, nonData);
};

// Operators that only make sense on a list value. `or` is NOT here — it is a
// composition op that applies to any value.
const LIST_OPS = new Set(["length", "at", "every", "any", "none", "where", "unique"]);

// Operators that COMPOSE filters instead of addressing a fact.
const COMPOSITION_OPS = new Set(["and", "or", "xor", "not"]);

// Every operator the engine knows. A filter key that is not an operator is a
// field of the item.
const KNOWN_OPS = new Set([
	"equals", "not", "lt", "lte", "gt", "gte", "in", "notIn",
	"contains", "startsWith", "endsWith", "isSet", "matches",
	"length", "at", "every", "any", "none", "where", "unique", "or", "and", "xor", "not",
	"isNull", "isEmpty",
	"location",
]);

// Resolve a `$ref` value against the facts in scope. Dot-paths are supported.
const resolveValue = (expected: FieldValue, scope: QueryScope): FieldValue => {
	if (typeof expected === "string" && expected.startsWith("$")) {
		return fieldOf(scopeFacts(scope), expected.slice(1));
	}
	return expected;
};

// `matches` — the string against the project's pattern language.
const globRe = (glob: FieldValue): RegExp => compilePattern(String(glob)).re;

const numberIf = (v: FieldValue): number | null => (typeof v === "number" ? v : null);

// Nothing inside: no items, no characters, no keys.
const emptyOf = (value: FieldValue): boolean => {
	if (isList(value)) return value.length === 0;
	if (typeof value === "string") return value.length === 0;
	if (isObj(value)) return Object.keys(value).length === 0;
	return value == null;
};

// Read ONE field off an item, the way `item?.[key]` would: a list answers
// `length` and its numeric indices, an object answers its keys, anything else
// answers nothing.
const readField = (item: FieldValue, key: string): FieldValue => {
	if (isList(item)) {
		if (key === "length") return item.length;
		return /^\d+$/.test(key) ? item[Number(key)] : undefined;
	}
	return isObj(item) ? item[key] : undefined;
};

// --- Scalar operators -------------------------------------------------------

type ScalarHandler = (value: FieldValue, expected: FieldValue, scope: QueryScope) => boolean;

const orderOf = (value: FieldValue, expected: FieldValue, scope: QueryScope): [number, number] | null => {
	const a = numberIf(value);
	const b = numberIf(resolveValue(expected, scope));
	return a != null && b != null ? [a, b] : null;
};

const scalarHandlers: Record<string, ScalarHandler> = {
	equals: (v, e, s) => v === resolveValue(e, s),
	isNull: (v, e, s) => (resolveValue(e, s) === true ? v === null : v !== null),
	isEmpty: (v, e, s) => (resolveValue(e, s) === true ? emptyOf(v) : !emptyOf(v)),
	// `{ not: <filter> }` negates a nested filter; `{ not: "x" }` is a scalar
	// inequality. The OPERAND's shape decides.
	not: (v, e, s) => (isObj(e) || isList(e) ? !matchFilter(v, e, s) : v !== resolveValue(e, s)),
	// Ordering needs two numbers: a fact the code does not have (null) is not
	// "small", it is absent.
	lt: (v, e, s) => {
		const o = orderOf(v, e, s);
		return o != null && o[0] < o[1];
	},
	lte: (v, e, s) => {
		const o = orderOf(v, e, s);
		return o != null && o[0] <= o[1];
	},
	gt: (v, e, s) => {
		const o = orderOf(v, e, s);
		return o != null && o[0] > o[1];
	},
	gte: (v, e, s) => {
		const o = orderOf(v, e, s);
		return o != null && o[0] >= o[1];
	},
	in: (v, e, s) => {
		const x = resolveValue(e, s);
		return isList(x) && x.includes(v);
	},
	notIn: (v, e, s) => {
		const x = resolveValue(e, s);
		return isList(x) && !x.includes(v);
	},
	contains: (v, e, s) => {
		const x = resolveValue(e, s);
		if (typeof v === "string") return v.includes(String(x));
		if (isList(v)) return v.includes(x);
		return false;
	},
	startsWith: (v, e, s) => typeof v === "string" && v.startsWith(String(resolveValue(e, s))),
	endsWith: (v, e, s) => typeof v === "string" && v.endsWith(String(resolveValue(e, s))),
	isSet: (v, e, s) => {
		const x = resolveValue(e, s);
		if (x === true) return v !== undefined && v !== null;
		if (x === false) return v === undefined || v === null;
		return false;
	},
	matches: (v, e, s) => typeof v === "string" && globRe(resolveValue(e, s)).test(v),
	// The place question is answered in ONE module (`entities/location`).
	location: (v, e, s) => matchesLocation(v, resolveValue(e, s), s, (loc, filter) => matchFilter(loc, filter, s)),
	// Scalar-level OR: passes when ANY sub-filter matches the value.
	or: (v, e, s) => {
		const x = resolveValue(e, s);
		return isList(x) && x.some((f) => matchFilter(v, f, s));
	},
	// Filter-level AND of sub-filters against the same value.
	and: (v, e, s) => {
		const x = resolveValue(e, s);
		return isList(x) && x.every((f) => matchFilter(v, f, s));
	},
	// Exactly one: "either a factory or a generator, not both".
	xor: (v, e, s) => {
		const x = resolveValue(e, s);
		return isList(x) && x.filter((f) => matchFilter(v, f, s)).length === 1;
	},
};

const matchScalar = (value: FieldValue, op: string, expected: FieldValue, scope: QueryScope): boolean => {
	const handler = scalarHandlers[op];
	if (!handler) throw configError.unknownOperator({ op });
	return handler(value, expected, scope);
};

// --- List operators ---------------------------------------------------------

// Which items of a list-entry a filter names — the ONE reader of the list
// vocabulary.
const innerFilterOf = (sub: FieldValue): QueryFilter | null => {
	const obj = objOf(sub);
	if (!obj) return null;
	if (obj.any !== undefined) return obj.any;
	if (obj.every !== undefined) return obj.every;
	if (obj.none !== undefined) return obj.none;
	if (objOf(obj.where)) return objOf(obj.where)?.filter ?? null;

	return sub;
};

// The items of a list a list-entry names for one item's filter, keeping the
// element type so a typed caller reads the same facts back.
const hitOf = <T extends FieldValue>(list: readonly T[], sub: FieldValue, scope: QueryScope): T[] => {
	const inner = innerFilterOf(sub);

	return inner == null ? [] : list.filter((item) => matchFilter(item, inner, scope));
};

// `Array.prototype.at` semantics: `-1` is the last element, `-2` the one before.
const elementAt = (list: readonly FieldValue[], index: number): FieldValue => (index < 0 ? list[list.length + index] : list[index]);

// The `at` entry's element filter: everything except the `index` key — the
// shared record-minus-keys walk.
const withoutIndex = (expected: FieldValue): QueryFilter => recordWithout(expected, ["index"]);

type ListHandler = (list: readonly FieldValue[], expected: FieldValue, scope: QueryScope) => boolean;

const listHandlers: Record<string, ListHandler> = {
	length: (l, e, s) => matchFilter(l.length, e, s),
	at: (l, e, s) => {
		const obj = objOf(e);
		const index = obj ? obj.index : e;
		if (typeof index !== "number") throw configError.atWithoutIndex();
		const item = elementAt(l, index);
		// No such element is not a match.
		if (item === undefined) return false;

		return matchFilter(item, withoutIndex(e), s);
	},
	every: (l, e, s) => l.every((item) => matchFilter(item, e, s)),
	any: (l, e, s) => l.some((item) => matchFilter(item, e, s)),
	none: (l, e, s) => l.every((item) => !matchFilter(item, e, s)),
	where: (l, e, s) =>
		// { where: { filter: <narrowing filter>, by: <filter on narrowed list> } }
		// The expected value is read only when it is a record — the shared
		// qualified read; the narrowing itself is this operator's own.
		readWhen(
			objOf(e),
			(obj) => obj !== null,
			(obj) => matchFilter(hitOf(l, { where: { filter: obj.filter } }, s), obj.by, s),
			false,
		),
	// { unique: { field: "line" } } — every entry has a DISTINCT value for
	// `field`, compared with Set / SameValueZero.
	unique: (l, e) => {
		const field = objOf(e)?.field ?? null;
		const values = l.map((item) => (field != null ? fieldOf(item, String(field)) : item));

		return new Set(values).size === values.length;
	},
};

const matchList = (list: readonly FieldValue[], op: string, expected: FieldValue, scope: QueryScope): boolean => {
	const handler = listHandlers[op];
	if (!handler) throw configError.unknownListOperator({ op });
	return handler(list, expected, scope);
};

// --- Filter evaluation ------------------------------------------------------

// One entry of a filter: an operator, or a field of the item.
const matchEntry = (item: FieldValue, key: string, expected: FieldValue, scope: QueryScope): boolean => {
	const isOp = KNOWN_OPS.has(key);
	const value = isOp ? item : readField(item, key);
	if (isOp && LIST_OPS.has(key)) return isList(value) && matchList(value, key, expected, scope);
	if (isOp) return matchScalar(value, key, expected, scope);
	// Field access: the expected value is itself a filter on the field. A key
	// with dots is a path into a nested fact.
	let fieldValue = value;
	if (fieldValue === undefined && key.includes(".")) fieldValue = fieldOf(item, key);
	return matchFilter(fieldValue, expected, scope);
};

// A filter is an object of entries (AND), a list of filters (AND), or null.
const matchFilter = (item: FieldValue, filter: QueryFilter, scope: QueryScope): boolean => {
	if (filter === null || filter === undefined) return true;
	if (isList(filter)) return filter.every((f) => matchFilter(item, f, scope));
	if (!isObj(filter)) return false;
	for (const [key, expected] of Object.entries(filter)) {
		if (!matchEntry(item, key, expected, scope)) return false;
	}
	return true;
};

// `matches` — single filter against a value. When no explicit scope is given,
// the value itself is the scope, so `$refs` resolve against the item.
const matches = (value: FieldValue, filter: QueryFilter, scope: QueryScope | null = null): boolean => matchFilter(value, filter, scope ?? value);

// `passes` — AND-list of filters, all must pass against the same value.
const passes = (value: FieldValue, filters: QueryFilter, scope: QueryScope = null): boolean => {
	if (!isList(filters)) return matchFilter(value, filters, scope);
	return filters.every((f) => matchFilter(value, f, scope));
};

export { COMPOSITION_OPS, KNOWN_OPS, matches, passes, innerFilterOf, hitOf, isList, isObj };

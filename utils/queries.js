"use strict";

// The single generic filter engine. Every `when` / `where` / classification
// filter in the plugin is evaluated against a fact (a raw value collected by
// ast.js). No domain logic lives here — only operators, Keystone-GraphQL-
// filters style (https://keystonejs.com/docs/graphql/filters/).
//
// A filter is:
//   • an object of entries — AND of all entries;
//   • a list of filters — AND of all sub-filters;
//   • null/undefined — always passes.
//
// Each entry is either an operator (below) or a field of the item:
//   { kind: { in: [...] } } → item.kind must pass { in: [...] }.
//
// Scalar operators: equals, not, lt, lte, gt, gte, in, notIn, contains,
//   startsWith, endsWith, isSet, setEquals, globMatches
// List operators (list value only): length, every, some, none, where, or
// Location:
//   `location` — the item's `path` (or the item itself when it is a string)
//   matched against a location entry: a glob string, { node: "slug" },
//   or a query filter — the same interface as `location.allowedFrom`.
// Composition:
//   `or` — list of filters; passes when ANY sub-filter passes.
//   `where` — { filter, by }: narrows the list, then applies `by` to it.
//   A filter value starting with `$` references another fact in scope
//   (e.g. { equals: "$parentFolder" }).
//
// There is deliberately NO arbitrary-eval operator. Facts are raw data
// (ast.js records what the code IS, not pre-digested booleans), and this
// single filter interface is enough to express any check — the same one the
// invariant `when` gate uses, so every place in the plugin speaks one language.

const { compilePattern } = require("./pattern");

const isList = (v) => Array.isArray(v);
const isObj = (v) => v !== null && typeof v === "object" && !isList(v);

// Operators that only make sense on a list value. `or` is NOT here — it is
// a composition op that applies to any value (see matchScalar).
const LIST_OPS = new Set(["length", "every", "some", "none", "where"]);

// Every operator the engine knows. A filter key that is not an operator is
// treated as a field of the item: { kind: { in: [...] } } → item.kind.
const KNOWN_OPS = new Set([
	"equals", "not", "lt", "lte", "gt", "gte", "in", "notIn",
	"contains", "startsWith", "endsWith", "isSet", "setEquals", "globMatches",
	"length", "every", "some", "none", "where", "or",
	"location",
]);

// Resolve a `$ref` value against the facts in scope. Dot-paths are supported
// (`$path.dir` → scope.path.dir).
const resolveValue = (expected, scope) => {
	if (typeof expected === "string" && expected.startsWith("$")) {
		return expected.slice(1).split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), scope);
	}
	return expected;
};

const globRe = (glob) => compilePattern(String(glob)).re;

// --- Scalar operators -------------------------------------------------------

const matchScalar = (value, op, expected, scope) => {
	const exp = resolveValue(expected, scope);
	switch (op) {
		case "equals":
			return value === exp;
		case "not":
			return value !== exp;
		case "lt":
			return value < exp;
		case "lte":
			return value <= exp;
		case "gt":
			return value > exp;
		case "gte":
			return value >= exp;
		case "in":
			return isList(exp) && exp.includes(value);
		case "notIn":
			return isList(exp) && !exp.includes(value);
		case "contains":
			if (typeof value === "string") return value.includes(String(exp));
			if (isList(value)) return value.includes(exp);
			return false;
		case "startsWith":
			return typeof value === "string" && value.startsWith(String(exp));
		case "endsWith":
			return typeof value === "string" && value.endsWith(String(exp));
		case "isSet":
			if (exp === true) return value !== undefined && value !== null;
			if (exp === false) return value === undefined || value === null;
			return false;
		case "setEquals":
			if (!isList(value) || !isList(exp)) return false;
			if (value.length !== exp.length) return false;
			return value.every((v) => exp.includes(v));
		case "globMatches":
			return typeof value === "string" && globRe(exp).test(value);
		case "location": {
			// { location: "glob" } / { location: { node: "slug" } } / { location: { <query> } }
			// Same location-entry interface as `location.allowedFrom`.
			const itemPath = typeof value === "object" && value !== null ? value.path : value;
			if (typeof itemPath !== "string") return false;
			if (typeof exp === "string") {
				return compilePattern(exp).re.test(itemPath);
			}
			if (isObj(exp) && typeof exp.node === "string") {
				const node = scope?.arch?.nodes?.bySlug?.[exp.node];
				if (!node) return false;
				return node.variants.some((v) => v.re.test(itemPath));
			}
			// query form: evaluate the filter against the item itself
			return matchFilter(value, exp, scope);
		}
		case "or":
			// Scalar-level OR: passes when ANY sub-filter matches the value.
			return isList(exp) && exp.some((f) => matchFilter(value, f, scope));
		default:
			throw new Error(`queries: unknown operator \`${op}\``);
	}
};

// --- List operators ---------------------------------------------------------

const matchList = (value, op, expected, scope) => {
	const list = isList(value) ? value : [];
	switch (op) {
		case "length":
			// { length: { gt: 2 } } — a scalar filter on list.length.
			return matchFilter(list.length, expected, scope);
		case "every":
			return list.every((item) => matchFilter(item, expected, scope));
		case "some":
			return list.some((item) => matchFilter(item, expected, scope));
		case "none":
			return list.every((item) => !matchFilter(item, expected, scope));
		case "where": {
			// { where: { filter: <narrowing filter>, by: <filter on narrowed list> } }
			const narrowed = list.filter((item) => matchFilter(item, expected.filter, scope));
			return matchFilter(narrowed, expected.by, scope);
		}
		default:
			throw new Error(`queries: unknown list operator \`${op}\``);
	}
};

// --- Filter evaluation ------------------------------------------------------

// A filter is an object of entries (AND), a list of filters (AND), or null.
// An entry key that is not a known operator is a field of the item.
const matchFilter = (item, filter, scope) => {
	if (filter === null || filter === undefined) return true;
	if (isList(filter)) return filter.every((f) => matchFilter(item, f, scope));
	if (!isObj(filter)) return false;
	for (const [key, expected] of Object.entries(filter)) {
		const isOp = KNOWN_OPS.has(key);
		let value = isOp ? item : item?.[key];
		// List ops apply to a list value only; a missing / non-list field
		// simply fails the filter (a candidate without `returns` does not
		// match `returns: { some: ... }` — it is not an error).
		if (isOp && LIST_OPS.has(key)) {
			if (!isList(value)) return false;
			if (!matchList(value, key, expected, scope)) return false;
		} else if (isOp) {
			if (!matchScalar(value, key, expected, scope)) return false;
		} else {
			// Field access: the expected value is itself a filter on the field.
			// A key with dots is a path into a nested fact (`"path.dir": {...}`
			// ≡ `path: { dir: {...} }`).
			if (value === undefined && key.includes(".")) value = key.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), item);
			if (!matchFilter(value, expected, scope)) return false;
		}
	}
	return true;
};

// `matches` — single filter (object or list) against a value. When no
// explicit scope is given, the value itself is the scope, so `$refs` in a
// filter resolve against the item being matched (`$name` in a candidate
// filter → the candidate's own name).
const matches = (value, filter, scope) => matchFilter(value, filter, scope ?? value);

// `passes` — AND-list of filters, all must pass against the same value.
const passes = (value, filters, scope) => {
	if (!isList(filters)) return matchFilter(value, filters, scope);
	return filters.every((f) => matchFilter(value, f, scope));
};

module.exports = { matches, passes, matchScalar, matchList, matchFilter, resolveValue, KNOWN_OPS, LIST_OPS };

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
//   { roles: { any: { equals: "store" } } } → the item's `roles` list must pass it.
// A structured fact is addressed the same way, one field at a time — there is no
// shorthand: `{ kind: { own: { is: { in: [...] } } } }`, never `{ kind: { in: [...] } }`.
//
// Scalar operators: equals, not, lt, lte, gt, gte, in, notIn, contains,
//   startsWith, endsWith, isSet, setEquals, globMatches
// List operators (list value only): length, every, any, none, where
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

const { compilePattern } = require("../utils/pattern");
const { fieldOf } = require("../utils/field");

const isList = (v) => Array.isArray(v);
const isObj = (v) => v !== null && typeof v === "object" && !isList(v);

// Operators that only make sense on a list value. `or` is NOT here — it is
// a composition op that applies to any value (see matchScalar).
const LIST_OPS = new Set(["length", "every", "any", "none", "where"]);

// Operators that COMPOSE filters instead of addressing a fact. The matcher
// reads this list, and so does anything that must look THROUGH a filter without
// evaluating it (invariants: "is this a file rule or a candidate rule?"). One
// list, two readers.
const COMPOSITION_OPS = new Set(["and", "or", "xor", "not"]);

// Every operator the engine knows. A filter key that is not an operator is
// treated as a field of the item: { name: { equals: "x" } } → item.name.
const KNOWN_OPS = new Set([
	"equals", "not", "lt", "lte", "gt", "gte", "in", "notIn",
	"contains", "startsWith", "endsWith", "isSet", "setEquals", "globMatches",
	"length", "every", "any", "none", "where", "or", "and", "xor", "not",
	"isNull", "isEmpty", "mode",
	"location",
]);

// Resolve a `$ref` value against the facts in scope. Dot-paths are supported
// (`$path.dir` → scope.path.dir).
const resolveValue = (expected, scope) => {
	if (typeof expected === "string" && expected.startsWith("$")) {
		return fieldOf(scope, expected.slice(1));
	}
	return expected;
};

const globRe = (glob) => compilePattern(String(glob)).re;

// --- Scalar operators -------------------------------------------------------

// Case-insensitive comparison, Keystone-style: `{ contains: "Ab", mode:
// "insensitive" }` — `mode` is read from the FILTER, so it never becomes part
// of the value being compared.
const insensitive = (filter) => filter?.mode === "insensitive";

const matchScalar = (value, op, expected, scope, filter) => {
	const exp = resolveValue(expected, scope);
	const ci = insensitive(filter) && typeof value === "string" && typeof exp === "string";
	const eq = (a, b) => (ci ? String(a).toLowerCase() === String(b).toLowerCase() : a === b);
	switch (op) {
		case "equals":
			return ci ? eq(value, exp) : value === exp;
		case "mode":
			// A modifier of the sibling operators, never a test on its own.
			return true;
		case "isNull":
			return exp === true ? value === null : value !== null;
		case "isEmpty":
			// Nothing inside: no items, no characters, no keys.
			return exp === true ? (isList(value) ? value.length === 0 : typeof value === "string" ? value.length === 0 : isObj(value) ? Object.keys(value).length === 0 : value == null) : !(isList(value) ? value.length === 0 : typeof value === "string" ? value.length === 0 : isObj(value) ? Object.keys(value).length === 0 : value == null);
		case "not":
			// `{ not: <filter> }` negates a nested filter; `{ not: "x" }` is a
			// scalar inequality. The OPERAND's shape decides, so both read
			// naturally — and there is exactly one place where `not` is handled.
			if (isObj(expected) || isList(expected)) return !matchFilter(value, expected, scope);
			return value !== exp;
		// Ordering needs two numbers: a fact the code does not have (null) is
		// not "small", it is absent — a null fact is not an empty one.
		case "lt":
			return typeof value === "number" && value < exp;
		case "lte":
			return typeof value === "number" && value <= exp;
		case "gt":
			return typeof value === "number" && value > exp;
		case "gte":
			return typeof value === "number" && value >= exp;
		case "in":
			return isList(exp) && exp.includes(value);
		case "notIn":
			return isList(exp) && !exp.includes(value);
		case "contains":
			if (typeof value === "string") return ci ? String(value).toLowerCase().includes(String(exp).toLowerCase()) : value.includes(String(exp));
			if (isList(value)) return value.includes(exp);
			return false;
		case "startsWith":
			return typeof value === "string" && (ci ? value.toLowerCase().startsWith(String(exp).toLowerCase()) : value.startsWith(String(exp)));
		case "endsWith":
			return typeof value === "string" && (ci ? value.toLowerCase().endsWith(String(exp).toLowerCase()) : value.endsWith(String(exp)));
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
			// ONE place to ask "where is this code?" — a candidate, a file, an edge
			// and a bare path all answer it the same way.
			//   { location: "glob" }            the path matched as a glob
			//   { location: { node: "slug" } }  the path inside that node
			//   { location: { piece: … } }      a field OF the location itself
			// Same location-entry interface as `location.allowedFrom`.
			const loc = value !== null && typeof value === "object" && value.location != null ? value.location : value;
			const itemPath = typeof loc === "string" ? loc : loc?.path;
			if (typeof itemPath !== "string") return false;
			if (typeof exp === "string") {
				return compilePattern(exp).re.test(itemPath);
			}
			if (isObj(exp) && typeof exp.node === "string") {
				const node = scope?.arch?.nodes?.bySlug?.[exp.node];
				if (!node) return false;
				return node.variants.some((v) => v.re.test(itemPath));
			}
			// `{ location: { role } }` — the path is one of the places that role is
			// declared to live in. The same question `where: [{ role }]` asks about a
			// file, asked about the file a VALUE was declared by: "is the thing this
			// code writes into a store?" needs the role, not a list of store paths.
			if (isObj(exp) && typeof exp.role === "string") {
				return (scope?.arch?.nodes?.roleHomes?.[exp.role] ?? []).some((h) => compilePattern(h.template).re.test(itemPath));
			}
			// query form: evaluate the filter against the LOCATION itself, so
			// `{ location: { piece: { isNull: true } } }` reads "at module scope".
			return matchFilter(loc, exp, scope);
		}
		case "or":
			// Scalar-level OR: passes when ANY sub-filter matches the value.
			return isList(exp) && exp.some((f) => matchFilter(value, f, scope));
		case "and":
			// Filter-level AND of sub-filters against the same value — the
			// explicit form of what a filter list already means, usable inside
			// an `or` (where a list would be ambiguous).
			return isList(exp) && exp.every((f) => matchFilter(value, f, scope));
		case "xor":
			// Exactly one: "either a factory or a generator, not both".
			return isList(exp) && exp.filter((f) => matchFilter(value, f, scope)).length === 1;
		default:
			throw new Error(`queries: unknown operator \`${op}\``);
	}
};

// --- List operators ---------------------------------------------------------

// What a list entry demands of ONE item. `{ any: <sub> }`, `{ every: <sub> }`,
// `{ none: <sub> }`, `{ where: { filter: <sub> } }` and a bare filter all name
// the same thing, so the extraction lives here — the ONE place that reads the
// list vocabulary. Anything that needs "which items does this entry talk about"
// asks this function instead of repeating the `??` chain.
const innerFilterOf = (sub) => {
	if (!isObj(sub)) return null;
	if (sub.any !== undefined) return sub.any;
	if (sub.every !== undefined) return sub.every;
	if (sub.none !== undefined) return sub.none;
	if (isObj(sub.where)) return sub.where.filter ?? null;

	return sub;
};

// The items of a list a list-entry names for one item's filter — the same
// reading as `innerFilterOf`, applied.
const hitOf = (list, sub, scope) => {
	const inner = innerFilterOf(sub);

	return inner == null ? [] : list.filter((item) => matchFilter(item, inner, scope));
};

const matchList = (value, op, expected, scope) => {
	const list = isList(value) ? value : [];
	switch (op) {
		case "length":
			// { length: { gt: 2 } } — a scalar filter on list.length.
			return matchFilter(list.length, expected, scope);
		case "every":
			return list.every((item) => matchFilter(item, expected, scope));
		case "any":
			return list.some((item) => matchFilter(item, expected, scope));
		case "none":
			return list.every((item) => !matchFilter(item, expected, scope));
		case "where":
			// { where: { filter: <narrowing filter>, by: <filter on narrowed list> } }
			return matchFilter(hitOf(list, { where: { filter: expected.filter } }, scope), expected.by, scope);
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
		// match `returns: { any: ... }` — it is not an error).
		if (isOp && LIST_OPS.has(key)) {
			if (!isList(value)) return false;
			if (!matchList(value, key, expected, scope)) return false;
		} else if (isOp) {
			if (!matchScalar(value, key, expected, scope, filter)) return false;
		} else {
			// Field access: the expected value is itself a filter on the field.
			// A key with dots is a path into a nested fact (`"path.dir": {...}`
			// ≡ `path: { dir: {...} }`).
			if (value === undefined && key.includes(".")) value = fieldOf(item, key);
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

module.exports = { COMPOSITION_OPS, matches, passes, innerFilterOf, hitOf };

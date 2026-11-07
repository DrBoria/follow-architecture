"use strict";

// Normalize an invariant from the YAML into the runtime shape the gates and
// checkers consume.
//
// An invariant is: WHERE it applies (`where`), where it does NOT (`ignore`),
// and what it forbids (`infer`). Both `where` and `ignore` are the same
// mechanism the code roles use (utils/where.js).
//
// `infer` is the SAME key as in a codeRole, because it is the SAME filter
// language: the difference is only what a match means. In a role a match says
// "this code IS that role"; in an invariant it says "this file breaks the
// rule". There is one check: a finding when the filter matches. "This must be
// true" is the same filter under `not:` — the language already has it, so a
// second key would be a second way to say one thing.

const { parseWhere, matchesWhere, toList } = require("../entities/location");

// Every key an invariant may carry — anything else is a declaration the config
// believes it made, so it fails loudly instead of doing nothing.
const INVARIANT_KEYS = new Set(["id", "where", "ignore", "when", "infer", "report", "dedupeBy", "children"]);

const checkKeys = (raw) => {
	for (const key of Object.keys(raw)) {
		if (INVARIANT_KEYS.has(key)) continue;
		throw new Error(`invariant ${raw.id}: \`${key}\` is not a key — an invariant is ${[...INVARIANT_KEYS].join(", ")}`);
	}
};

// `dedupeBy` is `where` vocabulary, not a fact name. A bare string that is not
// a declared role and not a path is a mistake worth failing on: `path.dir`
// used to be a fact name and would now silently match no path at all.
const parseDedupe = (raw, roles) => {
	const entries = parseWhere(raw, roles);
	for (const entry of entries) {
		if (entry.type !== "glob") continue;
		if (!entry.glob.includes("/") && !entry.glob.includes("*")) {
			throw new Error(`invariant: \`dedupeBy: ${entry.glob}\` is not a place — use a \`where\` entry (\`{ node: <slug> }\`, a glob, or a filter)`);
		}
	}
	return entries;
};

// `roles` (a Set of declared slugs) is only needed so a bare string naming a
// role is read as a role reference instead of a glob — the same rule the
// code-role actions follow.
const normalizeInvariant = (raw, roles = null) => {
	if (!raw || typeof raw !== "object") throw new Error("invariant: expected an object");
	if (!raw.id) throw new Error("invariant: missing id");
	checkKeys(raw);
	return {
		id: String(raw.id),
		// The SAME `where` mechanism the code-role actions use.
		where: parseWhere(raw.where, roles),
		ignore: parseWhere(raw.ignore, roles),
		when: raw.when ?? null,
		// A finding when a filter MATCHES. "Must be true" is the same filter
		// under `not:` — one check, one direction, negation in the filter.
		infer: toList(raw.infer),
		report: raw.report ?? null,
		// WHERE the findings are counted: a `where` entry, the same vocabulary
		// the roles use. `{ node: feature }` = one finding per feature folder,
		// a glob = one per matched folder, a filter = one per file's folder.
		// The engine only counts — the entry says which place.
		dedupeBy: parseDedupe(raw.dedupeBy, roles),
		children: toList(raw.children).map((c) => normalizeInvariant(c, roles)),
	};
};

module.exports = { normalizeInvariant };

"use strict";

// Normalize an invariant from the YAML into the runtime shape the gates and
// checkers consume. The `where` globs are compiled to regexes (they support
// naming-convention placeholders via compilePattern); the `except` globs are
// kept as string arrays (tested with minimatch at check time); the `when`
// predicate is kept as a string (parsed at check time); the check blocks are
// passed through.

const { compilePattern } = require("../utils/pattern");

const listOf = (v) => (v == null ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);

const normalizeInvariant = (raw) => {
	if (!raw || typeof raw !== "object") throw new Error("invariant: expected an object");
	if (!raw.id) throw new Error("invariant: missing id");
	return {
		id: String(raw.id),
		node: raw.node == null ? "*" : String(raw.node),
		where: listOf(raw.where).map((p) => compilePattern(p)),
		except: listOf(raw.except).map((p) => compilePattern(p)),
		when: raw.when ?? null,
		forbid: Array.isArray(raw.forbid) ? raw.forbid : [],
		must: Array.isArray(raw.must) ? raw.must : [],
		assert: raw.assert && typeof raw.assert === "object" ? raw.assert : null,
		report: raw.report ?? null,
		// A fact name (e.g. "folder"): file-level findings from this invariant
		// are reported once per distinct value of that fact across the run, so
		// a per-folder rule fires once per folder instead of once per file.
		dedupeBy: raw.dedupeBy == null ? null : String(raw.dedupeBy),
		children: Array.isArray(raw.children) ? raw.children.map(normalizeInvariant) : [],
	};
};

module.exports = { normalizeInvariant };

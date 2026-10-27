"use strict";

// The invariant runtime. Gates (except, where, when) run first; then the
// check blocks are evaluated as plain filters against the file's raw facts
// (collected by ast.js, attached to the ctx by the pipeline). No named rule
// kinds, no domain logic — every check is a filter from the YAML.
//
//   forbid: [ <filter>, ... ]  — a finding when a filter MATCHES the facts.
//   must:   [ <filter>, ... ]  — a finding when a filter DOES NOT match.
//   assert: <filter>           — a finding when the filter does not match.
//
// A forbid filter that targets candidate facts (it has no file-level field of
// its own) is applied to each candidate in facts.candidates; the matching
// candidate supplies the line and name for the finding.

const { matches } = require("../utils/queries");
const { fileVars } = require("./name");
const { matchWhere } = require("./where");

// File-level facts a forbid filter may reference directly. If none of the
// filter's keys is one of these, the filter is a candidate-level filter.
// Dot-path keys (`"path.dir"`) count as the fact they point into.
const FILE_FACT_KEYS = new Set(["lines", "imports", "exports", "path", "scopeAccesses", "descendants", "candidates", "roles"]);

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const isCandidateFilter = (f) => isObj(f) && !Object.keys(f).some((k) => FILE_FACT_KEYS.has(k) || FILE_FACT_KEYS.has(k.split(".")[0]));

// A check's `report` is the message template for its findings, not a filter
// key — strip it before matching so it is not treated as a fact field.
const filterOf = (entry) => {
	const { report: _report, ...filter } = entry;
	return filter;
};

// Report variables for file-level findings: the path vars plus every scalar
// file fact (lines, …) and every scalar inside a nested fact object (the
// `path` fact: dir, fileName, filesPerFolder, …) so a report can say
// `{lines} lines` or `{filesPerFolder} files` without hardcoding.
const enrichedVars = (ctx) => {
	const facts = ctx.facts ?? {};
	const vars = fileVars(ctx);
	for (const [k, v] of Object.entries(facts)) {
		if (typeof v === "number" || typeof v === "string") vars[k] = v;
		else if (isObj(v)) for (const [sk, sv] of Object.entries(v)) if (typeof sv === "number" || typeof sv === "string") vars[sk] = sv;
	}

	return vars;
};

// A file-level `imports: { some: ... }` forbid that matched: the offending
// import sources, so a report can name `{what}`.
const importWhat = (facts, entry) => {
	if (!isObj(entry) || !isObj(entry.imports)) return null;
	const some = entry.imports.some;
	if (!isObj(some)) return null;
	const hit = (facts.imports ?? []).find((imp) => matches(imp, some));
	return hit ? [hit.source] : null;
};

// A file-level `candidates: { some: ... }` forbid that matched: the first
// matching candidate's name, so a report can name `{what}`.
const candidateWhat = (facts, entry) => {
	if (!isObj(entry) || !isObj(entry.candidates)) return null;
	const some = entry.candidates.some;
	if (!isObj(some)) return null;
	const hit = (facts.candidates ?? []).find((c) => matches(c, some));
	return hit?.name ? [hit.name] : null;
};

// When an invariant sets `dedupeBy: <fact>`, file-level findings are reported
// once per distinct value of that fact across the whole run (the dedupe map is
// shared across files). This turns a per-file "folder must contain X" rule into
// one finding per folder instead of one per file. Dot-paths work
// (`dedupeBy: path.dir`).
const deduped = (inv, facts, dedupe) => {
	if (!inv.dedupeBy || !dedupe) return false;
	const val = String(inv.dedupeBy.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), facts) ?? "");
	const seen = dedupe.get(inv.id) ?? new Set();
	if (seen.has(val)) return true;
	seen.add(val);
	dedupe.set(inv.id, seen);
	return false;
};

const checkForbid = (inv, ctx, out, findingFrom, dedupe) => {
	const facts = ctx.facts;
	if (!facts) return;
	for (const entry of inv.forbid) {
		const filter = filterOf(entry);
		if (isCandidateFilter(filter)) {
			for (const c of facts.candidates) {
				if (matches(c, filter)) {
					// `{what}`: the candidate's own name, else its parent
					// (e.g. the `.actions()` callback has no name of its own
					// — name it by the call it belongs to).
					const vars = { ...fileVars(ctx), what: c.name ?? c.calledBy ?? c.parentName ?? null, snippet: c.snippet ?? null };
					if (Array.isArray(c.mutatedParams) && c.mutatedParams.length) vars.mutatedParams = c.mutatedParams.join(", ");
						// When the filter narrows a list fact (e.g. `declarations.where`),
						// name the offending items so the report is self-sufficient —
						// no need to open the file to see WHICH declarations matched.
						for (const [field, sub] of Object.entries(filter)) {
							if (!isObj(sub) || !isObj(sub.where) || !Array.isArray(c[field])) continue;
							const hit = c[field].filter((item) => matches(item, sub.where.filter));
							if (hit.length) vars[field] = hit.map((d) => `${d.name}${d.type ? ` (${d.type})` : ""}`).join(", ");
						}
					out.push(findingFrom({ key: "forbid", report: entry.report ?? inv.report ?? null, line: c.line }, "invariant", ctx.rel, `invariant:${inv.id}:forbid`, vars));
					break;
				}
			}
		} else if (matches(facts, filter) && !deduped(inv, facts, dedupe)) {
			const vars = enrichedVars(ctx);
			const what = importWhat(facts, entry) ?? candidateWhat(facts, entry);
			if (what) vars.what = (Array.isArray(what) ? what : [what]).join(", ");
			out.push(findingFrom({ key: "forbid", report: entry.report ?? inv.report ?? null }, "invariant", ctx.rel, `invariant:${inv.id}:forbid`, vars));
		}
	}
};

const checkMust = (inv, ctx, out, findingFrom, dedupe) => {
	const facts = ctx.facts;
	if (!facts) return;
	for (const entry of inv.must) {
		if (!matches(facts, filterOf(entry)) && !deduped(inv, facts, dedupe)) {
			out.push(findingFrom({ key: "must", report: entry.report ?? inv.report ?? null }, "invariant", ctx.rel, `invariant:${inv.id}:must`, enrichedVars(ctx)));
		}
	}
};

// When an `assert` filter fails, which list values are the problem? For each
// top-level field whose filter is a bare `every: <sub>` (e.g.
// `roles: { every: { in: [...] } }`), return the items of that fact's list
// that do not match `<sub>` — the offending values, so a report can name
// `{violations}`. Fully generic: works for any fact field, not just roles.
const assertViolations = (facts, filter) => {
	const out = [];
	if (!isObj(filter)) return out;
	for (const [field, sub] of Object.entries(filter)) {
		const every = isObj(sub) && isObj(sub.every) ? sub.every : Array.isArray(sub) && isObj(sub[0]?.every) ? sub[0].every : null;
		if (!every) continue;
		const list = field.includes(".") ? field.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), facts) : facts[field];
		if (!Array.isArray(list)) continue;
		for (const item of list) if (!matches(item, every)) out.push(item);
	}
	return out;
};

const checkAssert = (inv, ctx, out, findingFrom, dedupe) => {
	const facts = ctx.facts;
	if (!facts || !inv.assert) return;
	if (!matches(facts, filterOf(inv.assert)) && !deduped(inv, facts, dedupe)) {
		const vars = enrichedVars(ctx);
		const violations = assertViolations(facts, filterOf(inv.assert));
		if (violations.length) vars.violations = violations.join(", ");
		out.push(findingFrom({ key: "assert", report: inv.assert.report ?? inv.report ?? null }, "invariant", ctx.rel, `invariant:${inv.id}:assert`, vars));
	}
};

// The top-level `report` is the message template for the checks' findings —
// not a standalone finding of its own. The gates (except/where/when) only
// decide whether the checks run at all. Exception: an invariant with NO
// checks (no forbid/must/assert) IS its own finding — passing the gates is
// the violation (e.g. a `when: { roles: { some: ... } }` rule).
const checkInvariant = (inv, ctx, out, findingFrom, dedupe) => {
	if (inv.except.some((g) => g.re.test(ctx.rel))) return;
	if (!matchWhere(inv, ctx)) return;
	if (inv.when != null && !matches(ctx.facts, inv.when)) return;
	const hasChecks = inv.forbid.length > 0 || inv.must.length > 0 || inv.assert !== null;
	if (!hasChecks && inv.report) {
		out.push(findingFrom({ key: null, report: inv.report }, "invariant", ctx.rel, `root:${inv.id}`, enrichedVars(ctx)));
	}
	checkForbid(inv, ctx, out, findingFrom, dedupe);
	checkMust(inv, ctx, out, findingFrom, dedupe);
	checkAssert(inv, ctx, out, findingFrom, dedupe);
	for (const child of inv.children) checkInvariant(child, ctx, out, findingFrom, dedupe);
};

const checkInvariants = (invariants, ctx, out, findingFrom, dedupe) => {
	for (const inv of invariants) checkInvariant(inv, ctx, out, findingFrom, dedupe);
};

module.exports = { checkInvariants, checkInvariant };

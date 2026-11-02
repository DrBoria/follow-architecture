"use strict";

// The invariant runtime. Gates (ignore, where, when) run first; then the
// check blocks are evaluated as plain filters against the file's raw facts
// (collected by ast/, attached to the ctx by the pipeline). No named rule
// kinds, no domain logic — every check is a filter from the YAML.
//
//   infer: [ <filter>, ... ]   — a finding when a filter MATCHES the facts.
//                                "This must be true" is the same filter under
//                                `not:` — one check, one direction.
//
// A filter is asked of the FILE first; only when the file does not answer is it
// asked of each candidate in facts.candidates, and the matching candidate
// supplies the line and name for the finding. Nothing declares which fact lives
// where: the facts answer for themselves.

const { matches, innerFilterOf, hitOf } = require("../entities/queries");
const { fileVars } = require("./name");
const { entryKey, checkWhere } = require("../utils/where");
const { fieldOf } = require("../utils/field");

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// A check's `report` is the message template for its findings, not a filter
// key — strip it before matching so it is not treated as a fact field.
const filterOf = (entry) => {
	const { report: _report, ...filter } = entry;
	return filter;
};

// Report variables for file-level findings: the path vars plus every scalar
// file fact and every scalar inside a nested fact object (the `path` fact: dir,
// fileName, …) so a report can say `{files} files` without hardcoding. An array
// fact reports its LENGTH — `{lines}` is how many lines there are.
const enrichedVars = (ctx) => {
	const facts = ctx.facts ?? {};
	const vars = fileVars(ctx);
	for (const [k, v] of Object.entries(facts)) {
		if (Array.isArray(v)) vars[k] = v.length;
		else if (typeof v === "number" || typeof v === "string") vars[k] = v;
		else if (isObj(v)) for (const [sk, sv] of Object.entries(v)) if (Array.isArray(sv)) vars[sk] = sv.length; else if (typeof sv === "number" || typeof sv === "string") vars[sk] = sv;
	}

	return vars;
};

// `{source}` / `{name}` / `{what}` … — the exact entries a filter matched. A rule
// about imports must name the module, a rule about calls the callee; otherwise
// the reader has to open the file to find out which one it means. WHICH fields
// can be named is read off the matched items themselves: every string field they
// carry becomes a placeholder, so no list of known names can fall behind.

// Which items a list entry is talking about: the query engine's own reading
// (`hitOf`), applied to the field this rule named. No second extraction here —
// a message naming `{ <field> }` and the check itself cannot disagree.
const listHit = (list, filter, field, scope) => {
	const sub = filter?.[field];
	if (!isObj(sub)) return list;

	return hitOf(list, sub, scope);
};

// Every scalar a piece carries, wherever it sits (`kind.chain.depth`), becomes a
// variable — a rule that measured a number can name it, and the report layer
// never has to know the shape of the fact it came from.
const collectScalars = (value, vars, depth = 0) => {
	if (value == null || depth > 3) return;
	if (typeof value === "string" || typeof value === "number") return;
	// A list of NAMED things prints as a chain: `kind.chain` is the pieces this
	// code calls through, and a report says "…calls through {chain}…".
	if (Array.isArray(value)) return;
	if (!isObj(value)) return;
	for (const [k, v] of Object.entries(value)) {
		if (Array.isArray(v)) {
			const named = v.filter((x) => isObj(x) && typeof x.name === "string");
			if (named.length === v.length && named.length) vars[k] = named.map((x) => x.name).join(" → ");
			continue;
		}
		if (isObj(v)) collectScalars(v, vars, depth + 1);
		else if (vars[k] == null && (typeof v === "string" || typeof v === "number")) vars[k] = v;
	}
};

const listFactVars = (vars, target, filter, scope) => {
	for (const [field, sub] of Object.entries(filter ?? {})) {
		const list = fieldOf(target, field);
		if (!Array.isArray(list) || !isObj(sub)) continue;
		const hit = listHit(list, filter, field, scope);
		if (hit.length) {
			const keys = [...new Set(hit.flatMap((item) => Object.entries(item ?? {}).filter(([, v]) => typeof v === "string" && v).map(([k]) => k)))];
			for (const key of keys) {
				const value = [...new Set(hit.map((x) => x?.[key]).filter(Boolean))].join(", ");
				if (value) vars[key] = value;
			}
			// `{what}` names the thing the rule caught: the matched item's own name.
			if (vars.what == null) {
				const named = [...new Set(hit.map((x) => x?.name).filter(Boolean))].join(", ");
				if (named) vars.what = named;
			}
		}
		// `where` NARROWS a list: name the offending declarations themselves, so
		// the finding is self-sufficient without opening the file.
		if (isObj(sub.where) && isObj(sub.where.filter)) {
			// The same items the engine narrows to — `hitOf` — named for the report.
			const narrowed = hitOf(list, { where: { filter: sub.where.filter } }, scope);
			if (narrowed.length) vars[field] = narrowed.map((d) => `${d.name}${d.type ? ` (${d.type})` : ""}`).join(", ");
		}
	}

	return vars;
};

// When an invariant sets `dedupeBy`, file-level findings are reported once per
// distinct PLACE across the whole run (the dedupe map is shared across files).
// The place is whatever the `where` entry designates — `{ node: feature }` is
// that feature's folder, a glob its matched folder — so this is the same
// vocabulary as the roles, not a second one. Falling back to the file's own
// directory keeps a plain per-folder rule per-folder even outside any node.
const deduped = (inv, facts, dedupe, ctx) => {
	if (!inv.dedupeBy?.length || !dedupe) return false;
	const val = inv.dedupeBy.map((entry) => entryKey(entry, ctx.rel, ctx.arch, facts)).find(Boolean) ?? String(ctx.dir ?? "");
	const seen = dedupe.get(inv.id) ?? new Set();
	if (seen.has(val)) return true;
	seen.add(val);
	dedupe.set(inv.id, seen);
	return false;
};

const checkInfer = (inv, ctx, out, findingFrom, dedupe) => {
	const facts = ctx.facts;
	if (!facts) return;
	for (const entry of inv.infer) {
		const filter = filterOf(entry);
		// A filter is asked of the FILE first, then of every candidate in it. A
		// filter that answers for the file is a finding about the file; one that
		// only answers for a declaration is a finding about that declaration. No
		// list of "which facts exist where" is needed — the facts answer for
		// themselves, and `path`/`lines`/`kind` cannot be both at once because the
		// file is asked first.
		// `location: { node: … }` (and every other location-shaped filter) needs the
		// architecture to resolve a node slug to paths. Without it the operator
		// silently answered "no match" — a rule written with `location` simply never
		// fired, which reads exactly like "nothing is wrong".
		const scope = { arch: ctx.arch, fileRel: ctx.rel };
		const fileAnswer = matches(facts, filter, scope);
		if (!fileAnswer) {
			for (const c of facts.candidates ?? []) {
				if (matches(c, filter, scope)) {
					// `{what}`: the candidate's own name, else the piece it sits in.
					const vars = { ...fileVars(ctx), what: c.name ?? c.location?.piece ?? null };
					listFactVars(vars, c, filter, scope);
					// The matched piece's own scalar facts are addressable too: a rule about
					// `callDepth` names the chain it measured (`{callChain}`), and the
					// filter itself only ever names the one field it tested.
					collectScalars(c, vars);
					// `{assignments}`: the values this code writes into — the plainest
					// answer to "what does it change?". Only the writes the rule CAUGHT:
					// naming the piece's private locals too described one param write as
					// a list of everything the function ever touched.
					const written = [...new Set(listHit(c.assignments ?? [], filter, "assignments", scope).map((a) => a.value ?? a.target).filter(Boolean))];
					if (written.length) vars.assignments = written.join(", ");
					out.push(findingFrom({ key: "infer", report: entry.report ?? inv.report ?? null, line: c.lines?.[0] ?? 1 }, "invariant", ctx.rel, `invariant:${inv.id}:infer`, vars));
					break;
				}
			}
		} else if (!deduped(inv, facts, dedupe, ctx)) {
			const vars = enrichedVars(ctx);
			// `{roles}`: which kinds of code this file actually holds. A file-level
			// finding is about the file as a whole, and "which roles are in here" is
			// the one fact that explains it — the message must be able to name them.
			const roles = [...new Set(facts.roles ?? [])];
			if (roles.length) vars.roles = roles.join(" + ");
			const violations = violationsOf(facts, filter, scope);
			if (violations.length) vars.violations = violations.join(", ");
			listFactVars(vars, facts, filter, scope);
			out.push(findingFrom({ key: "infer", report: entry.report ?? inv.report ?? null }, "invariant", ctx.rel, `invariant:${inv.id}:infer`, vars));
		}
	}
};

// Which list values are the problem? For each top-level field whose filter is a
// bare `every: <sub>` (e.g. `roles: { every: { in: [...] } }`), return the
// items of that fact's list that do not match `<sub>` — so the report can name
// `{violations}` instead of making the reader open the file. Works through a
// leading `not:` too, so a "must" rule names its offenders as well. Fully
// generic: any fact field.
const violationsOf = (facts, inner, scope) => {
	const out = [];
	const filter = isObj(inner?.not) ? inner.not : inner;
	if (!isObj(filter)) return out;
	for (const [field, sub] of Object.entries(filter)) {
		// The items this entry refutes are the ones the engine says do NOT match
		// its demand — asked as a query (`not:`), not recomputed by hand.
		const demand = innerFilterOf(sub);
		const list = fieldOf(facts, field);
		if (demand == null || !Array.isArray(list)) continue;
		for (const item of list) if (matches(item, { not: demand }, scope)) out.push(item);
	}
	return out;
};

// The top-level `report` is the message template for the checks' findings —
// not a standalone finding of its own. The gates (ignore/where/when) only
// decide whether the checks run at all. Exception: an invariant with NO
// checks (no infer) IS its own finding — passing the gates is
// the violation (e.g. a `when: { roles: { some: ... } }` rule).
const checkInvariant = (inv, ctx, out, findingFrom, dedupe) => {
	// The two gates are the ONE `where` question, asked both ways: "is this file
	// exempt" and "does the rule apply". `checkWhere` answers it; looping over the
	// entries here was a second reading of the same list.
	if (!checkWhere(inv.ignore, ctx.rel, ctx.arch, ctx.facts)) return;
	if (inv.where.length && checkWhere(inv.where, ctx.rel, ctx.arch, ctx.facts)) return;
	if (inv.when != null && !matches(ctx.facts, inv.when)) return;
	const hasChecks = inv.infer.length > 0;
	if (!hasChecks && inv.report) {
		out.push(findingFrom({ key: null, report: inv.report }, "invariant", ctx.rel, `root:${inv.id}`, enrichedVars(ctx)));
	}
	checkInfer(inv, ctx, out, findingFrom, dedupe);
	for (const child of inv.children) checkInvariant(child, ctx, out, findingFrom, dedupe);
};

const checkInvariants = (invariants, ctx, out, findingFrom, dedupe) => {
	for (const inv of invariants) checkInvariant(inv, ctx, out, findingFrom, dedupe);
};

module.exports = {checkInvariants};

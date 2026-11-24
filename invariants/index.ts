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

import { matches, innerFilterOf, isObj } from "../entities/queries";
import { materialiseResolution } from "../css";
import { fileVars } from "./name";
import { resolveLocation, entryKey, checkWhere } from "../entities/location";
import { fieldOf, isList, isRecordValue, type FieldValue } from "../utils/field";
import { seenOnce, type SeenStore } from "../utils/seen";
import { speakOnce } from "../utils/speak";
import { typedField } from "../utils/typed-field";
import { filterOf, enrichedVars, listHit, collectScalars, describePiece, type ReportVars } from "./vars";
import { listFactVars } from "./list-vars";
import type { Invariant, QueryFilter, QueryScope, ReportObject, ReportValue, WhereEntry } from "../entities/architecture";
import type { FileContext } from "../entities/context";
import type { Finding, FindingFrom } from "../entities/findings";
import type { Candidate } from "../entities/facts";

// When an invariant sets `dedupeBy`, file-level findings are reported once per
// distinct PLACE across the whole run (the dedupe map is shared across files).
// The place is whatever the `where` entry designates — `{ node: feature }` is
// that feature's folder, a glob its matched folder — so this is the same
// vocabulary as the roles, not a second one. Falling back to the file's own
// directory keeps a plain per-folder rule per-folder even outside any node.
// The ask-and-remember step is the shared `seenOnce` core.
const dedupePlaceOf = (inv: Invariant, ctx: FileContext): string =>
	inv.dedupeBy.map((entry) => entryKey(entry, ctx.rel, ctx.arch, ctx.facts)).find(Boolean) ?? String(ctx.dir ?? "");

const deduped = (inv: Invariant, ctx: FileContext, dedupe: SeenStore | undefined): boolean => {
	if (!inv.dedupeBy?.length || !dedupe) return false;

	return seenOnce(dedupe, inv.id, dedupePlaceOf(inv, ctx));
};

// The `fix.location` a report states, read as the place vocabulary: a glob, a
// `{ role }` / `{ node }` entry, or a list of alternatives. Anything else is
// not a place the tree can resolve.
const locationEntryOf = (v: FieldValue): WhereEntry | string | null => {
	if (typeof v === "string") return v;
	if (!isRecordValue(v)) return null;
	if (typeof v.role === "string") return { type: "role", role: v.role, same: v.same === true };
	if (typeof v.node === "string") return { type: "node", node: v.node };

	return null;
};

const fixLocationOf = (fix: FieldValue): WhereEntry | string | (WhereEntry | string)[] | null => {
	if (!isRecordValue(fix)) return null;
	const location = fix.location;
	if (isList(location)) return location.map(locationEntryOf).filter((e): e is WhereEntry | string => e != null);

	return locationEntryOf(location);
};

// A rule's destination, resolved BY THE TREE — one implementation, in
// `entities/location.js`, shared with the `location:` filter. `fix.location`
// (`{ role }` / `{ node }` / a glob, or a list of alternatives) becomes the place
// and the box for THIS file, so the sentence and the picture get one place.
// The report's fields are read through `fieldOf` — the ONE plain-data reader —
// because the typed model also carries compiled regexes some readers expect,
// which are not data.
const resolvePlace = (report: ReportValue, ctx: FileContext): ReportValue => {
	if (!isObj(report) || !ctx.arch) return report;
	const location = fixLocationOf(fieldOf(report, "fix"));
	if (location == null) return report;
	const hit = resolveLocation(ctx.arch, location, ctx.rel);
	if (!hit?.node) return report;
	const stated: ReportObject = { to: [hit.node], place: hit.path };

	return Object.assign({}, report, stated);
};

// Which list values are the problem? For each top-level field whose filter is a
// bare `every: <sub>` (e.g. `roles: { every: { in: [...] } }`), return the
// items of that fact's list that do not match `<sub>` — so the report can name
// `{violations}` instead of making the reader open the file. Works through a
// leading `not:` too, so a "must" rule names its offenders as well. Fully
// generic: any fact field.
const violationsOf = (facts: FieldValue, inner: QueryFilter, scope: QueryScope): FieldValue[] => {
	const out: FieldValue[] = [];
	const filter = isObj(inner) && isObj(inner.not) ? inner.not : inner;
	if (!isObj(filter)) return out;
	for (const [field, sub] of Object.entries(filter)) {
		// The items this entry refutes are the ones the engine says do NOT match
		// its demand — asked as a query (`not:`), not recomputed by hand.
		const demand = innerFilterOf(sub);
		const list = fieldOf(facts, field);
		if (demand == null || !isList(list)) continue;
		for (const item of list) if (matches(item, { not: demand }, scope)) out.push(item);
	}

	return out;
};

// The variables one matched CANDIDATE's finding names: the file's path vars,
// `{what}` (its own name, else its piece, else what it is and where), the items
// the filter caught, its own scalars, and the writes the rule CAUGHT.
const candidateVars = (c: Candidate, filter: QueryFilter, scope: QueryScope, ctx: FileContext): ReportVars => {
	const vars: ReportVars = { ...fileVars(ctx), what: c.name ?? c.location?.piece ?? describePiece(c) };
	listFactVars(vars, c, filter, scope);
	collectScalars(c, vars);
	// `{assignments}`: the values this code writes into. Only the writes the rule
	// CAUGHT: naming the piece's private locals too described one param write as
	// a list of everything the function ever touched.
	const written = [...new Set(listHit(c.assignments ?? [], filter, "assignments", scope).map((a) => (isObj(a) ? (a.value ?? a.target) : undefined)).filter((v): v is string => typeof v === "string" && Boolean(v)))];
	if (written.length) vars.assignments = written.join(", ");

	return vars;
};

// The variables one FILE-level finding names: every scalar fact, the roles the
// file holds, the items the filter refutes.
const fileLevelVars = (ctx: FileContext, filter: QueryFilter, scope: QueryScope): ReportVars => {
	const vars = enrichedVars(ctx);
	const facts = ctx.facts;
	const roles = [...new Set(facts?.roles ?? [])].join(" + ");
	const violations = violationsOf(facts ?? {}, filter, scope).join(", ");
	if (roles) vars.roles = roles;
	if (violations) vars.violations = violations;

	return listFactVars(vars, facts ?? {}, filter, scope);
};

// The entry's own report template, when it carries one. The string fields are
// read through the shared typed-field walk; the list and the fix keep their
// own shapes.
const REPORT_STRING_KEYS = ["description", "message", "ask", "code", "path", "place", "from"] as const;
const isString = (v: FieldValue): v is string => typeof v === "string";

const reportOf = (entry: QueryFilter): ReportValue => {
	const report = fieldOf(entry, "report");
	if (typeof report === "string") return report;
	if (!isRecordValue(report)) return null;
	const obj: ReportObject = {};
	for (const key of REPORT_STRING_KEYS) {
		const v = typedField(report, key, isString);
		if (v !== undefined) obj[key] = v;
	}
	if (isList(report.to)) obj.to = report.to.filter(isString);
	const fix = report.fix;
	if (typeof fix === "string" || isRecordValue(fix)) obj.fix = fix;

	return obj;
};

// What one check run appends to: the findings list, the producer, the run's
// dedupe store.
type Sink = { out: Finding[]; findingFrom: FindingFrom; dedupe?: SeenStore };

// What one infer entry is judged against: the rule, the file, the filter and
// its scope, and where findings go.
type EntryAsk = { inv: Invariant; ctx: FileContext; filter: QueryFilter; scope: QueryScope; sink: Sink };

// The file answered the filter: one finding about the FILE, unless its place
// was already spoken for across the run.
const fileFinding = (entry: QueryFilter, ask: EntryAsk): void => {
	const { inv, ctx, filter, scope, sink } = ask;
	if (deduped(inv, ctx, sink.dedupe)) return;
	const stated = resolvePlace(reportOf(entry) ?? inv.report ?? null, ctx);
	sink.out.push(sink.findingFrom({ key: "infer", report: stated }, "invariant", ctx.rel, `invariant:${inv.id}:infer`, fileLevelVars(ctx, filter, scope)));
};

// One matched candidate's finding — once per piece: two factories in one file
// are two things to delete; the same piece answering two entries is one.
const candidateFinding = (c: Candidate, entry: QueryFilter, ask: EntryAsk & { spoken: Set<string> }): void => {
	const { inv, ctx, filter, scope, sink, spoken } = ask;
	const who = c.name ?? c.location?.piece ?? "?";
	if (!speakOnce(spoken, who)) return;
	const report = resolvePlace(reportOf(entry) ?? inv.report ?? null, ctx);
	sink.out.push(sink.findingFrom({ key: "infer", report, line: c.lines?.[0] ?? 1 }, "invariant", ctx.rel, `invariant:${inv.id}:infer:${who}`, candidateVars(c, filter, scope, ctx)));
};

// One infer entry, asked of the file first, then of every candidate. A filter
// that answers for the file is a finding about the file; one that only answers
// for a declaration is a finding about that declaration. No list of "which
// facts exist where" is needed — the facts answer for themselves.
const checkEntry = (entry: QueryFilter, inv: Invariant, ctx: FileContext, run: { spoken: Set<string>; sink: Sink }): void => {
	const facts = ctx.facts;
	if (!facts) return;
	const filter = filterOf(entry);
	// The scope IS the file's facts (plus the tree), so a rule can compare one
	// fact with another — `$location.fileName` against `location.files`. A
	// `location:` filter needs the architecture to resolve a node slug to paths.
	const scope: QueryScope = { ...facts, arch: ctx.arch, fileRel: ctx.rel };
	const ask: EntryAsk = { inv, ctx, filter, scope, sink: run.sink };
	if (matches(facts, filter, scope)) {
		fileFinding(entry, ask);

		return;
	}
	for (const c of facts.candidates ?? []) {
		// `$` inside a candidate filter names the candidate's OWN facts too, so a
		// rule can compare a function with itself. File facts keep priority on a
		// key clash (`{ ...c, ...scope }`).
		const candidateScope: QueryScope = { ...c, ...facts, arch: ctx.arch, fileRel: ctx.rel };
		if (!matches(c, filter, candidateScope)) continue;
		candidateFinding(c, entry, { ...ask, spoken: run.spoken });
	}
};

const checkInfer = (inv: Invariant, ctx: FileContext, sink: Sink): void => {
	// ONE finding per PIECE per rule. A piece can answer two `infer` entries of
	// the same rule (a `const` holding an arrow is the variable and the function),
	// and the reader does not need the same sentence twice with the same name.
	const spoken = new Set<string>();
	for (const entry of inv.infer) checkEntry(entry, inv, ctx, { spoken, sink });
};

// Does this filter read a declaration's `resolution` fact? Then the lazy
// resolution must be materialised before the filter is asked.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- a key walk over one filter, not the matcher
const namesResolution = (filter: QueryFilter): boolean => {
	if (isList(filter)) return filter.some(namesResolution);
	if (!isObj(filter)) return false;

	return Object.keys(filter).some((key) => key === "resolution" || namesResolution(fieldOf(filter, key)));
};

// The code-role slugs a filter names — `{ codeRole: { theme: … } }` (the keys of
// the `codeRole` object are slugs) or a `$codeRole.<slug>` reference. These are
// the roles whose provider literals resolution resolves against.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- collects slugs, does not parse a where entry
const codeRoleSlugs = (filter: QueryFilter, out: Set<string>): void => {
	if (typeof filter === "string") {
		const match = /\$codeRole\.([\w-]+)/.exec(filter);
		if (match) out.add(match[1]);
		return;
	}
	if (isList(filter)) {
		for (const entry of filter) codeRoleSlugs(entry, out);
		return;
	}
	if (!isObj(filter)) return;
	for (const key of Object.keys(filter)) {
		const value = fieldOf(filter, key);
		if (key === "codeRole" && isObj(value)) for (const slug of Object.keys(value)) out.add(slug);
		else codeRoleSlugs(value, out);
	}
};

// The provider role slugs an invariant names (in `when` or any `infer` entry).
const invariantProviderSlugs = (inv: Invariant): string[] => {
	const slugs = new Set<string>();
	if (inv.when != null) codeRoleSlugs(inv.when, slugs);
	for (const entry of inv.infer) codeRoleSlugs(entry, slugs);

	return [...slugs];
};

// Every css template the file's candidates carry.
const templatesOf = (ctx: FileContext): { declarations?: FieldValue }[] => (ctx.facts?.candidates ?? []).flatMap((candidate) => candidate.css?.templates ?? []);

// Materialise `resolution` on the file's css templates for an invariant that
// reads it. The providers are the literals of the roles the invariant NAMES — a
// filter that references no role gets no providers (reported as such, never
// silently resolved against a project-wide scan).
const materialiseInvariantResolution = (inv: Invariant, ctx: FileContext): void => {
	if (!(namesResolution(inv.when ?? null) || inv.infer.some(namesResolution))) return;
	const providers = ctx.providersFor ? ctx.providersFor(invariantProviderSlugs(inv)) : [];
	for (const template of templatesOf(ctx)) materialiseResolution(template, providers);
};

// The top-level `report` is the message template for the checks' findings —
// not a standalone finding of its own. The gates (ignore/where/when) only
// decide whether the checks run at all. Exception: an invariant with NO
// checks (no infer) IS its own finding — passing the gates is
// the violation (e.g. a `when: { roles: { some: ... } }` rule).
const checkInvariant = (inv: Invariant, ctx: FileContext, sink: Sink): void => {
	// The two gates are the ONE `where` question, asked both ways: "is this file
	// exempt" and "does the rule apply". `checkWhere` answers it; looping over the
	// entries here was a second reading of the same list.
	if (!checkWhere(inv.ignore, ctx.rel, ctx.arch, ctx.facts)) return;
	if (inv.where.length && checkWhere(inv.where, ctx.rel, ctx.arch, ctx.facts)) return;
	if (inv.when != null && !matches(ctx.facts ?? {}, inv.when)) return;
	// Resolution is LAZY: computed only for an invariant that asks about it, and
	// only against the provider roles that invariant names.
	materialiseInvariantResolution(inv, ctx);
	if (!inv.infer.length && inv.report) {
		sink.out.push(sink.findingFrom({ key: null, report: inv.report }, "invariant", ctx.rel, `root:${inv.id}`, enrichedVars(ctx)));
	}
	checkInfer(inv, ctx, sink);
	for (const child of inv.children) checkInvariant(child, ctx, sink);
};

const checkInvariants = (...args: [invariants: Invariant[], ctx: FileContext, out: Finding[], findingFrom: FindingFrom, dedupe?: SeenStore]): void => {
	const [invariants, ctx, out, findingFrom, dedupe] = args;
	for (const inv of invariants) checkInvariant(inv, ctx, { out, findingFrom, dedupe });
};

export { checkInvariants };

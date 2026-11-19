"use strict";

// ONE finding, built from what a checker states. A producer states the repair
// structurally (`to` boxes, `path`, `ask`) and `findingFrom` carries it as
// `data.repair` — the SAME object the CLI prints and the picture draws. A
// producer that only wrote a sentence still ends up with a repair (`rules` with
// no destination), so downstream never has to guess what a sentence meant.
//
// The report spec is the engine's own (`ReportObject`); the substitution is the
// shared template walk; the repair shape is the ONE contract in entities/repair.

import { repair } from "./asks";
import { substitute, type TemplateVars } from "../utils/template";
import { isObj, type FieldValue } from "../utils/field";
import { stringField } from "../utils/read-field";
import { resolveReference } from "../utils/resolve";
import type { FindingItem, FindingFrom } from "../entities/findings";
import type { ReportObject } from "../entities/architecture";

// The fix text a spec states: a bare string, or the structured `{ message }`.
const fixTextOf = (spec: ReportObject): string | null => {
	const fix = spec.fix;
	if (typeof fix === "string") return fix;
	return isObj(fix) ? stringField(fix, "message") || null : null;
};

const renderSpec = (spec: ReportObject | string, vars: TemplateVars): { message: string | null; fix: string | null } => {
	if (typeof spec === "string") return { message: substitute(spec, vars), fix: null };
	const message = spec.description ?? spec.message ?? null;
	const fixText = fixTextOf(spec);
	return { message: message != null ? substitute(message, vars) : null, fix: fixText != null ? substitute(fixText, vars) : null };
};

// The spec a finding item carries: an explicit `report`, or the legacy flat
// `message`/`fix` spelling on the item itself.
const specOf = (item: FindingItem): ReportObject | string | null => {
	if (item.report != null) return item.report;
	const message = item.message ?? "";
	const fix = item.fix ?? "";
	// The legacy flat spelling carries the WHOLE item as the spec — its `ask`,
	// `to`, `from`, `path` are the repair the producer stated, not only words.
	if (message || fix) return { ...item, message: message || null, fix: fix || null };
	return null;
};

// The place a spec names: `place` (already resolved) or `path`, never parsed
// out of the sentence. A string spec names no place.
const placeOf = (spec: ReportObject | string | null): string | null =>
	resolveReference(spec, (s) => (typeof s === "string" ? null : s), (s) => s.place ?? s.path ?? null);

// The finding's identity and subject: what it is about, and which role.
const subjectOf = (item: FindingItem, key: string, vars: TemplateVars): { what: string | null; role: string | null } => ({
	what: stringField(vars, "what") || null,
	role: /^role:([^:]+)/.exec(key)?.[1] ?? item.role ?? null,
});

// The message and fix sentences a finding carries: the rendered spec's, or the
// run's own vars, or the fallback.
const scopeOf = (vars: TemplateVars, place: string | null): TemplateVars => (place ? { ...vars, destination: place } : vars);

const sentencesOf = (item: FindingItem, vars: TemplateVars): { message: string; fix: string | null; place: string | null; spec: ReportObject | null } => {
	const spec = specOf(item);
	const place = placeOf(spec);
	const rep = spec != null ? renderSpec(spec, scopeOf(vars, place)) : null;
	return {
		message: rep?.message ?? (stringField(vars, "message") || "architecture violation"),
		fix: rep?.fix ?? (stringField(vars, "fix") || null),
		place,
		spec: spec != null && typeof spec !== "string" ? spec : null,
	};
};

// The evidence bag with the stated repair attached — the SAME object the CLI
// prints and the picture draws.
const dataOf = (item: FindingItem, spec: ReportObject | null, fix: string | null, place: string | null): FieldValue => {
	const stated = spec != null ? repair({ code: spec.code ?? spec.ask, fix }, { to: spec.to ?? [], from: spec.from ?? null, path: place }) : null;
	const evidence = isObj(item.data) ? item.data : null;
	return stated ? { ...(evidence ?? {}), repair: { ...stated, text: fix } } : evidence;
};

const findingFrom: FindingFrom = (...args) => {
	const [item, rule, node, key, vars] = args;
	const { message, fix, place, spec } = sentencesOf(item, vars);
	return {
		file: stringField(vars, "path") || node,
		node,
		rule,
		key: item.key ?? key,
		dedupeKey: key,
		data: dataOf(item, spec, fix, place),
		...subjectOf(item, key, vars),
		message,
		fix,
		pos: { line: item.line ?? 1, column: 1 },
	};
};

export { findingFrom, renderSpec, substitute };

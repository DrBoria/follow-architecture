"use strict";

// The MARKS on a role example: which lines of the snippet the role's own infer
// caught, and why. Template-relative CSS lines are shifted by the template's
// own start line, because the facet numbers them inside the template text.

import { fieldOf, isList, isObj, toList, type FieldValue } from "../../../utils/field";
import { stringField, numberField } from "../../../utils/read-field";
import { speakOnce } from "../../../utils/speak";
import { hitOf } from "../../../entities/queries";
import { listFiltersOf, deepestFilters, valueAt, type CssHit } from "./role-filters";
import type { Candidate } from "../../../entities/facts";
import type { MatchedRange } from "../../../entities/overview-summaries";

// A range pusher that speaks each (from, to, why) once.
type Push = (from: number, to: number, why: string) => void;
const rangePush = (out: MatchedRange[], seen: Set<string>): Push => (from, to, why) => {
	if (from < 0 || to < from) return;
	if (speakOnce(seen, `${from}:${to}:${why}`)) out.push({ from, to, why });
};

// A declaration's line: template-relative when it sits in a template,
// file-relative when it is a class on an attribute.
const declarationMark = (item: CssHit, c: Candidate, start: number, push: Push): void => {
	const templates = c.css?.templates ?? [];
	const template = templates.find((t) => (t.declarations ?? []).some((d) => d === item));
	const base = template ? (template.startLine ?? template.line ?? start) - start - 1 : 0;
	const at = base + numberField(item, "line", 1);
	const prop = stringField(item, "prop", "declaration");
	const rule = fieldOf(item, "rule");
	push(at, at, `${prop}${rule ? ` in ${String(rule)}` : ""}`);
};

const templateMark = (item: CssHit, start: number, push: Push): void => {
	const base = numberField(item, "startLine", numberField(item, "line", start)) - start;
	const decls = toList(fieldOf(item, "declarations"));
	const lastDecl = decls.length ? Math.max(...decls.map((d) => numberField(d, "line", 1))) : 0;
	push(base, base + lastDecl, "css template");
};

// One hit's mark, chosen by the field path the demand named.
const hitMark = (ask: { path: string; item: CssHit; c: Candidate; start: number; push: Push }): void => {
	const { path, item, c, start, push } = ask;
	if (path.endsWith(".declarations")) return declarationMark(item, c, start, push);
	if (path.endsWith(".templates")) return templateMark(item, start, push);
	const line = fieldOf(item, "line");
	if (path.endsWith(".classes")) {
		if (line != null) push(Number(line) - start, Number(line) - start, `class ${stringField(item, "raw")}`);
		return;
	}
	if (line != null) push(Number(line) - start, Number(line) - start, path);
};

// The marks one deepest demand earns: its list, filtered by the role's own
// item filter, each hit marked by the path that named it.
const demandMarks = (ask: { path: string; sub: FieldValue; c: Candidate; start: number; push: Push }): void => {
	const { path, sub, c, start, push } = ask;
	const list = valueAt(c, path);
	if (!isList(list)) return;
	const hits = hitOf(list, sub, { arch: fieldOf(c.file, "arch") });
	for (const item of hits) {
		if (!isObj(item)) continue;
		hitMark({ path, item, c, start, push });
	}
};

const matchedRanges = (c: Candidate, infer: FieldValue): MatchedRange[] => {
	const start = c.lines?.[0] ?? 1;
	const out: MatchedRange[] = [];
	const push = rangePush(out, new Set<string>());
	const filters = listFiltersOf(isList(infer) ? infer : [infer], "", []);
	for (const { path, sub } of deepestFilters(filters, c)) demandMarks({ path, sub, c, start, push });
	// A function-shaped match (helper, component, …): the piece's own span.
	const lines = c.lines ?? [];
	if (!out.length && lines.length) {
		push(0, lines[lines.length - 1] - start, c.framework?.component ? "renders JSX" : "function-shaped piece");
	}
	return out;
};

export { matchedRanges };

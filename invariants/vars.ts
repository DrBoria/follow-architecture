"use strict";

// Report VARIABLES for the invariant runtime: the placeholders a finding's
// sentence may name. Every variable is read off the facts themselves — the
// path vars, the scalars a fact carries, the items a filter matched — so no
// list of known names can fall behind the fact model.

import { hitOf, isObj } from "../entities/queries";
import { isList, type FieldValue } from "../utils/field";
import { recordWithout } from "../utils/record";
import { fileVars } from "./name";
import type { QueryScope } from "../entities/architecture";
import type { FileContext } from "../entities/context";

// The variables a report substitutes: strings and numbers, keyed by name.
type ReportVars = Record<string, string | number>;

// A check's `report` is the message template for its findings, not a filter
// key — strip it before matching so it is not treated as a fact field. The
// record-minus-keys walk is the shared `recordWithout` core.
const filterOf = (entry: FieldValue): FieldValue => recordWithout(entry, ["report"]);

// Report variables for file-level findings: the path vars plus every scalar
// file fact and every scalar inside a nested fact object (the `path` fact: dir,
// fileName, …) so a report can say `{files} files` without hardcoding. An array
// fact reports its LENGTH — `{lines}` is how many lines there are.
const scalarVarsOf = (facts: FieldValue, vars: ReportVars): void => {
	if (!isObj(facts)) return;
	for (const [k, v] of Object.entries(facts)) {
		if (isList(v)) vars[k] = v.length;
		else if (typeof v === "number" || typeof v === "string") vars[k] = v;
		else if (isObj(v)) nestedScalarVars(v, vars);
	}
};

const nestedScalarVars = (obj: { readonly [key: string]: FieldValue }, vars: ReportVars): void => {
	for (const [sk, sv] of Object.entries(obj)) {
		if (isList(sv)) vars[sk] = sv.length;
		else if (typeof sv === "number" || typeof sv === "string") vars[sk] = sv;
	}
};

const enrichedVars = (ctx: FileContext): ReportVars => {
	const vars: ReportVars = { ...fileVars(ctx) };
	scalarVarsOf(ctx.facts ?? {}, vars);

	return vars;
};

// Which items a list entry is talking about: the query engine's own reading
// (`hitOf`), applied to the field this rule named. No second extraction here —
// a message naming `{ <field> }` and the check itself cannot disagree.
const listHit = (list: readonly FieldValue[], filter: FieldValue, field: string, scope: QueryScope): FieldValue[] => {
	const sub = isObj(filter) ? filter[field] : undefined;
	if (!isObj(sub)) return [...list];

	return hitOf(list, sub, scope);
};

// One field's scalar contribution: a list prints as a chain or a joined set;
// an object is walked one level deeper; a scalar fills the var when unset.
const scalarEntry = (k: string, v: FieldValue, vars: ReportVars, depth: number): void => {
	if (isList(v)) {
		listVar(v, k, vars);

		return;
	}
	if (isObj(v)) {
		collectScalars(v, vars, depth + 1);

		return;
	}
	if (vars[k] == null && (typeof v === "string" || typeof v === "number")) vars[k] = v;
};

// Every scalar a piece carries, wherever it sits (`kind.chain.depth`), becomes a
// variable — a rule that measured a number can name it, and the report layer
// never has to know the shape of the fact it came from.
const collectScalars = (value: FieldValue, vars: ReportVars, depth = 0): void => {
	if (value == null || depth > 3) return;
	if (!isObj(value) || isList(value)) return;
	for (const [k, v] of Object.entries(value)) scalarEntry(k, v, vars, depth);
};

// A list of NAMED things prints as a chain: `kind.chain` is the pieces this
// code calls through, and a report says "…calls through {chain}…". A list of
// PLAIN strings is its own answer: `references.files` is the set of files a
// name is used in, and "move it where it is called" has to say WHERE. Never
// overwritten: a count already collected for a file-level report keeps its
// meaning.
const listVar = (list: readonly FieldValue[], key: string, vars: ReportVars): void => {
	const named = list.filter((x): x is { readonly [k: string]: FieldValue } => isObj(x) && typeof x.name === "string");
	if (named.length === list.length && named.length) vars[key] = named.map((x) => String(x.name)).join(" → ");
	const strings = list.filter((x): x is string => typeof x === "string" && Boolean(x));
	if (strings.length === list.length && strings.length && vars[key] == null) vars[key] = strings.join(", ");
};

// A list filter is often wrapped in a QUANTIFIER (`any`/`some`/`every`/`none`):
// the fields the rule names live inside it, one level further down.
const QUANTIFIERS = new Set(["any", "some", "every", "none"]);
const branchOf = (sub: FieldValue): FieldValue => {
	if (!isObj(sub)) return sub;
	const keys = Object.keys(sub);
	if (keys.length === 1 && QUANTIFIERS.has(keys[0]) && isObj(sub[keys[0]])) return sub[keys[0]];

	return sub;
};

// `{what}` for a piece with no name of its own: what it IS and where it starts,
// so the sentence can still be followed to a line.
const describePiece = (c: { lines?: number[]; css?: { templates?: { tag?: string }[] } }): string => {
	const line = c.lines?.[0] ?? 1;
	const tag = c.css?.templates?.[0]?.tag ?? null;

	return tag ? `the ${tag} block at line ${line}` : `the code at line ${line}`;
};

export { filterOf, enrichedVars, listHit, collectScalars, branchOf, describePiece, QUANTIFIERS };
export type { ReportVars };
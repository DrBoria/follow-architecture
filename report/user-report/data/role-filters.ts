"use strict";

// WHERE a role's infer actually matched, as line ranges RELATIVE to the
// snippet's first line — so the reader sees WHICH declarations make this piece
// a `cssVariable` / `styleInversion` / … instead of three identical-looking
// windows. The ranges are derived from the ROLE'S OWN infer filters run
// against the candidate's facts (the same `hitOf` the engine uses), so the mark
// can never disagree with the classification.
//
// The list filters the infer addresses are collected with their field path
// (`css.templates`, `css.templates.declarations`, `css.classes`). Composition
// (`or`/`and`/…) is looked through, quantifiers unwrapped — the same reading
// the invariant report uses. Operator operands (`in: [...]`, `gt: 0`) are
// demands on a value, not roads to a deeper list, so they are never walked.
// The operator vocabulary is the engine's own (`KNOWN_OPS`), never a copy.

import { fieldOf, isList, isObj, toList, type FieldValue } from "../../../utils/field";
import { innerFilterOf, KNOWN_OPS, COMPOSITION_OPS } from "../../../entities/queries";
import { admitsWhenNoneReject } from "../../../utils/gate";
import type { Candidate } from "../../../entities/facts";

// One list demand the infer names: its field path, the filter on its items,
// and whether it is a `length`-alone LEAF (marks the whole list, only when no
// deeper demand on the same branch names specific items).
type ListFilter = { path: string; sub: FieldValue; leaf?: boolean };

// A matched item as plain data: the marks read its optional fields through the
// ONE field reader (`utils/field`), so any record the filter engine returns is
// read the same way — no shape is assumed beyond "a record".
type CssHit = { readonly [key: string]: FieldValue };

// A quantified list entry (`any`/`every`/`none`/`where`): a demand on the items,
// recorded with its path; the inner filter may name a deeper list still.
const isQuantified = (sub: { readonly [key: string]: FieldValue }): boolean =>
	sub.any !== undefined || sub.every !== undefined || sub.none !== undefined || sub.where !== undefined;

// `length` ALONE asks about the list's size ("at least one template").
const isLengthLeaf = (sub: { readonly [key: string]: FieldValue }): boolean =>
	sub.length !== undefined && Object.keys(sub).length === 1;

// One filter key: composition is looked through, an operator is a demand on
// the current value, a record names a deeper field.
const keyFilters = (key: string, sub: FieldValue, prefix: string, out: ListFilter[]): void => {
	if (COMPOSITION_OPS.has(key)) {
		for (const f of toList(sub)) listFiltersOf(f, prefix, out);
		return;
	}
	if (KNOWN_OPS.has(key) || !isObj(sub)) return;
	const path = prefix ? `${prefix}.${key}` : key;
	if (isQuantified(sub)) {
		out.push({ path, sub });
		const inner = innerFilterOf(sub);
		if (isObj(inner)) listFiltersOf(inner, path, out);
		return;
	}
	if (isLengthLeaf(sub)) {
		out.push({ path, sub: {}, leaf: true });
		return;
	}
	listFiltersOf(sub, path, out);
};

const listFiltersOf = (filter: FieldValue, prefix: string, out: ListFilter[]): ListFilter[] => {
	if (isList(filter)) {
		for (const f of filter) listFiltersOf(f, prefix, out);
		return out;
	}
	if (!isObj(filter)) return out;
	for (const [key, sub] of Object.entries(filter)) keyFilters(key, sub, prefix, out);
	return out;
};

// A field path off a fact — `utils/field#fieldOf` is the single reader of
// `a.b.c`, list-aware the same way a `$ref` is.
const valueAt = (obj: FieldValue, path: string): FieldValue => fieldOf(obj, path);

// A `length` leaf whose items are SCALARS (a `vars` list of names) is not a
// place — drop it, so the enclosing declaration demand becomes the deepest.
const isPlaceFilter = (f: ListFilter, c: Candidate): boolean => {
	const items = toList(valueAt(c, f.path));
	const objectItems = items.length > 0 && items.every((item) => isObj(item));
	return admitsWhenNoneReject(f, [() => f.leaf && !objectItems]);
};

// The DEEPEST demand on each branch decides the mark: a role that names
// declarations marks those declarations, not the whole template.
const deepestFilters = (filters: readonly ListFilter[], c: Candidate): ListFilter[] => {
	const places = filters.filter((f) => isPlaceFilter(f, c));
	return places.filter((f) => !places.some((g) => g !== f && g.path.startsWith(`${f.path}.`)));
};

export { listFiltersOf, deepestFilters, valueAt };
export type { ListFilter, CssHit };

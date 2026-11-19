"use strict";

// The LIST half of the report-variable walk: a rule names a fact field, the
// engine narrows the list the same way the filter did, and every string the
// matched items carry becomes a placeholder. The walk follows the same path
// the filter took — through objects, through quantifiers, through `where`/`by`
// — so a message naming `{ <field> }` and the check itself cannot disagree.

import { matches, hitOf, COMPOSITION_OPS, isObj } from "../entities/queries";
import { fieldOf, isList, type FieldValue } from "../utils/field";
import { branchOf, listHit, type ReportVars } from "./vars";
import type { QueryScope } from "../entities/architecture";

// The `where` narrowing of a list entry, when it has one: `{ where: { filter,
// by } }` narrows before `by` judges.
const narrowingOf = (sub: { readonly [key: string]: FieldValue }): { filter: FieldValue; by: FieldValue } | null => {
	const where = sub.where;
	if (!isObj(where) || !isObj(where.filter)) return null;

	return { filter: where.filter, by: where.by };
};

// The items the rule talks about, and the demand the walk into them reads.
const hitsOf = (list: readonly FieldValue[], sub: { readonly [key: string]: FieldValue }, ask: { filter: FieldValue; field: string; scope: QueryScope }): { hit: FieldValue[]; walkFilter: FieldValue } => {
	const narrowing = narrowingOf(sub);
	if (narrowing) {
		return { hit: hitOf(list, { where: { filter: narrowing.filter } }, ask.scope), walkFilter: branchOf(narrowing.by) };
	}

	return { hit: listHit(list, ask.filter, ask.field, ask.scope), walkFilter: branchOf(sub) };
};

// One string field of the matched items, as one variable: the distinct values,
// joined. Which word stands for an item is the item's own business.
const spokenOf = (hit: readonly FieldValue[], read: (item: FieldValue) => FieldValue): string => {
	const values = hit.map(read).filter((v): v is string => typeof v === "string" && Boolean(v));

	return [...new Set(values)].join(", ");
};

// The word an item is spoken by: its name, else the text it holds, else the
// raw token it was written as (a class), else the property or selector it is.
const itemWord = (item: FieldValue): FieldValue => {
	if (!isObj(item)) return undefined;

	return item.name ?? item.text ?? item.raw ?? item.prop ?? item.selector ?? item.tag;
};

// Every string field the matched items carry becomes a placeholder; `{what}`
// names the thing the rule caught; the tested field prints as the words it
// caught. Then one level down, into the items themselves.
const hitVars = (vars: ReportVars, hit: readonly FieldValue[], walk: { field: string; walkFilter: FieldValue; scope: QueryScope }): void => {
	const keys = [...new Set(hit.flatMap((item) => (isObj(item) ? Object.entries(item).filter(([, v]) => typeof v === "string" && v).map(([k]) => k) : [])))];
	for (const key of keys) {
		const found = spokenOf(hit, (x) => (isObj(x) ? x[key] : undefined));
		if (found) vars[key] = found;
	}
	if (vars.what == null) {
		const named = spokenOf(hit, (x) => (isObj(x) ? x.name : undefined));
		if (named) vars.what = named;
	}
	if (vars[walk.field] == null) {
		const spokenItems = spokenOf(hit, itemWord);
		if (spokenItems) vars[walk.field] = spokenItems;
	}
	if (isObj(walk.walkFilter)) for (const item of hit) listFactVars(vars, item, walk.walkFilter, walk.scope);
};

// A COMPOSITION op is not a fact field: the walk looks THROUGH it, descending
// into the sub-filters against the SAME target. A LIST of filters names the
// branches that matched; a single filter names the demand it wraps (`not:`).
const compositionBranches = (sub: FieldValue, target: FieldValue, scope: QueryScope): FieldValue[] => {
	if (isList(sub)) return sub.filter((f) => matches(target, f, scope));

	return isObj(sub) ? [sub] : [];
};

const listFactVars = (vars: ReportVars, target: FieldValue, filter: FieldValue, scope: QueryScope): ReportVars => {
	if (!isObj(filter)) return vars;
	for (const [field, sub] of Object.entries(filter)) {
		if (COMPOSITION_OPS.has(field)) {
			for (const f of compositionBranches(sub, target, scope)) listFactVars(vars, target, f, scope);
			continue;
		}
		if (!isObj(sub)) continue;
		const value = fieldOf(target, field);
		// A field that is not a list is still a ROAD: a rule reaches a list through
		// the objects on the way (`css` → `templates` → `declarations` → `reads`).
		if (isObj(value)) {
			listFactVars(vars, value, branchOf(sub), scope);
			continue;
		}
		if (!isList(value)) continue;
		const { hit, walkFilter } = hitsOf(value, sub, { filter, field, scope });
		if (hit.length) hitVars(vars, hit, { field, walkFilter, scope });
	}

	return vars;
};

export { listFactVars };
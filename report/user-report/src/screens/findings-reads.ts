"use strict";

// The findings screen's reads: the search (over EVERYTHING the report knows
// about a finding), the category/invariant filter, and the URL selection with
// the per-place `n` index. Split from the screen so each is a named decision.

import type { EnrichedFinding } from "../../../../entities/enriched-finding";
import type { ScreenParams } from "./contract";

// The search reads EVERYTHING the report knows about a finding — message, fix,
// plan, roles, rule conditions — not a hand-picked subset: a symbol must not be
// "not found" while the finding about it is on screen.
const haystacksOf = (findings: readonly EnrichedFinding[]): string[] => findings.map((f) => JSON.stringify(f).toLowerCase());

// Does a finding pass the category and invariant filters?
const passesFilter = (f: EnrichedFinding, invariantFilter: string | null, category: string): boolean => {
	if (invariantFilter && f.invariant !== invariantFilter) return false;
	return category === "all" || f.category === category;
};

// The filtered list: the needle over the haystacks, plus the two filters.
const filteredOf = (ask: { findings: readonly EnrichedFinding[]; haystacks: readonly string[]; needle: string; invariantFilter: string | null; category: string }): EnrichedFinding[] => {
	const { findings, haystacks, needle, invariantFilter, category } = ask;
	if (!needle) return findings.filter((f) => passesFilter(f, invariantFilter, category));
	const out: EnrichedFinding[] = [];
	for (let i = 0; i < findings.length; i += 1) {
		const f = findings[i];
		if (passesFilter(f, invariantFilter, category) && haystacks[i].includes(needle)) out.push(f);
	}
	return out;
};

// One row: the finding, its index in the filtered list, and which finding it is
// at its file:line (two findings on one line are the normal case). The list
// component reads this same shape.
type Row = { f: EnrichedFinding; i: number; at: number };

// Is this row the one the URL names? `file`+`line` is not an identity; `n` says
// WHICH finding at that place.
const isSelected = (f: EnrichedFinding, at: number, params: ScreenParams): boolean => {
	if (!params.file || f.file !== params.file || String(f.line) !== String(params.line)) return false;
	const nth = Number(params.n ?? 0);
	const wanted = Number.isFinite(nth) ? Math.max(nth, 0) : 0;
	return at === wanted;
};

// One pass gives BOTH the rows (with their `n`) and the selected index.
const rowsOf = (filtered: readonly EnrichedFinding[], params: ScreenParams): { rows: Row[]; selectedIndex: number } => {
	const seen = new Map<string, number>();
	const rows: Row[] = [];
	let selectedIndex = 0;
	for (let i = 0; i < filtered.length; i += 1) {
		const f = filtered[i];
		const place = `${f.file}:${f.line}`;
		const at = seen.get(place) ?? 0;
		seen.set(place, at + 1);
		rows.push({ f, i, at });
		if (isSelected(f, at, params)) selectedIndex = i;
	}
	return { rows, selectedIndex };
};

export { haystacksOf, filteredOf, rowsOf };
export type { Row };

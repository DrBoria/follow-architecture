"use strict";

// A KEYED SECTION is one mechanism: the YAML may write a section as a LIST of
// `{ slug, … }` entries or as a MAP keyed by slug, and both spellings describe
// the same defs. The nodes section reads it one way (`entities/tree/build`),
// the codeRoles section the same way (`code-roles/roles`) — so the walk lives
// here once: a list is itself; a map's entries take their key as the slug when
// the entry does not name one. What a def IS and what is validated afterwards
// is the caller's own; nothing here knows nodes or roles.

import { isObj } from "./field";

// The defs a list-or-map section declares, in declared order. The caller's def
// type `T` flows through untouched; a map value that is not a record is kept
// as-is (null) — the caller's validation names it.
const isListSection = <T>(section: readonly T[] | Record<string, T>): section is readonly T[] => Array.isArray(section);

const keyedDefs = <T>(section: readonly T[] | Record<string, T> | null | undefined): (T | null)[] => {
	if (section == null) return [];
	if (isListSection(section)) return [...section];

	return Object.entries(section).map(([k, v]) => (isObj(v) ? { ...v, slug: v.slug ?? k } : null));
};

export { keyedDefs };
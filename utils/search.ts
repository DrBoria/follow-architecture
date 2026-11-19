"use strict";

// A TEXT SEARCH is one mechanism: does a haystack contain a needle, ignoring
// case? An empty needle matches everything (no filter). The browser searches
// findings / roles / nodes (`utils/format`); any consumer that filters text by
// a substring asks the same question. The decision is the shared gate — admit
// when none of the refusals fires (no needle to filter by, or the needle is
// absent) — the same `admitsWhenNoneReject` the AST read gate uses.

import { admitsWhenNoneReject } from "./gate";

const matchesText = (haystack: string | null | undefined, needle: string): boolean =>
	admitsWhenNoneReject(needle, [(n) => !n, (n) => !String(haystack ?? "").toLowerCase().includes(n.toLowerCase())]);

export { matchesText };

"use strict";

// A TEXT SEARCH is one mechanism: does a haystack contain a needle, ignoring
// case? An empty needle matches everything (no filter). The browser searches
// findings / roles / nodes (`utils/format`); any consumer that filters text by
// a substring asks the same question. The decision is the shared gate — admit
// when none of the refusals fires (no needle to filter by, or the needle is
// absent) — the same `admitsWhenNoneReject` the AST read gate uses.

import { admitsWhenNoneReject } from "./gate";

// One refusal, not two: an EMPTY needle has nothing to refuse it, so the gate
// admits every haystack (no filter). A non-empty needle is refused only when
// the haystack does not contain it. Spelling the empty case as its own `!n`
// refusal would invert it — the refusal fires first and the list empties.
const matchesText = (haystack: string | null | undefined, needle: string): boolean =>
	admitsWhenNoneReject(needle, [(n) => Boolean(n) && !String(haystack ?? "").toLowerCase().includes(n.toLowerCase())]);

export { matchesText };

"use strict";

// A JUDGED ITEM is one mechanism: a list of items is walked, each is judged,
// and only the ones that earn a verdict are kept — the rest are silent. The
// relation check judges every edge of a fact kind and groups the refusals
// (`nodes/finally/relations`); any consumer that filters a list by a verdict
// asks the same question. The walk is the same — judge, keep the answered —
// so it lives here once. What a verdict IS is the caller's own.

const judgedItems = <Item, Verdict>(items: readonly Item[], judge: (item: Item) => Verdict | null): { item: Item; verdict: Verdict }[] => {
	const out: { item: Item; verdict: Verdict }[] = [];
	for (const item of items) {
		const verdict = judge(item);
		if (verdict != null) out.push({ item, verdict });
	}

	return out;
};

export { judgedItems };
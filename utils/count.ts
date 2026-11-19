"use strict";

// A COUNTED GROUP is one mechanism: items arrive with a key, and the answer is
// how many carry each key, most frequent first. The overview groups findings by
// category / invariant / node (`data/collect`); any consumer that counts a list
// by a key asks the same question. The walk lives here once; what the key MEANS
// is the caller's own.

// One key and how many items carry it.
type Count = { key: string; count: number };

// Count `items` by `keyOf`, most frequent first (ties keep first-seen order).
const countBy = <Item>(items: readonly Item[], keyOf: (item: Item) => string): Count[] => {
	const map = new Map<string, number>();
	for (const item of items) {
		const key = keyOf(item);
		map.set(key, (map.get(key) ?? 0) + 1);
	}
	return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
};

export { countBy };
export type { Count };

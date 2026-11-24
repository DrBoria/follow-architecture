"use strict";

// A GROUPED LIST is one mechanism: items arrive with a key, and the answer is
// the buckets in first-seen order, each holding its items. The browser groups
// edges / findings by a key (`utils/format`); any consumer that folds a list
// into ordered buckets asks the same question. The walk lives here once; what
// the key MEANS is the caller's own.

// Group `items` by `keyOf`, preserving first-seen bucket order.
const groupBy = <Item, Key>(items: readonly Item[], keyOf: (item: Item) => Key): [Key, Item[]][] => {
	const map = new Map<Key, Item[]>();
	for (const item of items) {
		const key = keyOf(item);
		const bucket = map.get(key);
		if (bucket) bucket.push(item);
		else map.set(key, [item]);
	}
	return [...map.entries()];
};

// Push ONE item into the bucket `key` names, creating the bucket on first use —
// the in-place counterpart of `groupBy` for a map built across several calls
// (a provider set, a scope's variables). One spelling of get-or-create.
const pushGroup = <Key, Item>(map: Map<Key, Item[]>, key: Key, item: Item): void => {
	const bucket = map.get(key);
	if (bucket) bucket.push(item);
	else map.set(key, [item]);
};

export { groupBy, pushGroup };

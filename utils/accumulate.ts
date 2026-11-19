"use strict";

// A KEYED ACCUMULATION is one mechanism: items arrive with a key, and each is
// merged into the bucket that key names — a new bucket when the key is new,
// the existing one otherwise. The relation check groups refused edges by
// kind + target + what (`nodes/finally/relations`); any consumer that folds
// items into keyed buckets asks the same question. The walk is the same —
// read the bucket, merge, store — so it lives here once. What a bucket IS and
// how an item joins it is the caller's own.

const accumulateByKey = <Item, Bucket>(
	items: readonly { key: string; item: Item; bucket: Bucket }[],
	buckets: Map<string, Bucket>,
	join: (bucket: Bucket, item: Item) => void,
): void => {
	for (const { key, item, bucket } of items) {
		const target = buckets.get(key) ?? bucket;
		join(target, item);
		buckets.set(key, target);
	}
};

export { accumulateByKey };
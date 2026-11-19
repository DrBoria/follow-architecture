"use strict";

// A SEEN-SET is one mechanism: a bucket of sets keyed by an id, where a value
// is spoken for once. The invariant runtime dedupes file-level findings per
// PLACE across the whole run (`dedupeBy`); the structure checks report once per
// folder instead of once per file inside it (`required`). The walk is the same
// — read the bucket's set, ask whether the value is there, remember it — so it
// lives here once. What the id and the value MEAN is the caller's own.

// The shared store: one set of seen values per id.
type SeenStore = Map<string, Set<string>>;

// Has this id already spoken for this value? A missing store never dedupes.
const seenHas = (store: SeenStore | null | undefined, id: string, value: string): boolean => store?.get(id)?.has(value) ?? false;

// Remember the value for this id (creating the bucket's set on first use).
// A missing store remembers nothing — the caller decided not to dedupe.
const seenAdd = (store: SeenStore | null | undefined, id: string, value: string): void => {
	if (!store) return;
	const set = store.get(id) ?? new Set<string>();
	set.add(value);
	store.set(id, set);
};

// Has this id already spoken for this value — and if not, remember it? One
// ask-and-remember step: true when the value was already there (the caller
// stays silent), false when it is newly spoken (the caller answers). A missing
// store never dedupes: every value is newly spoken.
const seenOnce = (store: SeenStore | null | undefined, id: string, value: string): boolean => {
	if (seenHas(store, id, value)) return true;
	seenAdd(store, id, value);

	return false;
};

export { seenHas, seenAdd, seenOnce };
export type { SeenStore };
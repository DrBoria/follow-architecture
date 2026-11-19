"use strict";

// Reading a field path off a fact. `{ "path.dir": … }` and `{ path: { dir: … } }`
// are the same filter, and `$path.dir` refers to the same place — so the walk
// below is the single definition of "which value does this key name".
//
// A segment that lands ON a list yields what that segment names in every element
// (`kind.descendants.tags.arg` → every tag argument under the node). Without
// that, `$` could name a fact inside an object but never collect one across a
// list — and "does every parameter have a tag with the same name" is exactly a
// comparison of two such lists.
//
// This module is also the ONE home of the plain-data value guards (`isRecordValue`,
// `isList`, `toList`): every consumer that needs "is this a record / a list / a
// list-or-single" reads them here, so the engine never grows a second copy.

// THE value model every fact is written in. Facts are plain data — no methods —
// so one recursive union describes all of them, and a typed fact (declared as an
// object type alias) is assignable to it. That is what lets the filter engine walk
// any fact without ever meeting `any`.
type FieldValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| readonly FieldValue[]
	| { readonly [key: string]: FieldValue };

// The generic narrowing guards: they keep the caller's own type (`V`) while
// adding the list/record view, so a typed fact stays typed through the walk.
// `isObj` is the ONE record guard — every "is this a record" question reads it.
const isList = <V>(v: V): v is V & readonly FieldValue[] => Array.isArray(v);
const isObj = <V>(v: V): v is V & { readonly [key: string]: FieldValue } => v !== null && typeof v === "object" && !Array.isArray(v);

// A record view of a plain value (never an array): the typed specialisation of
// `isObj` for the `FieldValue` model, used where a key would otherwise collide
// with an Array method (`filter`, `length`, …).
const isRecordValue = (v: FieldValue): v is { readonly [key: string]: FieldValue } => isObj(v);

// A value as a list: null/undefined → nothing, a list → its items, a scalar → one
// item. The ONE spelling of "list-or-single", shared by every `where`/`infer` reader.
const toList = (v: FieldValue): FieldValue[] => {
	if (v == null) return [];
	if (isList(v)) return [...v];
	return [v];
};

const ARRAY_INDEX = /^\d+$/;

// Read ONE key off a value: a list answers `length` and its own indices, an
// object answers its keys, anything else answers nothing.
const readOne = (acc: FieldValue, k: string): FieldValue => {
	if (isList(acc)) {
		if (k === "length") return acc.length;

		return ARRAY_INDEX.test(k) && Number(k) < acc.length ? acc[Number(k)] : undefined;
	}

	return isRecordValue(acc) ? acc[k] : undefined;
};

// The value of a key that is NOT present on a list: what the segment names in
// every element, flattened one level. `fieldOf` already answers `undefined` for a
// null element, and `toList` turns that into nothing — so the walk is one call.
const acrossList = (acc: readonly FieldValue[], k: string): FieldValue => acc.flatMap((entry) => toList(fieldOf(entry, k)));

const fieldOf = (item: FieldValue, key: string): FieldValue => {
	if (item == null) return undefined;
	if (!String(key).includes(".")) return readOne(item, key);

	return String(key)
		.split(".")
		.reduce<FieldValue>((acc, k) => {
			if (acc == null) return undefined;
			// A segment a list ITSELF answers (`length`, an index) is read; any other
			// segment is collected across the list.
			if (isList(acc) && (k === "length" || (ARRAY_INDEX.test(k) && Number(k) < acc.length))) return readOne(acc, k);
			if (isList(acc)) return acrossList(acc, k);

			return readOne(acc, k);
		}, item);
};

export { fieldOf, isObj, isRecordValue, isList, toList };
export type { FieldValue };

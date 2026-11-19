"use strict";

// A RECORD WITHOUT KEYS is one mechanism: a record carries some keys that are
// NOT data (a report template beside a filter, an `arch` beside the facts),
// and a reader that wants only the data takes the record minus those keys.
// The invariant runtime strips `report` before matching (`invariants/vars`);
// the query engine strips `arch` before resolving a `$ref`
// (`entities/queries`). The walk is the same — copy every key except the named
// ones — so it lives here once. Which keys are not data is the caller's own.

import { isRecordValue, type FieldValue } from "./field";

const recordWithout = (record: FieldValue, omitted: readonly string[]): FieldValue => {
	if (!isRecordValue(record)) return record;
	const out: Record<string, FieldValue> = {};
	for (const [k, v] of Object.entries(record)) if (!omitted.includes(k)) out[k] = v;

	return out;
};

export { recordWithout };
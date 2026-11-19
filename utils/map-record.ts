"use strict";

// A MAPPED RECORD is one mechanism: a record's entries are each read into a
// value, and the answers are collected under the same keys. The aliases
// section maps each name to a normalized path (`aliases`); a role's actions
// map each kind to its normalized action (`code-roles/roles`). The walk is the
// same — read each entry, keep the key — so it lives here once. What an entry
// IS and how it is read is the caller's own.

const mapRecord = <Value, Answer>(record: Record<string, Value>, read: (key: string, value: Value) => Answer): Record<string, Answer> =>
	Object.fromEntries(Object.entries(record).map(([k, v]) => [k, read(k, v)]));

export { mapRecord };
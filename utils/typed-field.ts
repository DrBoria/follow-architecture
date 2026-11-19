"use strict";

// A TYPED FIELD is one mechanism: a record's field is read as plain data, and
// only the value of the expected shape is kept — anything else is nothing. A
// report template's string fields are read this way (`invariants/index`); a
// scope accessor's `scope` is read this way (`code-roles/roles`). The walk is
// the same — read, qualify, keep or drop — so it lives here once. What the
// field IS and which shape qualifies is the caller's own.

import { fieldOf, type FieldValue } from "./field";

// The field's value when it has the expected shape; undefined otherwise.
const typedField = <T extends FieldValue>(record: FieldValue, key: string, qualifies: (value: FieldValue) => value is T): T | undefined => {
	const value = fieldOf(record, key);

	return qualifies(value) ? value : undefined;
};

export { typedField };
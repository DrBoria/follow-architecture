"use strict";

// Reading a TYPED field off a plain-data bag. A finding, a violation, a token
// and a fact are all `FieldValue` records at the boundary; a consumer that
// wants one field as a string / number / record / list asks the same question
// every time — read it, qualify the shape, keep it or take the fallback. The
// walk lives here once so no reader re-spells `typeof x === "string" ? x : …`
// (and none meets an `any`). What the field MEANS is the caller's own.

import { fieldOf, isList, isObj, type FieldValue } from "./field";

// The value at `key` when it is a string; the fallback otherwise.
const stringField = (record: FieldValue, key: string, fallback = ""): string => {
	const value = fieldOf(record, key);
	return typeof value === "string" ? value : fallback;
};

// The value at `key` when it is a number; the fallback otherwise.
const numberField = (record: FieldValue, key: string, fallback = 0): number => {
	const value = fieldOf(record, key);
	return typeof value === "number" ? value : fallback;
};

// The value at `key` when it is a boolean; the fallback otherwise.
const booleanField = (record: FieldValue, key: string, fallback = false): boolean => {
	const value = fieldOf(record, key);
	return typeof value === "boolean" ? value : fallback;
};

// The value at `key` when it is a record (never a list); null otherwise.
const recordField = (record: FieldValue, key: string): { readonly [key: string]: FieldValue } | null => {
	const value = fieldOf(record, key);
	return isObj(value) ? value : null;
};

// The value at `key` as a list: a list is itself, a single value becomes one
// item, nothing is no items. The ONE spelling of "list-or-single" for a field.
const itemsOf = (value: FieldValue): FieldValue[] => {
	if (isList(value)) return [...value];
	if (value == null) return [];
	return [value];
};

// The value at `key` as a list of records: non-record items are dropped — a
// reader that wants records never meets a scalar.
const recordListField = (record: FieldValue, key: string): { readonly [key: string]: FieldValue }[] =>
	itemsOf(fieldOf(record, key)).filter((item): item is { readonly [key: string]: FieldValue } => isObj(item));

// The value at `key` as a list of strings: non-string items are dropped.
const stringListField = (record: FieldValue, key: string): string[] =>
	itemsOf(fieldOf(record, key)).filter((item): item is string => typeof item === "string");

export { stringField, numberField, booleanField, recordField, recordListField, stringListField };

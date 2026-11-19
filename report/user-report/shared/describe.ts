"use strict";

// Turn a nested architecture query (`infer` blocks, invariant conditions, `when`
// blocks) into short, readable lines: `subscriptions.length > 0`,
// `descendants[*].kind = ClassDeclaration`. ONE walk, shared by the Node-side
// summarizer (`data/invariants`) and the browser describer
// (`src/utils/describe`), which used to carry the same algorithm twice and
// could drift.
//
// The two callers differ in PRESENTATION only, so that is what the options
// carry — never a second copy of the walk:
//   ignore    keys that are prose, not part of the condition (report/message/…)
//   setValue  the text an `is set` operator prints; `undefined` keeps the value
//             the query carries (the browser reader), `""` blanks it (Node side)

import { CONTAINERS, QUANTIFIERS, SCALAR_OPS } from "../../../entities/operators";
import { isObj, isList, type FieldValue } from "../../../utils/field";
import { dispatchOn } from "../../../utils/dispatch";

// One condition line: a path, an operator, and the value it demands.
type Condition = { path: string; op: string; value: string };

const fmt = (v: FieldValue): string => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v));

// The presentation options: which keys are prose, and what `is set` prints.
type DescribeOptions = { ignore?: readonly string[]; setValue?: string };

// The walk state, threaded through the recursion (one options bag, not five
// positional parameters).
type Walk = { trail: string[]; out: Condition[]; ignore: Set<string>; setValue: string | undefined };

const scalarValue = (op: string, child: FieldValue, setValue: string | undefined): string =>
	op === "is set" && setValue !== undefined ? setValue : fmt(child);

// `at` picks ONE element: it reads as `segments[-2]`, not as a field called
// `at` with children — the index belongs to the path.
const walkAt = (child: FieldValue, trail: string[], state: Walk): void => {
	const src = isObj(child) ? child : { index: child };
	const index = src.index;
	const by = { ...src };
	delete by.index;
	const path = `${trail.join(".")}[${fmt(index)}]`;
	if (!Object.keys(by).length) state.out.push({ path, op: "is set", value: "" });
	else walk(by, [path], state);
};

// The scalar operator a key names, if it is one (the table is the engine's own).
const scalarOpOf = (key: string): string | undefined => Object.entries(SCALAR_OPS).find(([k]) => k === key)?.[1];

const walkEntry = (key: string, child: FieldValue, state: Walk): void => {
	if (state.ignore.has(key)) return;
	if (key === "at") {
		walkAt(child, state.trail, state);
		return;
	}
	if (QUANTIFIERS.has(key)) {
		walk(child, [...state.trail, "[*]"], state);
		return;
	}
	if (CONTAINERS.has(key)) {
		walk(child, [...state.trail, key], state);
		return;
	}
	const op = scalarOpOf(key);
	if (op) {
		state.out.push({ path: state.trail.join(".") || key, op, value: scalarValue(op, child, state.setValue) });
		return;
	}
	walk(child, [...state.trail, key], state);
};

const walkRecord = (value: FieldValue, trail: string[], state: Walk): void => {
	if (!isObj(value)) return;
	for (const [key, child] of Object.entries(value)) walkEntry(key, child, { ...state, trail });
};

const walkLeaf = (value: FieldValue, trail: string[], state: Walk): void => {
	state.out.push({ path: trail.join("."), op: "=", value: fmt(value) });
};

// A record walks its entries; anything else is one leaf condition. The dispatch
// is the shared `dispatchOn` core; the readers are this module's own.
const walk = (value: FieldValue, trail: string[], state: Walk): void => {
	if (value == null) return;
	dispatchOn(
		value,
		(v) => (isObj(v) && !isList(v) ? "record" : "leaf"),
		new Map<string, (v: FieldValue) => void>([
			["record", (v) => walkRecord(v, trail, state)],
			["leaf", (v) => walkLeaf(v, trail, state)],
		]),
		() => undefined,
	);
};

// The condition lines for one query. `ignore` is a list of keys to skip;
// `setValue` overrides the text an `is set` operator prints (see the header).
const describeQuery = (query: FieldValue, opts: DescribeOptions = {}): string[] => {
	const out: Condition[] = [];
	walk(query, [], { trail: [], out, ignore: new Set(opts.ignore ?? []), setValue: opts.setValue });
	// `descendants[*].kind = X` reads better than `.some` colliding mid-path;
	// `[*]` and `[n]` belong to the segment, so the dot before them goes.
	return out.map((c) => `${c.path.replace(/\.\[/g, "[")} ${c.op} ${c.value}`.trim());
};

export { describeQuery };

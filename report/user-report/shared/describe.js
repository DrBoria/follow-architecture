"use strict";

// Turn a nested architecture query (`infer` blocks, invariant conditions, `when`
// blocks) into short, readable lines: `subscriptions.length > 0`,
// `descendants[*].kind = ClassDeclaration`. ONE walk, shared by the Node-side
// summarizer (`data/invariants.js`) and the browser describer
// (`src/utils/describe.js`), which used to carry the same algorithm twice and
// could drift.
//
// The two callers differ in PRESENTATION only, so that is what the options
// carry — never a second copy of the walk:
//   ignore    keys that are prose, not part of the condition (report/message/…)
//   setValue  the text an `is set` operator prints; `undefined` keeps the value
//             the query carries (the browser reader), `""` blanks it (Node side)

const { CONTAINERS, QUANTIFIERS, SCALAR_OPS } = require("../../../entities/operators");

const fmt = (v) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v));

const walk = (value, trail, out, ignore, setValue) => {
	if (value == null) return;
	if (Array.isArray(value) || typeof value !== "object") {
		out.push({ path: trail.join("."), op: "=", value: fmt(value) });
		return;
	}
	for (const [key, child] of Object.entries(value)) {
		if (ignore.has(key)) continue;
		// `at` picks ONE element: it reads as `segments[-2]`, not as a field called
		// `at` with children — the index belongs to the path.
		if (key === "at") {
			const { index, ...by } = child && typeof child === "object" ? child : { index: child };
			const path = `${trail.join(".")}[${index}]`;
			if (!Object.keys(by).length) out.push({ path, op: "is set", value: "" });
			else walk(by, [path], out, ignore, setValue);
			continue;
		}
		if (QUANTIFIERS.has(key)) walk(child, [...trail, "[*]"], out, ignore, setValue);
		else if (CONTAINERS.has(key)) walk(child, [...trail, key], out, ignore, setValue);
		else if (SCALAR_OPS[key]) {
			const op = SCALAR_OPS[key];
			out.push({ path: trail.join(".") || key, op, value: op === "is set" && setValue !== undefined ? setValue : fmt(child) });
		} else walk(child, [...trail, key], out, ignore, setValue);
	}
};

// The condition lines for one query. `ignore` is a list of keys to skip;
// `setValue` overrides the text an `is set` operator prints (see the header).
const describeQuery = (query, { ignore = [], setValue } = {}) => {
	const out = [];
	walk(query, [], out, new Set(ignore), setValue);
	// `descendants[*].kind = X` reads better than `.some` colliding mid-path;
	// `[*]` and `[n]` belong to the segment, so the dot before them goes.
	return out.map((c) => `${c.path.replace(/\.\[/g, "[")} ${c.op} ${c.value}`.trim());
};

module.exports = { describeQuery };

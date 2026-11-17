// Turn a nested architecture query (`infer` blocks, invariant conditions) into
// short readable lines. Same shape rules as the Node-side summarizer, kept
// separate because it runs in the browser bundle.

import { CONTAINERS, QUANTIFIERS, SCALAR_OPS } from "../../../../entities/operators";

const OPS = SCALAR_OPS;

const fmt = (v) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v));

const walk = (value, trail, out) => {
	if (value == null) return;
	if (Array.isArray(value) || typeof value !== "object") {
		out.push({ path: trail.join("."), op: "=", value: fmt(value) });
		return;
	}
	for (const [key, child] of Object.entries(value)) {
		// `at` picks ONE element: it reads as `segments[-2]`, not as a field called
		// `at` with children — the index belongs to the path.
		if (key === "at") {
			const { index, ...by } = child && typeof child === "object" ? child : { index: child };
			const path = `${trail.join(".")}[${index}]`;
			if (!Object.keys(by).length) out.push({ path, op: "is set", value: "" });
			else walk(by, [path], out);
			continue;
		}
		if (QUANTIFIERS.has(key)) walk(child, [...trail, "[*]"], out);
		else if (CONTAINERS.has(key)) walk(child, [...trail, key], out);
		else if (OPS[key]) out.push({ path: trail.join(".") || key, op: OPS[key], value: fmt(child) });
		else walk(child, [...trail, key], out);
	}
};

export const describeQuery = (query) => {
	const out = [];
	walk(query, [], out);
	return out.map((c) => `${c.path.replace(/\.\[/g, "[")} ${c.op} ${c.value}`.trim());
};

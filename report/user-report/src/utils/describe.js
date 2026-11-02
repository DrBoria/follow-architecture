// Turn a nested architecture query (`infer` blocks, invariant conditions) into
// short readable lines. Same shape rules as the Node-side summarizer, kept
// separate because it runs in the browser bundle.

const CONTAINERS = new Set(["some", "every", "none", "length", "where", "filter", "by"]);
const OPS = { gt: ">", gte: "≥", lt: "<", lte: "≤", equals: "=", in: "in", not: "≠", isSet: "is set", globMatches: "matches", matches: "matches" };

const fmt = (v) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v));

const walk = (value, trail, out) => {
	if (value == null) return;
	if (Array.isArray(value) || typeof value !== "object") {
		out.push({ path: trail.join("."), op: "=", value: fmt(value) });
		return;
	}
	for (const [key, child] of Object.entries(value)) {
		if (CONTAINERS.has(key)) walk(child, [...trail, key], out);
		else if (OPS[key]) out.push({ path: trail.join(".") || key, op: OPS[key], value: fmt(child) });
		else walk(child, [...trail, key], out);
	}
};

export const describeQuery = (query) => {
	const out = [];
	walk(query, [], out);
	return out.map((c) => `${c.path} ${c.op} ${c.value}`.trim());
};

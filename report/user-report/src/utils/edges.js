// Kind helpers shared by the screens. An edge carries its action kinds as
// `kinds` (with a single legacy `kind` fallback); both the Code Roles screen and
// the Declared-architecture screen need the distinct kinds, their counts, and
// the edges filtered by one kind — the same three readings, written once.

const kindsOfEdge = (edge) => edge.kinds ?? [edge.kind];

// The distinct action kinds across a set of edges, in first-seen order.
export const edgeKinds = (edges) => {
	const out = [];
	for (const e of edges) for (const k of kindsOfEdge(e)) if (!out.includes(k)) out.push(k);
	return out;
};

// How many edges each kind appears on.
export const edgeKindCounts = (edges) => {
	const map = new Map();
	for (const e of edges) for (const k of kindsOfEdge(e)) map.set(k, (map.get(k) ?? 0) + 1);
	return map;
};

// The edges limited to one kind; `"all"` keeps every edge.
export const edgesOfKind = (edges, kind) => (kind === "all" ? edges : edges.filter((e) => kindsOfEdge(e).includes(kind)));

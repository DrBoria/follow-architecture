import { distinctFlat } from "../../../../utils/distinct";
import { countBy } from "../../../../utils/count";
import type { AccessEdge } from "../../../../entities/access-graph";

// Kind helpers shared by the screens. An edge carries its action kinds as
// `kinds` (with a single legacy `kind` fallback); both the Code Roles screen and
// the Declared-architecture screen need the distinct kinds, their counts, and
// the edges filtered by one kind — the same three readings, written once.

const kindsOfEdge = (edge: AccessEdge): string[] => edge.kinds ?? [edge.kind];

// The distinct action kinds across a set of edges, in first-seen order.
export const edgeKinds = (edges: readonly AccessEdge[]): string[] => distinctFlat(edges, kindsOfEdge);

// How many edges each kind appears on.
export const edgeKindCounts = (edges: readonly AccessEdge[]): Map<string, number> => {
	const pairs = edges.flatMap((e) => kindsOfEdge(e).map((k) => ({ k })));
	return new Map(countBy(pairs, (p) => p.k));
};

// The edges limited to one kind; `"all"` keeps every edge.
export const edgesOfKind = <E extends AccessEdge>(edges: readonly E[], kind: string): E[] =>
	kind === "all" ? [...edges] : edges.filter((e) => kindsOfEdge(e).includes(kind));

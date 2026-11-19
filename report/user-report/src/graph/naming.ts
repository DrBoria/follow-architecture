// Slug → the path a reader recognises. The node list is the overview's own
// summaries (folder boxes or role boxes — both carry slug/name/paths).
import type { NodeSummary } from "../../../../entities/overview-summaries";
import type { RoleNode } from "../../../../entities/access-graph";

type Named = Pick<NodeSummary, "slug" | "name" | "paths"> | RoleNode;

export const nameOf = (nodes: readonly Named[] | null | undefined, slug: string | null | undefined): string => {
	if (!slug) return "—";
	const node = (nodes ?? []).find((n) => n.slug === slug);
	return node?.paths?.[0] ?? node?.name ?? slug;
};

export const words = (text: string | null | undefined): string =>
	String(text ?? "")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.toLowerCase();

export const listOf = (nodes: readonly Named[] | null | undefined, slugs: readonly string[] | null | undefined, limit = 3): string => {
	const names = (slugs ?? []).map((s) => nameOf(nodes, s));
	if (names.length <= limit) return names.join(", ");
	return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
};

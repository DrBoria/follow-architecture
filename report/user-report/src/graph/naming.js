// Slug → the path a reader recognises.
export const nameOf = (nodes, slug) => {
	if (!slug) return "—";
	const node = (nodes ?? []).find((n) => n.slug === slug);
	return node?.paths?.[0] ?? node?.name ?? slug;
};

export const words = (text) =>
	String(text ?? "")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.toLowerCase();

export const listOf = (nodes, slugs, limit = 3) => {
	const names = (slugs ?? []).map((s) => nameOf(nodes, s));
	if (names.length <= limit) return names.join(", ");
	return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
};

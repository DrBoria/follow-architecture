"use strict";

// A PATH LABEL is one mechanism: a node's path(s) read as the shortest string
// that still says WHERE it is. A node that fans out over several parents reads
// as a template (`apps/backend/*/store.ts`); the label keeps the last N
// segments. The browser labels boxes / cards / badges (`utils/format`); any
// consumer that names a place asks the same question. The walk lives here once.

// One label for a node's path(s): a template when the node fans out over
// several parents, otherwise the path itself.
const pathTemplate = (paths: readonly (string | null | undefined)[] | null | undefined): string => {
	const list = (paths ?? []).filter((p): p is string => Boolean(p));
	if (!list.length) return "";
	if (list.length === 1) return list[0];
	const split = list.map((p) => p.split("/"));
	const len = Math.max(...split.map((p) => p.length));
	const out: string[] = [];
	for (let i = 0; i < len; i += 1) {
		const seg = split[0][i];
		out.push(split.every((p) => p[i] === seg) ? seg : "*");
	}
	return out.join("/");
};

// Shortest label that still says WHERE it is: the last N path segments.
const tailPath = (template: string | null | undefined, keep = 2): string => {
	const segs = String(template ?? "").split("/").filter(Boolean);
	return segs.length <= keep ? segs.join("/") : segs.slice(-keep).join("/");
};

// The label for a node-like `{ paths }`: its template, shortened to the tail.
const nodeLabel = (node: { paths?: readonly (string | null | undefined)[] | null } | null | undefined, keep = 2): string =>
	tailPath(pathTemplate(node?.paths), keep);

export { pathTemplate, tailPath, nodeLabel };

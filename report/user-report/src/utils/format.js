// Small presentation helpers shared by every screen.

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many ?? `${one}s`}`;

export const shortPath = (p, max = 52) => {
	if (!p || p.length <= max) return p ?? "";
	const parts = p.split("/");
	let out = parts.pop();
	while (parts.length && `${parts[parts.length - 1]}/${out}`.length < max) out = `${parts.pop()}/${out}`;
	return `…/${out}`;
};

export const fileName = (p) => (p ? p.split("/").pop() : "");

export const dirOf = (p) => {
	if (!p) return "";
	const i = p.lastIndexOf("/");
	return i === -1 ? "" : p.slice(0, i);
};

// Group a flat list into buckets keyed by `keyFn`, preserving first-seen order.
export const groupBy = (list, keyFn) => {
	const map = new Map();
	for (const item of list) {
		const key = keyFn(item);
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(item);
	}
	return [...map.entries()];
};

export const matchesText = (haystack, needle) => {
	if (!needle) return true;
	return String(haystack ?? "")
		.toLowerCase()
		.includes(needle.toLowerCase());
};

// One label for a node's path(s): a template when the node fans out over
// several parents (`apps/backend/*/store.ts`), otherwise the path itself.
export const pathTemplate = (paths) => {
	const list = (paths ?? []).filter(Boolean);
	if (!list.length) return "";
	if (list.length === 1) return list[0];
	const split = list.map((p) => p.split("/"));
	const len = Math.max(...split.map((p) => p.length));
	const out = [];
	for (let i = 0; i < len; i += 1) {
		const seg = split[0][i];
		out.push(split.every((p) => p[i] === seg) ? seg : "*");
	}
	return out.join("/");
};

// Shortest label that still says WHERE it is: the last N path segments.
const tailPath = (template, keep = 2) => {
	const segs = String(template ?? "").split("/").filter(Boolean);
	return segs.length <= keep ? segs.join("/") : segs.slice(-keep).join("/");
};

export const nodeLabel = (node, keep = 2) => tailPath(pathTemplate(node?.paths), keep);

// A declared scope glob reads best without its tail wildcards:
// `apps/backend/{kebab-case}/actions/**/*.ts` → `{kebab-case}/actions`.
export const globLabel = (glob, keep = 2) => tailPath(String(glob ?? "").replace(/\/\*\*.*$/, ""), keep);

// A `scopeAccess` entry is structured config (`{ scope, segments }`); read it
// back as the expression a caller writes. Nothing is invented — the segments
// and the call/member shape come straight from the architecture.
export const accessorSignature = (a) => {
	const segments = a?.segments ?? [];
	if (!segments.length) return "";
	const chain = segments.join(".");
	return a.kind === "identifier" ? chain : `${chain}(…)`;
};

export const accessorLabel = (list) => (list ?? []).map(accessorSignature).filter(Boolean).join(" · ");

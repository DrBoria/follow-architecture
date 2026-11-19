// Small presentation helpers shared by every screen. The counting, grouping,
// searching and path-label walks are the SHARED cores (`utils/*`) — this module
// re-exports them so the browser reads the same answers the Node side does, and
// keeps only the presentation spellings that are the browser's own.

export { plural } from "../../../../utils/plural";
export { fileName } from "../../../../utils/file-name";
export { groupBy } from "../../../../utils/group";
export { matchesText } from "../../../../utils/search";
export { pathTemplate, tailPath, nodeLabel } from "../../../../utils/path-label";

import { tailPath } from "../../../../utils/path-label";
import type { ScopeAccessor } from "../../../../entities/architecture";

// A path shortened to fit a box: keep the tail, prepend as many leading
// segments as still fit, and mark the cut with an ellipsis.
export const shortPath = (p: string | null | undefined, max = 52): string => {
	if (!p || p.length <= max) return p ?? "";
	const parts = p.split("/");
	let out = parts.pop() ?? "";
	while (parts.length && `${parts[parts.length - 1]}/${out}`.length < max) out = `${parts.pop()}/${out}`;
	return `…/${out}`;
};

// The folder a path sits in ("" when it sits at the root).
export const dirOf = (p: string | null | undefined): string => {
	if (!p) return "";
	const i = p.lastIndexOf("/");
	return i === -1 ? "" : p.slice(0, i);
};

// A declared scope glob reads best without its tail wildcards:
// `apps/backend/{kebab-case}/actions/**/*.ts` → `{kebab-case}/actions`.
export const globLabel = (glob: string | null | undefined, keep = 2): string =>
	tailPath(String(glob ?? "").replace(/\/\*\*.*$/, ""), keep);

// A `scopeAccess` entry is structured config (`{ scope, segments }`); read it
// back as the expression a caller writes. Nothing is invented — the segments
// and the call/member shape come straight from the architecture.
export const accessorSignature = (a: (ScopeAccessor & { kind?: string }) | null | undefined): string => {
	const segments = a?.segments ?? [];
	if (!segments.length) return "";
	const chain = segments.join(".");
	return a?.kind === "identifier" ? chain : `${chain}(…)`;
};

export const accessorLabel = (list: readonly (ScopeAccessor & { kind?: string })[] | null | undefined): string =>
	(list ?? []).map(accessorSignature).filter(Boolean).join(" · ");

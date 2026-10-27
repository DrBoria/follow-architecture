"use strict";
const { pipe, map, filter, sort } = require("remeda");
const { nodePrefixRe, compileChild } = require("./children");

// A node may declare several parents (`parent: [a, b, c]`), which fans it out
// into one path variant per parent (e.g. `apps/backend/document/store.ts` for
// each feature). A variant's path is the parent's resolved path + the node's
// own name, so `actions` under `{kebab-case}` becomes `src/{kebab-case}/actions`.
// Each variant carries its own prefix regex, placeholder names, literal length
// and path; the node's canonical `path` is the first variant's, used for
// identity and for building child/declaration paths.
const variantsOf = (n, parentPaths) => {
	const parents = Array.isArray(n.parent) ? n.parent : n.parent ? [n.parent] : [null];
	return parents.map((p) => {
		const base = p == null ? null : parentPaths[p];
		// A parent whose name is "." (the repo root) contributes no path
		// segment — otherwise every child path would gain a `./` prefix that
		// no real relative path ever has, and the prefix regexes would match
		// nothing (silently disabling all location/import checks).
		const path = base == null || base === "." ? n.name : `${base}/${n.name}`;
		const { re, names, literalLen, isFile } = nodePrefixRe(path);
		return { path, re, names, literalLen, isFile };
	});
};

// Each `allowedFrom` entry is one of:
//   - a string → glob pattern (direct path match)
//   - `{node: slug}` → node reference (matches files under that node's path)
//   - any other object → query filter (evaluated via `matches()` against file facts)
const parseLocationEntry = (entry) => {
	if (typeof entry === "string") return { type: "glob", glob: entry };
	if (entry.node != null) return { type: "node", node: entry.node };
	return { type: "query", query: entry };
};

const parseLocation = (loc) => {
	if (loc == null) return null;
	const parseAllowedFrom = (list) =>
		list == null ? null : list.map(parseLocationEntry);
	return {
		// `declaration: [role, ...]` — the code-roles this node is the
		// DECLARATION HOME of: a candidate of one of those roles only fits
		// while it lives under this node, and a misfit is routed here.
		declaration: Array.isArray(loc.declaration)
			? loc.declaration.map((r) => String(r))
			: null,
		import: loc.import == null ? null : {
			allowedFrom: parseAllowedFrom(loc.import.allowedFrom),
		},
		usage: loc.usage == null ? null : {
			allowedFrom: parseAllowedFrom(loc.usage.allowedFrom),
		},
		// The store-field names through which this node's scope is reached
		// (`getRoot(self).<name>` / `getParent(self).<name>`). A node that
		// composes sibling stores (e.g. a root store holding `grammar`)
		// declares the field names here; `location.usage.allowedFrom` then
		// governs which files may reach it through those fields.
		scopeAccess: loc.scopeAccess == null ? null : Array.isArray(loc.scopeAccess) ? loc.scopeAccess : [loc.scopeAccess],
	};
};

const make = (n) => {
	const parents = Array.isArray(n.parent) ? n.parent : n.parent ? [n.parent] : [null];
	return {
		slug: n.slug,
		name: n.name,
		parent: n.parent,
		parents,
		children: (n.children ?? []).map(compileChild),
		report: n.report,
		closed: n.closed,
		// `kind` absent → null (no restriction); `kind: []` → empty array
		// (declared type-only: no runtime candidate fits). checkFinally tests
		// `node.kind !== null`, so the two must stay distinct.
		kind: n.kind == null ? null : n.kind,
		location: parseLocation(n.location),
	};
};

const buildTree = (nodes) => {
	// `nodes` may be an array (each item carries its own `slug`) or an object
	// keyed by slug (the key is the slug when the item omits one).
	const list = Array.isArray(nodes) ? nodes : nodes ? Object.entries(nodes).map(([k, v]) => (v.slug ? v : { ...v, slug: k })) : [];
	const all = list.map(make);
	const bySlug = Object.fromEntries(all.map((n) => [n.slug, n]));
	for (const n of all) {
		for (const p of n.parents) {
			if (p != null && !bySlug[p]) throw new Error(`node ${n.slug}: unknown parent ${p}`);
		}
	}
	// Resolve each node's variants against its parents' resolved paths. This
	// is order-independent: a node's path is computed from its parent's
	// resolved path, resolved on demand (memoized), so the config may list
	// nodes in any order.
	const resolvedPath = {};
	const resolvePath = (n) => {
		if (resolvedPath[n.slug] != null) return resolvedPath[n.slug];
		const parentPaths = {};
		for (const p of n.parents) if (p != null) parentPaths[p] = resolvePath(bySlug[p]);
		n.variants = variantsOf(n, parentPaths);
		resolvedPath[n.slug] = n.variants[0].path;
		return resolvedPath[n.slug];
	};
	for (const n of all) resolvePath(n);
	for (const n of all) {
		const v0 = n.variants[0];
		n.path = v0.path;
		n.re = v0.re;
		n.prefixRe = v0.re;
		n.prefixNames = v0.names;
		n.literalLen = v0.literalLen;
		n.isFile = v0.isFile;
	}
	const roots = all.filter((n) => !n.parents[0]);
	return { all, bySlug, roots };
};

const matchNode = (node, relPath) => {
	for (const v of node.variants) {
		const m = v.re.exec(relPath);
		if (!m) continue;
		// Folder node: regex is `^prefix/([^/]+)(?:/(.*))?$`, so the first
		// segment after the prefix is capture (names.length + 1). File node:
		// regex is `^prefix$` with no segment capture — the basename is the
		// entry. `m[0]` is the full match, never a segment.
		const seg = v.isFile ? relPath.split("/").pop() : m[v.names.length + 1];
		return { node: { ...node, path: v.path, prefixRe: v.re, prefixNames: v.names, literalLen: v.literalLen, isFile: v.isFile }, seg, caps: Object.fromEntries(v.names.map((nm, i) => [nm, m[i + 1]])) };
	}
	return null;
};

const allMatches = (relPath, arch) =>
	pipe(
		arch.nodes.all,
		filter((n) => n.variants.some((v) => v.re.test(relPath))),
		map((n) => matchNode(n, relPath)),
		filter(Boolean),
		sort((a, b) => a.node.literalLen - b.node.literalLen || a.node.path.length - b.node.path.length),
	);

const deepestMatch = (relPath, arch) => {
	const r = allMatches(relPath, arch);
	return r.length ? r[r.length - 1] : null;
};

// The segment index each placeholder sits at in the `allowedFrom` globs.
// A placeholder used at one fixed index across all globs is positional:
// `apps/backend/{kebab-case}/store.ts` and
// `apps/backend/{kebab-case}/**/*.ts` both put `kebab-case` at index 2.
// A placeholder used at different indices is not positional and is left to
// node captures.
const placeholderPositions = (arch) => {
	const pos = {};
	for (const n of arch.nodes.all) {
		const loc = n.location;
		const globs = [
			...(loc?.import?.allowedFrom ?? []),
			...(loc?.usage?.allowedFrom ?? []),
		].filter((e) => e.type === "glob");
		for (const e of globs) {
			e.glob.split("/").forEach((seg, i) => {
				const m = seg.match(/^\{([\w-]+)\}$/);
				if (!m) return;
				if (pos[m[1]] == null) pos[m[1]] = i;
				else if (pos[m[1]] !== i) pos[m[1]] = -1; // not positional
			});
		}
	}
	return pos;
};

const targetCapsFor = (relPath, arch) => {
	const caps = allMatches(relPath, arch).reduce((acc, m) => ({ ...acc, ...m.caps }), {});
	const segs = relPath.split("/");
	for (const [nm, idx] of Object.entries(placeholderPositions(arch))) {
		if (idx > 0 && !(nm in caps)) {
			const seg = segs[idx];
			if (seg != null && !seg.includes("{")) caps[nm] = seg;
		}
	}
	return caps;
};

const findChild = (children, seg, isFile) => pipe(children, filter((c) => c.folder === !isFile && c.re.test(seg)), (r) => (r.length ? r[0] : null));

// A child whose name is a template (`{kebab-case}`) is not a slug: the walk
// must find the node under `parentSlug` whose own name is that template and
// whose prefix matches `relPath`, to keep validating deeper segments against
// that node's closed children list.
const templateNode = (arch, parentSlug, child, relPath) =>
	pipe(
		arch.nodes.all,
		filter((n) => n.parents.includes(parentSlug) && n.name === child.name && n.variants.some((v) => v.re.test(relPath))),
		(r) => (r.length ? r[r.length - 1] : null),
	);

const checkEntry = (match, child, out, findingFrom) => {
	const vars = { path: match.rel, basename: match.seg, ...match.caps };
	if (child && child.forbidden) {
		out.push(findingFrom({ key: "forbidden", report: child.report }, "nodes", match.node.slug, `nodes:${match.node.slug}:forbidden`, vars));
		return;
	}
	if (!child && match.node.closed) {
		// Default message names the offending entry — without it the finding
		// falls back to the useless "architecture violation".
		out.push(findingFrom({ key: "closed", report: match.node.report ?? `\`{basename}\` is not an allowed child of node \`${match.node.slug}\`` }, "nodes", match.node.slug, `nodes:${match.node.slug}:closed`, vars));
	}
};

const checkTree = (relPath, arch, out, finding) => {
	const match = deepestMatch(relPath, arch);
	if (!match) return;
	if (match.isFile) {
		checkEntry({ node: match.node, seg: match.seg, isFile: true, caps: match.caps, rel: relPath }, findChild(match.node.children, match.seg, true), out, finding);
		return;
	}
	const m = match.node.prefixRe.exec(relPath);
	const rest = m[match.node.prefixNames.length + 2];
	// The full sub-path below the node: the first captured segment plus the
	// remainder. Every segment except the last is a folder; the last is the
	// file. Walking only the remainder (and treating the file as a folder)
	// dropped the first segment, so a forbidden/allowed folder rule keyed on
	// it could never fire.
	const parts = rest == null ? [match.seg] : [match.seg, ...rest.split("/")];
	let node = match.node;
	for (let idx = 0; idx < parts.length; idx += 1) {
		const last = idx === parts.length - 1;
		const child = findChild(node.children, parts[idx], last);
		checkEntry({ node, seg: parts[idx], isFile: last, caps: match.caps, rel: relPath }, child, out, finding);
		if (!child) {
			node = null;
			break;
		}
		// An explicit `slug` links the child to a node; a template child
		// (`{kebab-case}`) is resolved to the node under this parent whose own
		// name is the template and whose prefix matches the path.
		node = child.slug ? arch.nodes.bySlug[child.slug] ?? null : templateNode(arch, node.slug, child, relPath);
		if (!node) break;
	}
};

const matchers = (arch) => {
	const nodeRes = arch.nodes.all.flatMap((n) => n.variants.map((v) => v.re));
	const invGlobs = arch.invariants.map((i) => i.where).filter((w) => Array.isArray(w) && w.length > 0);
	return (rel) => nodeRes.some((re) => re.test(rel)) || invGlobs.some((globs) => globs.some((g) => g.re.test(rel)));
};

module.exports = { buildTree, checkTree, matchers, matchNode, deepestMatch, targetCapsFor };

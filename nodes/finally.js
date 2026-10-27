"use strict";

// `finally-follow-architecture` — the single built-in structure rule.
//
// For every file it checks the deepest node that owns it:
//   1. fit — a candidate whose role is not among the node's kinds, or whose
//      role declares a `location.declaration` node elsewhere, belongs there. A type
//      declaration (interface / type alias) must be in a node whose kind
//      includes its ts-morph kind.
//   2. query children — a file matching a child node's `query` but not under
//      that child's instance holds content that belongs in the child.
//   3. required children — a child marked `required: true` must exist.
//   4. location — imports/calls into a node that declares
//      `location.import.allowedFrom` or `location.usage.allowedFrom` must
//      come from files matching the allowed set.
//
// Every violation is reported with its line and the exact destination node,
// so the finding is self-sufficient: a fix agent needs nothing but the text.

const { matches } = require("../utils/queries");
const { deepestMatch, targetCapsFor } = require("./tree");
const { nodePrefixRe } = require("./children");
const { checkAllowedFrom } = require("./connector");

// Does a path template (possibly with placeholder segments) fit the beginning
// of a concrete path? Placeholders match any single segment; literals must
// equal. Used to pick the branch of a multi-parent declaration node the file
// actually lives in.
const pathFits = (template, rel) => {
	const ts = template.split("/");
	const rs = rel.split("/");
	if (ts.length > rs.length) return false;
	for (let i = 0; i < ts.length; i += 1) {
		if (/^\{[A-Za-z-]+\}$/.test(ts[i])) continue;
		if (ts[i] !== rs[i]) return false;
	}
	return true;
};

// Resolve a declaration node's instance against the file that owns the candidate:
// the declaration path's placeholder segments are filled from the FILE's concrete
// segments (same position), the rest stay literal. The file is inside the
// node that matched, so its segments are the node's actual captured values.
// Declaration `apps/backend/{kebab-case}/actions` for file
// `apps/backend/grammar/store.ts` → `apps/backend/grammar/actions`.
//
// A multi-parent declaration node has one variant per parent branch and its
// canonical path is the FIRST variant's — only correct for files in that
// first branch. For a file in another branch, pick the variant whose branch
// the file lives in, so an action in `apps/backend/resolve/store.ts` points
// at `apps/backend/resolve/actions`, not `apps/backend/document/actions`.
// The declaration folder is a SIBLING of the file, so the match runs the variant's
// branch (all but its last segment) against the file's directory.
const declarationInstance = (decl, node, rel) => {
	if (node.path === ".") return decl.path;
	const variants = decl.variants;
	const dir = rel.split("/").slice(0, -1).join("/");
	const base = variants ? (variants.find((v) => pathFits(v.path.split("/").slice(0, -1).join("/"), dir)) ?? variants[0]).path : decl.path;
	const m = node.prefixRe.exec(rel);
	if (!m) return base;
	const fileSegs = rel.split("/");
	const declSegs = base.split("/");
	const isPh = (s) => /^\{[A-Za-z-]+\}$/.test(s);
	const out = declSegs.map((s, i) => (isPh(s) ? (fileSegs[i] ?? s) : s));
	return out.join("/");
};

// Resolve a child node's concrete instance against the node that owns the
// file: the child's path is the owner's path + the child's own name; the
// owner's placeholder segments are filled from the file's actual segments.
// Owner `src/{kebab-case}` + child `actions` for file `src/alpha/store.ts`
// → `src/alpha/actions`.
const childInstance = (owner, childName, rel) => {
	const childPath = owner.path === "." ? childName : `${owner.path}/${childName}`;
	const { re } = nodePrefixRe(childPath);
	const m = re.exec(rel);
	if (!m) return childPath;
	// The child path's own placeholders are filled by the regex; the owner's
	// placeholders (already concrete in `rel`) are literal here. So the
	// resolved instance is simply the matched prefix up to the child name.
	const segs = rel.split("/");
	const childSegs = childPath.split("/");
	const out = [];
	const isPh = (s) => /^\{[A-Za-z-]+\}$/.test(s);
	for (let i = 0; i < childSegs.length; i += 1) {
		out.push(isPh(childSegs[i]) ? (segs[i] ?? childSegs[i]) : childSegs[i]);
	}
	return out.join("/");
};

// role → node that declares `location.declaration: [role, ...]`
const declarationByRole = (arch) => {
	const m = new Map();
	for (const n of arch.nodes.all) {
		if (!Array.isArray(n.location?.declaration)) continue;
		for (const r of n.location.declaration) if (!m.has(r)) m.set(r, n);
	}
	return m;
};

const isTypeKind = (k) => k === "InterfaceDeclaration" || k === "TypeAliasDeclaration";

// How well a node path fits the current file's context. A static segment
// scores when it equals the current segment; a {placeholder} scores as a
// wildcard. Primary = total matching segments (deeper match wins); secondary
// = static matches (breaks ties in favor of the more literal node).
const contextScore = (nodePath, rel) => {
	const ns = nodePath.split("/");
	const cs = rel.split("/");
	let primary = 0;
	let secondary = 0;
	for (let i = 0; i < ns.length; i += 1) {
		if (i >= cs.length) break;
		if (ns[i].startsWith("{")) {
			primary += 1;
		} else if (ns[i] === cs[i]) {
			primary += 1;
			secondary += 1;
		}
	}
	return [primary, secondary];
};

// The node whose `kind` includes `role` and whose path best fits the current
// file's context (deepest directory match, literal preferred on ties). This
// makes a feature's own type.ts the destination for a type found in a feature
// file, while a type found in a utils file still routes to the shared utils
// type.ts — the static "most specific path" map can't tell those apart.
const nearestKindNode = (arch, role, rel) => {
	let best = null;
	let bestScore = [-1, -1];
	for (const n of arch.nodes.all) {
		if (!n.kind?.includes(role)) continue;
		const s = contextScore(n.path, rel);
		if (s[0] > bestScore[0] || (s[0] === bestScore[0] && s[1] > bestScore[1])) {
			best = n;
			bestScore = s;
		}
	}
	return best;
};

// The destination for a candidate of the given role, resolved against the
// file that currently holds it: its declaration node's instance (if the role declares one) or the node whose kind includes the role and whose path
// best fits the current file. Returns `{slug, path}` — the node's slug
// (which node the architecture names for this role) and the concrete path
// with the file's placeholder segments filled in. Shared by check 2 (fit)
// and the pipeline's role reports, so both name the same destination.
const destinationFor = (role, arch, node, rel) => {
	const decl = declarationByRole(arch).get(role);
	if (decl) return { slug: decl.slug, path: declarationInstance(decl, node, rel) };
	const kindNode = nearestKindNode(arch, role, rel);
	if (kindNode) {
		const segs = rel.split("/");
		const phSegs = kindNode.path.split("/");
		return { slug: kindNode.slug, path: phSegs.map((s, i) => (/^\{[A-Za-z-]+\}$/.test(s) ? (segs[i] ?? s) : s)).join("/") };
	}
	return null;
};

// Does the file live under ANY branch of the declaration node? A multi-parent declaration
// node's canonical `prefixRe` is only the first variant's, so a file in a
// later branch (e.g. `grammar/actions/`) would read as "not under declaration" and
// get flagged as a misfit in its own correct folder.
const underAnyDeclarationVariant = (decl, rel) => (decl.variants ?? [decl]).some((v) => v.re.test(rel));

// Does a candidate of the given role fit the node that owns the file? The
// role must be among the node's declared kinds (when any) and must live under
// its declaration node (when the role declares one). Used by the pipeline to fire a
// role's top-level `report` only for misfit candidates.
const fitsRole = (role, arch, node, rel) => {
	if (node.kind && !node.kind.includes(role)) return false;
	const decl = declarationByRole(arch).get(role);
	return decl ? underAnyDeclarationVariant(decl, rel) : true;
};

const checkFinally = (ctx, arch, out, findingFrom) => {
	const match = deepestMatch(ctx.rel, arch);
	if (!match) return;
	const node = match.node;
	const candidates = ctx.facts.candidates ?? [];

	const hasKind = node.kind !== null;
	const violations = [];

	// 1. Every candidate must fit the node: a classified candidate's role
	//    must be among the node's kinds (when declared) and must live under
	//    its declaration node; a type declaration (interface / type alias) must be
	//    in a node whose kind includes its ts-morph kind. A file whose node
	//    declares runtime kinds but holds only types surfaces here too: each
	//    type is a candidate that doesn't fit a runtime node, reported with
	//    its line and destination.
	const seen = new Set();
	const declarations = declarationByRole(arch);
	for (const c of candidates) {
		// Type declarations have no code role — route them by their kind
		// name (e.g. `InterfaceDeclaration`), which nodes may also declare.
		const role = c.role ?? (isTypeKind(c.kind) ? c.kind : null);
		if (!role) continue;
		const inKind = !hasKind || node.kind.includes(role);
		const decl = declarations.get(role);
		const underDecl = decl ? underAnyDeclarationVariant(decl, ctx.rel) : false;
		if (inKind && (!decl || underDecl)) continue;

		const key = `${role}:${c.name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const where = destinationFor(role, arch, node, ctx.rel)?.path ?? `a node whose kind includes \`${role}\``;
		const label = c.name ?? c.parentName ?? (c.calledBy ? `${c.calledBy} callback` : "anonymous");
		violations.push({ line: c.line ?? 1, text: `A \`${role}\` (${label}) belong in \`${where}\`` });
	}

	// 2. Query children: a child node may declare a `query` (the invariant
	//    filter language, code-roles included). A file whose OWN node declares
	//    such a child, that matches the child's query, but is not under the
	//    child's instance holds content that belongs in the child. Scoped to
	//    the deepest node so a feature's children never fire for files in an
	//    unrelated subtree. This is the generic replacement for per-case
	//    "X must live in Y" invariants.
	for (const child of node.children) {
		if (!child.query) continue;
		if (!matches(ctx.facts, child.query)) continue;
		const childPath = node.path === "." ? child.name : `${node.path}/${child.name}`;
		const { re } = nodePrefixRe(childPath);
		if (re.test(ctx.rel)) continue; // already in the right place
		const where = childInstance(node, child.name, ctx.rel);
		violations.push({ line: 1, text: `this file matches the query of node \`${child.slug ?? child.name}\` and belong in \`${where}\`` });
	}

	// 3. Required children: a child marked `required: true` must exist under
	//    the node. A folder lacking it (e.g. a feature without store.ts) is a
	//    finding, reported once per file of that folder.
	for (const child of node.children) {
		if (!child.required) continue;
		const childPath = node.path === "." ? child.name : `${node.path}/${child.name}`;
		const exists = (ctx.repoFiles ?? []).some((f) => f === childPath || f.startsWith(`${childPath}/`));
		if (exists) continue;
		violations.push({ line: 1, text: `this feature folder is missing its required \`${child.name}\` — create \`${childInstance(node, child.name, ctx.rel)}\`` });
	}

	// 4. Location: imports and calls into a node that declares
	//    `location.import.allowedFrom` or `location.usage.allowedFrom` must
	//    come from files matching the allowed set. For each import/call in
	//    this file, find the deepest node that owns the target; if that node
	//    declares a location restriction, verify the current file passes.
	const facts = ctx.facts;
	const importEntries = facts.imports ?? [];
	const callEntries = facts.candidates ?? [];

	for (const imp of importEntries) {
		if (!imp.resolved) continue;
		const targetMatch = deepestMatch(imp.resolved, arch);
		if (!targetMatch) continue;
		const targetNode = targetMatch.node;
		const loc = targetNode.location;
		if (!loc?.import?.allowedFrom) continue;
		const violation = checkAllowedFrom(loc.import.allowedFrom, ctx.rel, arch, facts, targetCapsFor(imp.resolved, arch));
		if (violation) {
			violations.push({ line: imp.line ?? 1, text: `\`import\` from \`${imp.resolved}\` (node \`${targetNode.slug}\`) is not allowed — ${violation}` });
		}
	}

	for (const c of callEntries) {
		if (!c.calls) continue;
		for (const call of c.calls) {
			if (!call.module) continue;
			const targetMatch = deepestMatch(call.module, arch);
			if (!targetMatch) continue;
			const targetNode = targetMatch.node;
			const loc = targetNode.location;
			if (!loc?.usage?.allowedFrom) continue;
			const violation = checkAllowedFrom(loc.usage.allowedFrom, ctx.rel, arch, facts, targetCapsFor(call.module, arch));
			if (violation) {
				violations.push({ line: c.line ?? 1, text: `call to \`${call.action}\` in \`${call.module}\` (node \`${targetNode.slug}\`) is not allowed — ${violation}` });
			}
		}
	}

	// Scope accesses: any dot chain the fact collector recorded (fact:
	// `scopeAccesses`) for a chain rooted at one of the roles' structured
	// `scopeAccessors` (`{ kind, segments }` — call / identifier /
	// methodCall, fully config-driven). The first chain segment is the store
	// field name; the node that declares that field in `location.scopeAccess`
	// owns the access, and its `location.usage.allowedFrom` governs who may
	// reach it. This is how cross-store calls are checked without imports.
	for (const sa of facts.scopeAccesses ?? []) {
		const field = sa.chain?.[0];
		if (!field) continue;
		const owner = arch.nodes.all.find((n) => n.location?.scopeAccess?.includes(field));
		if (!owner) {
			violations.push({ line: sa.line ?? 1, text: `\`${sa.via}(…).${sa.chain.join(".")}\` reaches a store field \`${field}\` that no node declares in \`location.scopeAccess\`` });
			continue;
		}
		const loc = owner.location;
		if (!loc.usage?.allowedFrom) continue;
		const violation = checkAllowedFrom(loc.usage.allowedFrom, ctx.rel, arch, facts, null);
		if (violation) {
			violations.push({ line: sa.line ?? 1, text: `\`${sa.via}(…).${sa.chain.join(".")}\` reaches node \`${owner.slug}\` through \`${field}\` — ${violation}` });
		}
	}

	if (violations.length === 0) return;

	violations.sort((a, b) => a.line - b.line);
	const body = violations.map((v) => `line ${v.line}: ${v.text}`).join("; ");
	out.push(
		findingFrom(
			{
				report: {
					message: `node \`${node.slug}\` contains extra functionality: ${body}`,
					fix: `Move each listed item to the destination named next to it — the architecture declares where every code-role lives. Do not leave runtime code in \`${ctx.rel}\`.`,
				},
				line: 1,
			},
			"finally-follow-architecture",
			node.slug,
			`finally:${node.slug}:${ctx.rel}`,
			{ path: ctx.rel, node: node.slug, what: ctx.rel },
		),
	);
};

module.exports = { checkFinally, destinationFor, fitsRole };

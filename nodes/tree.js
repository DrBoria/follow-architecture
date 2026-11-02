"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { pipe, map, filter, sort } = require("remeda");
const { nodePathRe, nodePrefixRe, compileChild, rolesOf, missingRequiredChild } = require("./children");
const { fillTemplate } = require("../utils/where");
const { placeFor } = require("./homes");

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

// A node is STRUCTURE: where files live. It says nothing about code roles or
// about who may import it — that is the codeRoles' business. All it keeps is
// its name/parent (the path), its children, and the wording of its
// own "this file does not belong here" finding.
// Every key a node may carry. A node is structure — anything else is a
// declaration the architecture believes it made, so an unknown key is an
// error, not a silent no-op (`kind`, `declares`, `location`, `roles` were
// all node keys once; code roles own those questions now).
const NODE_KEYS = new Set(["slug", "name", "parent", "children", "report", "role"]);

const make = (n) => {
	for (const key of Object.keys(n)) {
		if (NODE_KEYS.has(key)) continue;
		throw new Error(`node ${n.slug}: unknown key \`${key}\` — a node is structure only (${[...NODE_KEYS].join(", ")}); roles, actions and \`where\` live on the codeRole`);
	}
	const parents = Array.isArray(n.parent) ? n.parent : n.parent ? [n.parent] : [null];
	return {
		slug: n.slug,
		name: n.name,
		parent: n.parent,
		parents,
		children: (n.children ?? []).map(compileChild),
		// `role:` on the node itself = the whole folder is that code (its `**`).
		roles: rolesOf(n),
		report: n.report,



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
	// `{ node: slug }` children borrow the referenced node's own name template.
	for (const n of all) {
		for (const child of n.children) {
			if (!child.nodeSlug) continue;
			const target = bySlug[child.nodeSlug];
			if (!target) throw new Error(`node ${n.slug}: child references unknown node ${child.nodeSlug}`);
			const compiled = compileChild(target.name);
			child.re = compiled.re;
			child.captures = compiled.captures;
			child.name = target.name;
			child.folder = compiled.folder;
			// A child that IS that node also holds what that node holds: the roles
			// are the node's roles, or nothing here describes these pieces.
			if (!child.roles?.length) child.roles = target.roles ?? [];
		}
	}
	// A node that declares which kind of code lives in it (`role:` on the node)
	// speaks for every file pattern inside it that declares nothing of its own:
	// `packages-utils` holds `pureFunction`, so `{kebab-case}.ts` there does too. Without this the node said one thing and its children said nothing, and
	// every piece in those files read "nothing declares which kind of code this
	// holds".
	for (const n of all) {
		if (!n.roles?.length) continue;
		for (const c of n.children) {
			if (c.nodeSlug || c.roles?.length) continue;
			c.roles = n.roles;
		}
	}
	for (const n of all) {
		const v0 = n.variants[0];
		n.path = v0.path;
		n.re = v0.re;
		n.prefixRe = v0.re;
		n.prefixNames = v0.names;
		n.literalLen = v0.literalLen;
		n.isFile = v0.isFile;
	}
	// The roles a node's children declare. This is where a codeRole's HOME comes
	// from: the tree says where code lives, so `codeRoles` never repeats a folder
	// list. A folder child with a role means "everything inside is that role";
	// a file child means exactly that file — and a child may name several roles.
	const roleHomes = {};
	const addHome = (role, template, nodeSlug) => {
		const list = (roleHomes[role] ??= []);
		if (!list.some((h) => h.template === template)) list.push({ template, node: nodeSlug });
	};
	// A node that declares `role:` IS that code: its folder (or the file itself).
	for (const n of all) {
		if (!n.roles?.length) continue;
		for (const v of n.variants) for (const role of n.roles) addHome(role, v.isFile ? v.path : `${v.path === "." ? "" : `${v.path}/`}**`, n.slug);
	}
	for (const n of all) {
		for (const child of n.children) {
			if (!child.roles?.length) continue;
			const bases = child.nodeSlug
				? (bySlug[child.nodeSlug]?.variants ?? []).map((v) => ({ path: v.path, node: child.nodeSlug }))
				: n.variants.map((v) => ({ path: v.path === "." ? child.name : `${v.path}/${child.name}`, node: n.slug }));
			for (const base of bases) {
				// A folder child owns everything below it; a file child only itself.
				const template = child.folder ? `${base.path}/**` : base.path;
				for (const role of child.roles) addHome(role, template, base.node);
			}
		}
	}

	// The literal names a parent declares as its own children. A fuzzy child
	// (`{kebab-case}`) may not claim any of them: those folders are children of
	// the parent in their own right, with their own nodes.
	const literalClaims = (parent) => {
		const names = new Map();
		for (const c of parent.children ?? []) {
			if (c.nodeSlug || !c.name || /\{[^}]+\}/.test(c.name)) continue;
			// a file child claims nothing from a folder pattern
			if (!c.folder) continue;
			names.set(c.name, true);
		}
		return [...names.keys()];
	};

	// Every node under a fuzzy root inherits its exclusions, positioned at the
	// placeholder the root introduced — `apps/backend/{kebab-case}/actions`
	// excludes the same folders as `apps/backend/{kebab-case}` does.
	for (const n of all) {
		let cur = n;
		let fuzzyRoot = null;
		const seen = new Set();
		while (cur && !seen.has(cur.slug)) {
			seen.add(cur.slug);
			const parent = cur.parents?.[0] ? bySlug[cur.parents[0]] ?? null : null;
			if (/\{[^}]+\}/.test(cur.name) && parent && !/\{[^}]+\}/.test(parent.name)) {
				fuzzyRoot = cur;
				break;
			}
			cur = parent;
		}
		if (!fuzzyRoot) continue;
		const parent = bySlug[fuzzyRoot.parents[0]];
		const values = literalClaims(parent);
		if (!values.length) continue;
		const index = fuzzyRoot.name.split("/").findIndex((seg) => /^\{[^}]+\}$/.test(seg));
		if (index < 0) continue;
		const claims = values.map((value) => ({ index, value }));
		for (const n2 of all) {
			const shares = n2.variants.some((v) => v.path === fuzzyRoot.path || v.path.startsWith(`${fuzzyRoot.path}/`));
			if (!shares) continue;
			for (const v of n2.variants) {
				if (!v.names[index]) continue;
				v.claims = [...(v.claims ?? []), ...claims];
			}
		}
	}

	const roots = all.filter((n) => !n.parents[0]);
	return { all, bySlug, roots, roleHomes };
};

const matchNode = (node, relPath) => {
	for (const v of node.variants) {
		const m = v.re.exec(relPath);
		if (!m) continue;
		// A placeholder must not swallow a folder its parent declares BY NAME:
		// `config` is a child of `backend` in its own right, so `backend/{kebab-case}`
		// is not an instance of it. The claim comes from the parent's own children,
		// so nothing has to be listed twice and no feature is named anywhere.
		const claim = v.claims?.find((c) => (v.names[c.index] != null) && m[c.index + 1] === c.value);
		if (claim) continue;
		// Folder node: regex is `^prefix/([^/]+)(?:/(.*))?$`, so the first
		// segment after the prefix is capture (names.length + 1). File node:
		// regex is `^prefix$` with no segment capture — the basename is the
		// entry. `m[0]` is the full match, never a segment.
		const seg = v.isFile ? relPath.split("/").pop() : m[v.names.length + 1];
		return { node: { ...node, path: v.path, prefixRe: v.re, prefixNames: v.names, literalLen: v.literalLen, isFile: v.isFile }, seg, caps: Object.fromEntries(v.names.map((nm, i) => [nm, m[i + 1]])) };
	}
	return null;
};

// A node that declares `required` children is not just a name pattern: a folder
// becomes an instance of it only when it actually holds them. `apps/backend/utils`
// matches `{kebab-case}` but has no `store.ts` and no `actions/`, so it is NOT a
// feature — and every answer that depends on "which folder is this" (role homes,
// destinations) must see that. Answered from the filesystem, so no caller has to
// thread a file list through.
const instanceCache = new WeakMap();
const isRealInstance = (node, folder, arch) => {
	const required = (node.children ?? []).filter((c) => c.required);
	if (!required.length) return true;
	const root = arch?.repoRoot;
	if (!root || !folder) return true;
	let byFolder = instanceCache.get(arch);
	if (!byFolder) {
		byFolder = new Map();
		instanceCache.set(arch, byFolder);
	}
	const key = `${node.slug}::${folder}`;
	if (byFolder.has(key)) return byFolder.get(key);
	// The folder is an instance when EVERY required child is present: `store.ts`
	// as a file, `actions` as a folder. Walked as declared, so a rule with two
	// required children needs both.
	const present = (child) => {
		try {
			const abs = path.join(root, folder, child.folder ? child.name : child.name);
			const st = fs.statSync(abs);
			return child.folder ? st.isDirectory() : st.isFile();
		} catch {
			return false;
		}
	};
	const ok = required.every(present);
	byFolder.set(key, ok);
	return ok;
};

// A node INSIDE a shape only exists if the shape does. `apps/backend/commands` is
// declared by name in `backend`, and a `{kebab-case}` sibling matched it too — so
// `commands/store.ts` was read as a FEATURE's store (`apps/backend/{kebab-case}/store.ts`)
// while the feature itself is not an instance there (it has no `actions/`). Every
// ancestor that declares required children has to be a real instance at the
// folder this path puts it in.
const ancestorsAreReal = (node, relPath, arch) => {
	const segs = String(relPath).split("/");
	const seen = new Set();
	const walk = (n) => {
		for (const slug of n.parents ?? []) {
			const parent = arch.nodes?.bySlug?.[slug];
			if (!parent || seen.has(slug)) continue;
			seen.add(slug);
			const variant = parent.variants.find((v) => v.re.test(relPath));
			if (variant && (parent.children ?? []).some((c) => c.required)) {
				const folder = segs.slice(0, variant.path.split("/").length).join("/");
				if (!isRealInstance(parent, folder, arch)) return false;
			}
			if (!walk(parent)) return false;
		}
		return true;
	};

	return walk(node);
};

const allMatches = (relPath, arch) =>
	pipe(
		arch.nodes.all,
		filter((n) => n.variants.some((v) => v.re.test(relPath))),
		filter((n) => ancestorsAreReal(n, relPath, arch)),
		map((n) => matchNode(n, relPath)),
		filter(Boolean),
		sort((a, b) => a.node.literalLen - b.node.literalLen || a.node.path.length - b.node.path.length),
	);



// Is `folder` a real instance of the node `slug`? A home template can be
// filled for ANY file (`apps/backend/{kebab-case}/actions` + `commands/toggle.ts`
// → `apps/backend/commands/actions`), yet that folder may be one the tree does
// not declare — `commands` is not a feature, so it has no `actions/`. Naming
// such a path would be advice about a folder that must not exist.
// The node whose declared place this FOLDER is — the deepest one, so a feature's
// `actions/` is `actions` and not the feature that contains it. Asked about the
// folder itself; no invented file name stands in for it.
const folderOwner = (arch, folder) => {
	if (!folder) return null;
	const hits = arch.nodes.all
		.filter((n) => n.variants.some((v) => nodePathRe(v.path).test(folder)))
		.sort((a, b) => a.literalLen - b.literalLen || a.path.length - b.path.length);

	return hits.length ? hits[hits.length - 1] : null;
};

const instanceAt = (arch, slug, folder) => {
	if (!folder) return false;
	const owner = folderOwner(arch, folder);
	if (owner?.slug !== slug) return false;

	return isRealInstance(owner, folder, arch);
};

const deepestMatch = (relPath, arch) => {
	const r = allMatches(relPath, arch);
	return r.length ? r[r.length - 1] : null;
};

// The segment index each placeholder sits at in the architecture's globs.
// A placeholder used at one fixed index across all globs is positional:
// `apps/backend/{kebab-case}/store.ts` and
// `apps/backend/{kebab-case}/**/*.ts` both put `kebab-case` at index 2.
// A placeholder used at different indices is not positional and is left to
// node captures.
const placeholderPositions = (arch) => {
	const pos = {};
	const globs = [];
	for (const role of Object.values(arch.codeRoles ?? {})) {
		// A role's home may be spelled as a glob; its placeholders are as
		// positional as the ones in a node name.
		for (const entry of [...(role.where ?? []), ...Object.values(role.actions ?? {}).flatMap((a) => a.where ?? [])]) {
			if (entry.type === "glob") globs.push(entry.glob);
		}
	}
	for (const glob of globs) {
		glob.split("/").forEach((seg, i) => {
			const m = seg.match(/^\{([\w-]+)\}$/);
			if (!m) return;
			if (pos[m[1]] == null) pos[m[1]] = i;
			else if (pos[m[1]] !== i) pos[m[1]] = -1; // not positional
		});
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

const checkEntry = (match, child, out, findingFrom, arch, facts, repoFiles) => {
	// Findings never tell the reader to change the architecture: the repair is in
	// the code. `cfg` is only kept for messages that NAME where a rule comes from,
	// never for "edit this file".
	const vars = { path: match.rel, basename: match.seg, ...match.caps };
	if (child && child.forbidden) {
		out.push(findingFrom({ key: "forbidden", report: child.report }, "nodes", match.node.slug, `nodes:${match.node.slug}:forbidden`, vars));
		return;
	}
	// WHAT IS NOT DECLARED IS FORBIDDEN — always, for every node: the children list
	// is the permission, and a folder that lists no children allows nothing inside
	// it. There is no flag to turn the rule off, because a node without it is not
	// a looser node, it is an undeclared one.
	if (!child) {
		// The node's own FILE (`apps/backend/{kebab-case}/controller.ts` declared as
		// a node of its own) is declared by itself — the file IS the declaration.
		if ((match.node.variants ?? []).some((v) => v.isFile)) return;
		// A folder that is not even an instance of this node (it has none of the
		// node's declared children) is reported ONCE by the structure rule, with
		// the destination the code actually has. Repeating it per file here would
		// bury that answer under a list of "not allowed child".
		// Only a node that declares REQUIRED children can be "not an instance yet" —
		// then the folder-level message covers the whole folder and repeating it per
		// file would bury it. A node with no required children (`actions/`) is a
		// plain closed list: an undeclared entry inside it IS the finding, and
		// suppressing it here made `actions/controller/index.ts` silently legal while
		// the node declares `{kebab-case}.ts` and nothing else.
		const hasRequired = (match.node.children ?? []).some((c) => c.required);
		if (repoFiles && hasRequired && match.node.required !== true && missingRequiredChild(match.node, arch, match.rel, repoFiles, fillTemplate)) return;
		// The default message names the offending entry AND everything the node
		// does allow, so a reader sees both halves of the rule. Without it the
		// finding falls back to the useless "architecture violation".
		const allowed = (match.node.children ?? []).map((c) => (c.folder ? `${c.name}/` : c.name));
		// What the folder is FOR, in the reader's words: "a feature holds: …".
		const seen = allowed.length ? ` A \`${match.node.slug}\` folder holds: ${allowed.map((n) => `\`${n}\``).join(", ")}.` : "";
		// The destinations the architecture itself implies for what the file
		// CONTAINS: each role present here names its own home. That turns "not
		// allowed here" into "belongs there", which is what a reader can act on.
		const spots = [];
		const ownDir = String(match.rel ?? "").split("/").slice(0, -1).join("/");
		// A role whose home IS this folder means the file is in the right place and
		// only its NAME is wrong — a different finding, with a different fix.
		const homeHere = [];
		for (const role of facts?.roles ?? []) {
			const def = arch?.codeRoles?.[role];
			if (!def) continue;
			// The place this role's code belongs — asked of the ONE implementation in
			// homes.js, exactly as the role-home finding asks it. A role whose home
			// the tree cannot host for this file still names its declared home
			// (`apps/backend/constants.ts`), so "no declared home" is only said about
			// a role that really declares none.
			const place = placeFor(arch, role, match.rel);
			if (!place) continue;
			if (place.path === ownDir || place.path === match.rel) homeHere.push(role);
			else spots.push({ role, path: place.path, folder: place.folder, file: place.folder ? null : place.path });
		}
		// A role with no declared home may live anywhere the tree allows, so the
		// FILE is never the problem — the folder is. Say which one, and what the
		// tree is missing, instead of offering a choice.
		const roles = facts?.roles ?? [];
		const folder = String(match.rel ?? "").split("/").slice(0, -1).join("/");
		// The folder branch applies ONLY when the folder is not a declared node:
		// then the tree is what is missing. When it IS declared (this folder, or
		// one of several parents), the file is the odd one out and must be named.
		const declared = folderOwner(arch, folder);
		const parent = declared ? null : match.node.parents?.[0] ? arch.nodes?.bySlug?.[match.node.parents[0]] : null;
		// A misplaced file may hold something the architecture says belongs to ONE
		// specific file of this folder. Then "not an allowed child" understates it:
		// this file is a SECOND copy of that one, and the fix is to merge, not to
		// move it somewhere else. The test is pure structure — no role name, no
		// framework: a role present here whose home RESOLVES TO THAT FILE.
		const homeFiles = new Map(
			spots
				.filter((sp) => !sp.folder && sp.file === sp.path)
				.map((sp) => [sp.role, sp.path]),
		);
		const mergeInto = [...homeFiles.entries()];
		const held = [...new Set(spots.map((sp) => sp.role))];
		const heldAll = [...new Set(roles)];
		// ONE destination for the whole finding. A file may hold several roles and
		// therefore several candidate homes; naming two of them ("belongs in
		// packages/utils, and duplicates controller.ts") is advice the reader
		// cannot follow. The order is: a place the code can MOVE to, then a copy it
		// can MERGE into, then a rename in place.
		const dest = spots[0]?.path ?? null;
		const mergeTarget = mergeInto[0]?.[1] ?? null;
		const named = (match.node.children ?? []).find((c) => !c.folder)?.name ?? "the declared pattern";
		// The DIAGNOSIS is this folder's own contract; the DEMAND it makes is one of
		// the four kinds in report/asks.js (`move` / `remove` / `role` / `add`), and
		// its fix is phrased like every other finding of that kind.
		// One sentence for "this entry is not declared here", whatever the entry is:
		// a wrong file name, a directory, a stray `.tsx`. Nothing is said about the
		// KIND of the entry beyond that — the node's own list is the whole rule, and
		// a special sentence per kind ("is a subfolder … no subfolder exists in it")
		// was a hardcode that said nothing the list does not already say.
		// What DOES differ is the repair: a directory cannot be moved to
		// `packages/utils`, its contents have to land in the files this folder
		// declares. That difference is structural (`isFile`), not a new message.
		const asDir = match.isFile === false;
		let message = `\`{basename}\` is not an entry this folder declares.${seen}`;
		let fix = null;
		let ask = "role";
		if (asDir) {
			// A directory holds code; the code has a home, the directory does not.
			const into = dest ? `into \`${dest}\`` : `into the files this folder declares (${named})`;
			message += held.length ? ` What it holds is \`${held[0]}\` code.` : "";
			fix = `Move what \`{basename}/\` holds ${into}, then delete the directory.`;
			ask = "move";
		} else if (dest) {
			// The same sentence every other "belongs elsewhere" uses (report/asks.js):
			// what belongs where, then why. The folder's own contract is the why.
			message = `\`{basename}\` belongs in \`${dest}\`.${seen} It holds a \`${held[0]}\`.`;
			fix = `Move \`{basename}\` to \`${dest}\`.`;
			ask = "move";
		} else if (mergeTarget) {
			message += ` It duplicates \`${mergeTarget.split("/").pop()}\` — one file per folder, and this is a second copy.`;
			fix = `Merge \`{basename}\` into \`${mergeTarget}\` and delete \`{basename}\`.`;
			ask = "remove";
		} else if (homeHere.length) {
			message += ` The folder is right, the name is not: this folder may hold \`${named}\`.`;
			fix = `Rename \`{basename}\` to \`${named}\`.`;
			ask = "move";
		} else if (heldAll.length) {
			message += ` It holds a \`${heldAll[0]}\`, and that role has no declared home — the architecture names no destination for this file.`;
		} else {
			// Nothing this folder declares a home for: the file itself is what has to
			// go, and what it holds has to land in the files that ARE declared here.
			message += " Nothing in it belongs to a role this folder holds.";
			fix = `Move what \`{basename}\` holds into the files this folder declares (${named}), then delete \`{basename}\`.`;
			ask = "move";
		}
		out.push(
			findingFrom(
				{
					key: "closed",
					// A fix only when the destination is certain — the code here has a role
					// whose home is a path. Otherwise the honest answer is the one in the
					// message: this is not a place for that file.
					report: match.node.report ?? { ask, message, fix },
				},
				"nodes",
				match.node.slug,
				`nodes:${match.node.slug}:closed`,
				vars,
			),
		);
	}
};

const checkTree = (relPath, arch, out, finding, facts, repoFiles) => {
	const match = deepestMatch(relPath, arch);
	if (!match) return;
	if (match.isFile) {
		checkEntry({ node: match.node, seg: match.seg, isFile: true, caps: match.caps, rel: relPath }, findChild(match.node.children, match.seg, true), out, finding, arch, facts, repoFiles);
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
		checkEntry({ node, seg: parts[idx], isFile: last, caps: match.caps, rel: relPath }, child, out, finding, arch, facts, repoFiles);
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

module.exports = { buildTree, checkTree, matchers, matchNode, deepestMatch, folderOwner, instanceAt, targetCapsFor, ancestorsAreReal };

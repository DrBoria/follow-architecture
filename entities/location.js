"use strict";

// WHERE a piece of code is, and WHERE a rule points — one vocabulary, one
// implementation, used by both sides:
//
//   • `matchesLocation(value, entry, { arch }, asFilter)` — the `location:`
//     FILTER: "is this candidate / file / edge at that place?" (`"glob"`,
//     `{ node }`, `{ role }`, or a query over the location itself:
//     `{ piece: { isNull: true } }`).
//   • `resolveLocation(arch, location, rel)` — the `fix.location` of a REPAIR:
//     the place AND the box it is, for this file, asked of the tree.
//
// They share the entries on purpose. "This belongs where a `storeModel` lives"
// and "is this inside a `storeModel`" describe the same place with the same
// words, so the sentence and the picture cannot mean different things.

const { compilePattern } = require("../utils/pattern");

// The tree is asked LAZILY: `nodes/homes` and `entities/tree` reach back into the
// query engine, so a top-level require here would be a cycle — and a cycle is how
// `matches` becomes `undefined` and every rule silently stops firing.
// `entities/queries` requires THIS module, so the matcher is taken lazily.
const queryMatcher = () => require("./queries").matches;

const tree = () => {
	const { folderOwner } = require("./tree");
	// `homes.js` now lives HERE (below), so the tree helper only has to hand out
	// the tree primitive; the role→place answers are local functions.
	return { folderOwner };
};

// ── ONE PATH, DESCRIBED AS A LIST OF ITS PARTS ───────────────────────────────
// The place of a file is `path`, the `segments` it is cut into, its `exts`, its
// `fileName` and its `words`; the folder's files are places too, so a rule
// navigates into them and compares fields.
//
// Nothing derivable from a list is stored twice: the folder is
// `segments.at(-2)`, the depth is `segments.length`, the name is
// `segments.at(-1)`, the last extension is `exts.at(-1)`, the position is
// counted where it is needed. A copied field is a second truth that drifts.
const wordsIn = (name) =>
	String(name ?? "")
		// camelCase and ALLCAPS runs: `fileName` → file name, `HTMLParser` → HTML Parser
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(/[^A-Za-z0-9]+/)
		.map((w) => w.toLowerCase())
		.filter(Boolean);

// The name without ANY extension: `x.spec.ts` → `x`. A leading dot is part of
// the name (`.env` has no extension, it IS a name).
const nameOnly = (name) => {
	const n = String(name ?? "");
	const dot = n.indexOf(".", n.startsWith(".") ? 1 : 0);

	return dot > 0 ? n.slice(0, dot) : n;
};
// ONE PATH → its segments. Everything below is a view over this list, so the
// engine never splits a path a second way.
const segmentsOf = (rel) => String(rel ?? "").split("/").filter(Boolean);
// The PARENT of any path: one segment up. The root has none — `""`.
const parentOf = (rel) => segmentsOf(rel).slice(0, -1).join("/");

// ONE PATH → the names it is made of. No folder, no neighbours: `placeOf` adds
// those, so a sibling can describe itself without describing its own siblings
// (which would never end).
const leafOf = (rel) => {
	const path = String(rel ?? "");
	const segments = segmentsOf(path);
	const name = segments[segments.length - 1] ?? "";
	const fileName = nameOnly(name);
	// `x.spec.ts` → [".spec", ".ts"]; `.env` is a name, not an extension, so it
	// has none. The extensions come from the NAME, the path is `segments`.
	const exts = fileName === name ? [] : name.slice(fileName.length).split(".").filter(Boolean).map((e) => `.${e}`);

	return { path, segments, exts, fileName, words: wordsIn(fileName) };
};

// The place of a file: its own names, plus the folder it sits in — the files
// there, and the neighbours among them. Every one of those is a PLACE.
const placeOf = (rel, repoFiles = []) => {
	const leaf = leafOf(rel);
	const dir = parentOf(leaf.path);
	const files = [...new Set((repoFiles ?? []).filter((p) => parentOf(p) === dir))].sort().map(leafOf);

	return { ...leaf, files, siblings: files.filter((f) => f.path !== leaf.path) };
};

// The placeholders a template still has (`{kebab-case}`), for a sentence that
// tells the reader what to fill in. No word is baked in for what the entity IS:
// the same home may be a feature's `actions/`, a config file, a command file.
const placeholdersOf = (template) => [...new Set(String(template ?? "").match(/\{[^}]+\}/g) ?? [])].map((p) => `\`${p}\``).join(", ") || "its placeholders";

// The box that HOLDS a place: `a/b/c.ts` → the node that owns `a/b`; the folder
// `a/b` → the node that owns `a`. ONE answer for "which box is this place in",
// used by the repair, the tree's entry check and the report — it used to be
// inlined in four files, each spelling the folder derivation itself.
const boxOfPlace = (arch, path) => {
	if (!path) return null;
	const { folderOwner } = require("./tree");
	return folderOwner(arch, dirOf(path))?.slug ?? null;
};

// The folder of a path: a file contributes its parent, a folder is itself.
const dirOf = (path) => {
	const p = String(path ?? "");

	return /\.[A-Za-z0-9]+$/.test(p) ? parentOf(p) : p;
};

// The `location:` filter. `value` is a candidate, a file fact, an edge or a bare
// path — they all answer the same question.
//
// `asFilter` is the query-form fallback (a filter over the location itself),
// injected by the query engine so this module does not depend on it.
const matchesLocation = (value, entry, scope = {}, asFilter = null) => {
	const arch = scope?.arch;
	const loc = value !== null && typeof value === "object" && value.location != null ? value.location : value;
	const itemPath = typeof loc === "string" ? loc : loc?.path;
	if (typeof itemPath !== "string") return false;
	// A glob: the plainest statement of a place.
	if (typeof entry === "string") return compilePattern(entry).re.test(itemPath);
	// `{ node: "slug" }` — the path is inside that node.
	if (entry && typeof entry.node === "string") {
		const node = arch?.nodes?.bySlug?.[entry.node];
		if (!node) return false;
		return (node.variants ?? []).some((v) => v.re.test(itemPath));
	}
	// `{ role }` — the path is one of the places that role is declared to live in.
	if (entry && typeof entry.role === "string") {
		return (arch?.nodes?.roleHomes?.[entry.role] ?? []).some((h) => compilePattern(h.template).re.test(itemPath));
	}
	// A query over the location itself: `{ piece: { isNull: true } }`.
	return asFilter ? asFilter(loc, entry) : true;
};

// A location entry of a REPAIR → the place and the box, or null.
//   { role }   the role's home FOR THIS FILE (`placeFor`) — the tree's answer
//   { node }   that node's place for this file
//   "glob"     the path itself; the box is whatever holds its folder
const resolveOne = (arch, entry, rel) => {
	if (!entry) return null;
	// `homeForRole`/`placeFor` are LOCAL now (this module owns them); only the tree
	// primitive is asked of the tree layer.
	const { folderOwner } = tree();
	if (typeof entry === "string") return { path: entry, node: folderOwner(arch, dirOf(entry))?.slug ?? null };
	if (entry.role) {
		const hit = homeForRole(arch, entry.role, rel);
		return hit?.node ? { node: hit.node, path: hit.path } : null;
	}
	if (entry.node) {
		const home = placeFor(arch, entry.node, rel);
		if (home?.path) return { node: folderOwner(arch, home.folder ? home.path : dirOf(home.path))?.slug ?? entry.node, path: home.path };
		const own = arch?.nodes?.bySlug?.[entry.node]?.path;
		return own ? { node: entry.node, path: own } : null;
	}
	return null;
};

// A location may be ONE entry or a list of alternatives ("the feature's store,
// else the root store"): the first the tree can answer for THIS file wins, so a
// rule never points at a folder that does not exist.
const resolveLocation = (arch, location, rel) => {
	const list = Array.isArray(location) ? location : [location];
	for (const entry of list) {
		const hit = resolveOne(arch, entry, rel);
		if (hit?.node) return hit;
	}
	return null;
};



// ── the `where` / place vocabulary, moved here so ONE module owns "where" ──
// THE `where` mechanism — one implementation, used by everything that needs to
// say "here" or "by this code":
//
//   node children `role:`             — where code of that role may live
//   codeRole.actions.<name>.where     — where/by whom THAT action may be done
//                                       (import, export, call, mutate, read,
//                                       export, or any custom name mapped to a
//                                       fact class with `of:`)
//   invariant.where / invariant.except — which files the rule applies to
//
// The same entry syntax means the same thing in all three places: a `where`
// in an invariant can name roles and use filters exactly like one in an
// action, because it is literally the same matcher.
//
// An entry is one of:
//
//   { role: "action" }          code that IS that role (its file declares it)
//   { role: "action", same: true }  …and in the SAME node instance as the target
//   { node: "backend-test" }    any file under that declared node
//   { template: "apps/{app}/actions/**" }  a path built from the tree (role homes)
//   "apps/backend/**/*.ts"      a path pattern (the tree already owns paths —
//                               prefer `{ node }`)
//   { <filter> }                any filter over the file's facts
//
// A bare string that names a declared codeRole is read as a role reference, so
// `where: [storeModel]` and `where: [{ role: storeModel }]` mean the same.


const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Normalize one entry. `roles` (a Set of declared slugs) lets a bare string
// that names a role become a role reference; without it every string is a glob.
const parseWhereEntry = (entry, roles = null) => {
	if (typeof entry === "string") {
		if (roles?.has(entry) && !entry.includes("/") && !entry.includes("*")) return { type: "role", role: entry, same: false };
		return { type: "glob", glob: entry };
	}
	// `via: import` — this actor reaches the target by importing it (a controller
	// holds the root store), not through the object tree. It says nothing about
	// WHO may do it; it only stops the picture from claiming the tree chains.
	if (entry.role != null) return { type: "role", role: String(entry.role), same: Boolean(entry.same), via: entry.via === "import" ? "import" : null };
	if (entry.node != null) return { type: "node", node: String(entry.node) };
	// A template comes from the NODE tree (a child's `role:`), so it carries the
	// node's `{placeholders}` and resolves them against the file being checked.
	if (entry.template != null) return { type: "template", template: String(entry.template) };
	return { type: "query", query: entry };
};

const parseWhere = (value, roles = null) => toList(value).map((e) => parseWhereEntry(e, roles));

// Does this entry designate `rel` for a file with these facts?
//   targetCaps — placeholder captures of the TARGET path; an entry using the
//   same placeholder must agree with it (`{kebab-case}` = the same feature).
const matchesWhere = (entry, rel, arch, facts, targetCaps) => {
	if (!entry) return false;
	const pattern = entry.type === "glob" ? entry.glob : entry.type === "template" ? entry.template : null;
	if (pattern) {
		const { re, names } = compilePattern(pattern);
		const m = re.exec(rel);
		if (!m) return false;
		if (targetCaps) {
			for (let i = 0; i < names.length; i += 1) {
				if (names[i] in targetCaps && m[i + 1] !== targetCaps[names[i]]) return false;
			}
		}
		return true;
	}
	if (entry.type === "role") {
		if (!(facts?.roles ?? []).includes(entry.role)) return false;
		if (!entry.same) return true;
		// `same: true` — the source must be an instance of the SAME node
		// template as the target, with every shared placeholder equal.
		const { deepestMatch, matchNode } = require("../entities/tree");
		const sourceCaps = matchNode(deepestMatch(rel, arch)?.node, rel)?.caps ?? {};
		for (const [name, value] of Object.entries(targetCaps ?? {})) {
			if (!(name in sourceCaps) || sourceCaps[name] !== value) return false;
		}
		return true;
	}
	if (entry.type === "node") {
		const node = arch?.nodes?.bySlug?.[entry.node];
		if (!node) return false;
		return node.variants.some((v) => v.re.test(rel));
	}
	// The scope IS the facts (plus the file and the tree), so a `$ref` in a rule can
	// compare one fact with another — `$location.fileName` against `location.files`.
	return queryMatcher()(facts, entry.query, { ...(facts ?? {}), arch, fileRel: rel });
};

// `true` when NO entry allows it. A boolean, not a reason: a reason with a fixed
// prefix ("allowed from: …") is a sentence nobody asked for — a finding builds
// its own text from `labelOf`.
const checkWhere = (entries, rel, arch, facts, targetCaps) => {
	for (const entry of entries ?? []) if (matchesWhere(entry, rel, arch, facts, targetCaps)) return false;

	return true;
};

// How code is reached through a declared accessor without an import:
// `{ scope: function, segments: [getRoot] }` → `getRoot(…)`.
const accessorLabel = (e) => (e?.scope === "function" || e?.scope === "method" ? `${e.segments.join(".")}(…)` : (e?.segments ?? []).join("."));

// How one `where` entry reads inside a sentence — the ONE place that knows the
// entry vocabulary (`role` / `node` / `glob` / `template` / filter).
const labelOf = (entry) => {
	if (!entry) return "—";
	// Both spellings of an entry are read here: the NORMALISED one the engine
	// carries (`type: "role"`) and the raw YAML one (`{ role }`). Two wordings —
	// one in the engine, one in the report — is how the same rule got described
	// differently in two places.
	const kind = entry.type ?? (entry.role ? "role" : entry.node ? "node" : entry.glob ? "glob" : entry.template ? "template" : null);
	if (kind === "role") return `role ${entry.role}${entry.same ? " (same instance)" : ""}`;
	if (kind === "node") return `node ${entry.node}`;
	if (kind === "glob") return entry.glob;
	if (kind === "template") return entry.template;

	return "filter";
};

// A declared template resolved to a concrete path. ONE implementation, used by
// every caller that needs "where does this template point for THIS file":
//   • `{placeholder}` segments take the file's own segment at the same index;
//   • `caps` (a capture map) wins when a placeholder sits somewhere else —
//     `{kebab-case}` declared at index 2 for a path that carries it at index 1;
//   • a trailing `**` disappears, a fixed tail (`{kebab-case}.ts`) and a glob
//     segment (`*.d.ts`) keep the file's own name.
const fillTemplate = (template, rel = null, caps = null) => {
	if (template == null) return null;
	const segs = String(template).split("/");
	const relSegs = String(rel ?? "").split("/").filter(Boolean);
	// The placeholder a whole segment names (`{kebab-case}` → `kebab-case`).
	const placeholderName = (seg) => /^\{([^}]+)\}$/.exec(seg)?.[1] ?? null;
	const out = [];
	for (let i = 0; i < segs.length; i += 1) {
		const seg = segs[i];
		if (seg === "**") break;
		const whole = placeholderName(seg);
		if (whole != null) {
			out.push(caps?.[whole] ?? relSegs[i] ?? seg);
			continue;
		}
		// A segment that is a placeholder PLUS a fixed tail (`{kebab-case}.ts`)
		// keeps the file's own name: the file moves, its name does not.
		const tail = /\{[^}]+\}([^{]*)$/.exec(seg)?.[1];
		if (tail != null) {
			const own = relSegs[relSegs.length - 1];
			out.push(own && own !== seg && own.endsWith(tail) ? own : seg);
			continue;
		}
		// A glob segment (`*.d.ts`) names a FAMILY of files; the destination is
		// this file's own name in that family.
		if (seg.includes("*")) {
			const own = relSegs[relSegs.length - 1];
			const suffix = seg.slice(seg.indexOf("*") + 1);
			const stem = own ? own.replace(/\.[^.]*$/, "") : null;
			out.push(stem ? `${stem}${suffix}` : seg);
			continue;
		}
		out.push(seg);
	}

	return out.join("/") || dirOf(rel);
};

// The concrete PLACE an entry designates for this file — the same `where`
// grammar, resolved to one string by the one filler. A `{ node }` entry gives
// that node's instance folder, a template or glob gives the path it names, and a
// filter names no place at all and falls back to the file's own directory. This
// is what "one finding per ..." groups by: the entry says WHICH place, the engine
// only counts.
const entryKey = (entry, rel, arch, facts) => {
	if (!matchesWhere(entry, rel, arch, facts ?? {}, null)) return null;
	const fileDir = dirOf(rel);
	const template = entry?.type === "node" ? arch?.nodes?.bySlug?.[entry.node]?.path : entry?.template ?? entry?.glob;
	const filled = fillTemplate(template, rel);
	if (filled == null) return fileDir;
	// A template that names a FAMILY (`…/actions/*.ts`) designates the folder the
	// family lives in, so one report covers all of its members.
	const star = String(template).split("/").findIndex((s) => s.includes("*"));
	if (star === -1) return filled;

	return filled.split("/").slice(0, star).join("/") || fileDir;
};



module.exports = {
	// the `location:` FILTER and a repair's `fix.location`, one vocabulary
	matchesLocation,
	resolveLocation,
	// the `where` grammar: entries, matching, labels, templates
	toList,
	parseWhere,
	parseWhereEntry,
	matchesWhere,
	checkWhere,
	labelOf,
	accessorLabel,
	entryKey,
	fillTemplate,
};

// ─────────────────────────────────────────────────────────────────────────────
// THE ROLE → PLACE ANSWER — moved here from `nodes/homes.js`, because "where
// does code of this role live" is the SAME question as "what does this place
// entry resolve to". Two modules meant two answers: one for `fix.location`, one
// for the role-home check, and they drifted.
//
//   homesOf(arch, role)            — the path templates that role may occupy
//   placeFor(arch, role, rel)      — where this role's code belongs FOR THIS FILE
//   destinationOf(arch, role, rel) — the concrete, hostable place, or null
//
// Nothing here is stored on the codeRole: a role knows what code IS, never
// which folder it is in. Anything that needs a location asks the tree.


// WHERE code of a role lives — a property of the TREE.
//
// A node is a folder; its children say which `role:` lives in them. This module
// turns that declaration into the two things the rest of the engine needs:
//
//   homesOf(arch, role)            — the path templates that role may occupy
//   placeFor(arch, role, rel)      — where this role's code belongs FOR THIS FILE
//   destinationOf(arch, role, rel) — the concrete, hostable place, or null
//
// Nothing here is stored on the codeRole: a role knows what code IS, never
// which folder it is in. Anything that needs a location asks the tree.



// Every path the tree gives this role, in the order the config declares them —
// the tree's order, so a list of allowed places reads the same way the
// architecture does.
const homesOf = (arch, role) => (arch?.nodes?.roleHomes?.[role] ?? []).map((h) => ({ type: "template", template: h.template, node: h.node }));

// How much of the template's start this file shares. Used only to pick which
// branch of a repeating node the file belongs to — never to allow or deny.
const sharedPrefix = (template, rel) => {
	const ts = String(template).split("/");
	const rs = String(rel ?? "").split("/");
	let n = 0;
	for (let i = 0; i < ts.length; i += 1) {
		const seg = ts[i];
		if (seg === "**" || /^\{[^}]+\}$/.test(seg)) {
			n += 1;
			continue;
		}
		if (seg !== rs[i]) break;
		n += 1;
	}
	return n;
};

// The directory a home names: a file child contributes its parent folder (the
// file's own name is the last segment), a folder child its own path.
const homeDir = (template) => {
	const segs = String(template).split("/").filter((s) => s !== "**");
	return /\.[A-Za-z0-9]+$/.test(segs[segs.length - 1] ?? "") ? segs.slice(0, -1) : segs;
};

// The folder OF A FILE as segments (the branch test compares pieces, not a
// string): `dirOf` already answered which part is the folder.
const fileDir = (rel) => dirOf(rel).split("/").filter(Boolean);

// Is the file in the SAME BRANCH as this home? One directory is a prefix of the
// other — the file sits in the home's folder, or in a subfolder of it, or the
// home is a subfolder of the file's folder (a store that belongs in the
// `actions/` next to it). `{kebab-case}` matches any single segment, so a
// feature's own instance always answers for its own files.
const isPlaceholder = (seg) => /^\{[^}]+\}$/.test(seg);
const sameBranch = (home, dir) => {
	const [short, long] = home.length <= dir.length ? [home, dir] : [dir, home];
	// The placeholder may sit on EITHER side: `{kebab-case}/actions` against
	// `alpha` puts it in the longer array, and comparing only the shorter one made
	// the home invisible for exactly the folders it was written for.
	return short.every((seg, i) => isPlaceholder(seg) || isPlaceholder(long[i]) || seg === long[i]);
};

// The concrete places a role's code may go FOR THIS FILE, best first.
//
// Only a home in the file's own branch answers — `src/alpha/actions/**` says
// nothing about a file in `src/beta` — so those come first, closest first; the
// rest follow in the order the architecture declares them. A caller that needs
// ONE answer takes the first; a caller that must fall back (the nearest home is
// a folder that does not exist here) walks the list.
const destinationsIn = (arch, role, rel) => {
	const entries = homesOf(arch, role);
	if (!entries.length) return [];
	// A role with ONE declared place has no branch question to answer: its code
	// belongs there wherever in the repo it was written (`constants` → the
	// module's `constants.ts`). Only a role with several homes needs the file's
	// own branch to pick between them.
	if (entries.length === 1 && !/\*\*\s*$/.test(entries[0].template)) {
		return [{ slug: entries[0].node ?? null, path: fillTemplate(entries[0].template, rel), folder: false, template: entries[0].template }];
	}
	const dir = fileDir(rel);
	const scored = entries
		.map((entry, i) => {
			const home = homeDir(entry.template);
			const last = String(entry.template).split("/").filter((seg) => seg !== "**").pop() ?? "";
			// A home that names ONE FILE (`config/api.ts`, `{kebab-case}/type.ts`) is a
			// slot in ONE folder: it answers for files of exactly that folder and
			// nowhere else. A home that names a FOLDER (`packages/types`, `…/actions`)
			// answers for that folder and everything under it.
			const fileHome = /\.[A-Za-z0-9]+$/.test(last);
			// A FILE home outside the file's own folder answers for nothing; a FOLDER
			// home in another branch still answers — it is a general home
			// (`packages/utils`), just not the closest one. Dropping those left
			// "belongs nowhere" instead of "belongs in `packages/utils`".
			const branch = fileHome ? home.length === dir.length && sameBranch(home, dir) : sameBranch(home, dir);
			const fallback = !fileHome;
			return { entry, i, keep: branch || fallback, branch, score: sharedPrefix(entry.template, rel) };
		})
		.filter(({ keep }) => keep);
	scored.sort((a, b) => (b.branch - a.branch) || (b.score - a.score) || (a.i - b.i));
	// A home ending in `**` names a FOLDER (everything inside is the role); any
	// other home names one concrete file.
	return scored.map(({ entry }) => ({ slug: entry.node ?? null, path: fillTemplate(entry.template, rel), folder: /\*\*\s*$/.test(entry.template), template: entry.template }));
};

// The place a role's code belongs FOR THIS FILE, and only when that place can
// exist: the FOLDER has to be a real node instance (that is what keeps
// `commands/actions` out of the advice), while a home that names a FILE
// (`…/type.ts`) may still be created — its parent being an instance is enough.
// Candidates are tried in order, so a file outside every feature folder falls
// back to the next declared home instead of getting "no destination".
const destinationOf = (arch, role, rel) => {
	const { folderOwner, ancestorsAreReal } = require("../entities/tree");
	for (const dest of destinationsIn(arch, role, rel)) {
		if (!dest?.slug || !dest.path) continue;
		// The home's SHAPE has to exist at that path: `apps/backend/config/actions`
		// matches a feature's `{kebab-case}/actions`, but `config` is not a feature
		// (no `store.ts`, no `actions/`), so naming it would be advice about a
		// folder that must never exist. The template form of that home is offered
		// instead (`placeFor` falls back to it).
		const destNode = arch.nodes?.bySlug?.[dest.slug];
		if (destNode && !ancestorsAreReal(destNode, dest.path, arch)) continue;
		const folder = dest.folder ? dest.path : dirOf(dest.path);
		const hit = folderOwner(arch, folder);
		if (!hit) continue;
		// The folder has to be a REAL instance of what claims it: `apps/backend/utils`
		// matches the `{kebab-case}` feature pattern, but a feature has required
		// children it does not have — so it cannot host a feature's `type.ts`, and
		// the shared package answers instead.
		const { instanceAt } = require("../entities/tree");
		if (!instanceAt(arch, hit.slug, folder)) continue;
		const parent = arch.nodes?.bySlug?.[dest.slug]?.parents?.[0] ?? null;
		if (hit.slug === dest.slug || (parent != null && hit.slug === parent)) return dest;
	}
	return null;
};

// WHERE a role's code belongs FOR THIS FILE — the ONE answer every caller uses:
//   • a CONCRETE path — a place the tree can host today (`apps/backend/document/type.ts`);
//   • or, when the role declares exactly ONE place, that place as it is spelled
//     (`apps/backend/constants.ts`): there is nothing to choose between;
//   • null when the role declares several places and none of them is hostable
//     here — then no destination is named, rather than one of them guessed.
// The role-home finding, the "not a file this folder declares" message and the
// folder-level finding must name the SAME place, so they ask HERE. Three
// separate derivations is how one file got "belongs in `…/constants.ts`" and
// "that role has no declared home" in the same run.
const placeFor = (arch, role, rel) => {
	const dest = destinationOf(arch, role, rel);
	if (dest?.path) return { path: dest.path, concrete: true, folder: Boolean(dest.folder) };
	const homes = homesOf(arch, role).map((h) => h.template);
	// A role with SEVERAL homes and none of them hostable here has no answer for
	// this file: picking one of them ("`packages/types`", "`apps/backend/index.ts`")
	// would be a guess dressed as advice. Only a role whose ONE declared place is
	// the answer gets that place named.
	if (homes.length !== 1) {
		// No place the tree can host HERE — but the role still declares a home, and
		// naming it AS SPELLED is the answer: `apps/backend/{kebab-case}/actions/{kebab-case}.ts`
		// is "an action belongs in a feature's `actions/`", and the placeholders are
		// the reader's to fill. The FILLED form is what invented `apps/backend/config/actions`.
		const nearest = destinationsIn(arch, role, rel)[0];
		if (!nearest?.template) return null;
		const last = nearest.template.split("/").filter((seg) => seg !== "**").pop() ?? "";

		// `…/actions/**` is the FOLDER `…/actions` — the same spelled form the
		// single-home branch uses, so both read the same way.
		const folder = /\*\*\s*$/.test(nearest.template) || !/\.[A-Za-z0-9]+$/.test(last);

		return { path: nearest.template.replace(/\/\*\*$/, ""), concrete: false, folder };
	}
	const only = homes[0];
	if (!/[*{]/.test(only)) return { path: only, concrete: true, folder: false };

	return { path: only.replace(/\/\*\*$/, ""), concrete: false, folder: true };
};

// Does this file sit inside one of the role's homes?
//
// Asked THROUGH the tree, not through the raw template: a role's home is the
// NODE that declares it, so a file is in that home when the node that owns the
// file is that node or a descendant of it. That way every exclusion the tree
// already makes — a folder its parent declares by name is not an instance of a
// `{kebab-case}` sibling — applies to role homes too. `apps/backend/config/store.ts`
// is owned by `backend-config`, so it is NOT in `{kebab-case}/store.ts`.
const roleFitsAt = (arch, role, rel) => {
	if (!rel) return false;
	// Asked per DECLARED PATH, not per folder: a node can give a role one exact
	// file (`config/api.ts`) and a folder role can cover everything under it, so
	// "the folder contains a home for this role" is not the question — this FILE
	// either is one of those paths or it is not. Node-level matching made every
	// sibling of `api.ts` a `sharedTypes` too.
	return (arch?.nodes?.roleHomes?.[role] ?? []).some((h) => matchesWhere({ type: "template", template: h.template }, rel, arch, null, null));
};

// Roles whose home contains this path — "what may be declared at this path".
// The roles whose declared home covers this path — MOST SPECIFIC FIRST. A file
// in `src/api/` is a `service` before it is the generic `plainUtil` of `src/`,
// and the finding must name the nearer answer: the deepest matching home wins,
// ties keep the order the config declares.
const rolesAtPath = (arch, path) => {
	if (!path) return [];
	return Object.keys(arch?.nodes?.roleHomes ?? {})
		.filter((role) => roleFitsAt(arch, role, path))
		.map((role, i) => ({
			role,
			i,
			// How much of the path this role's home actually names: `src/api/**`
			// shares `src/api` with `src/api/todo.ts` (2), `src/**` only `src` (1).
			depth: Math.max(0, ...homesOf(arch, role).map((h) => sharedPrefix(h.template, path))),
		}))
		.sort((a, b) => b.depth - a.depth || a.i - b.i)
		.map((x) => x.role);
};

// WHERE A ROLE'S CODE BELONGS FOR THIS FILE, as the BOX and the PATH together —
// the tree's own answer, never a template written by a rule.
//
// A rule says "this state belongs in the feature's store" and names the ROLE
// (`storeModel`); which folder that is for THIS file is the tree's business, the
// same question `placeFor` answers for the role-home check. One implementation,
// so a rule can never name a place the tree does not have.
const homeForRole = (arch, role, rel) => {
	const { folderOwner } = require("../entities/tree");
	const place = placeFor(arch, role, rel);
	if (!place?.path) return null;
	const folder = place.folder ? place.path : dirOf(place.path);
	return { role, path: place.path, folder: place.folder, concrete: Boolean(place.concrete), node: folderOwner(arch, folder)?.slug ?? null };
};

module.exports = {
	matchesLocation,
	resolveLocation,
	toList,
	parseWhere,
	parseWhereEntry,
	matchesWhere,
	checkWhere,
	labelOf,
	accessorLabel,
	entryKey,
	fillTemplate,
	homesOf,
	destinationOf,
	placeFor,
	homeForRole,
	roleFitsAt,
	rolesAtPath,
	dirOf,
	parentOf,
	segmentsOf,
	leafOf,
	boxOfPlace,
	placeholdersOf,
	placeOf,
	wordsIn,
};

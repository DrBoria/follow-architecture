"use strict";

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

const { matchesWhere, fillTemplate } = require("../utils/where");

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

const fileDir = (rel) => String(rel ?? "").split("/").slice(0, -1);

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
	const { folderOwner, ancestorsAreReal } = require("./tree");
	for (const dest of destinationsIn(arch, role, rel)) {
		if (!dest?.slug || !dest.path) continue;
		// The home's SHAPE has to exist at that path: `apps/backend/config/actions`
		// matches a feature's `{kebab-case}/actions`, but `config` is not a feature
		// (no `store.ts`, no `actions/`), so naming it would be advice about a
		// folder that must never exist. The template form of that home is offered
		// instead (`placeFor` falls back to it).
		const destNode = arch.nodes?.bySlug?.[dest.slug];
		if (destNode && !ancestorsAreReal(destNode, dest.path, arch)) continue;
		const folder = dest.folder ? dest.path : dest.path.split("/").slice(0, -1).join("/");
		const hit = folderOwner(arch, folder);
		if (!hit) continue;
		// The folder has to be a REAL instance of what claims it: `apps/backend/utils`
		// matches the `{kebab-case}` feature pattern, but a feature has required
		// children it does not have — so it cannot host a feature's `type.ts`, and
		// the shared package answers instead.
		const { instanceAt } = require("./tree");
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

module.exports = { homesOf, destinationOf, placeFor, roleFitsAt, rolesAtPath };

"use strict";

// Engine names → report names: role → box, place → node.

// ONE source for every place question. `homeFor`, `nodeAtPath`, `homeTemplates`
// and `pathOf` used to be spelled again here, in a second wording, next to the
// real ones in `entities/location.js` — the report and the engine then disagreed
// about where a role lives. This file only NAMES things now.
const { homesOf, rolesAtPath: rolesDeclaredAt, homeForRole, boxOfPlace } = require("../../../entities/location");

const make = ({ nodes, arch }) => {
	const folderOf = (slug) => {
		if (!slug) return null;
		if (nodes.some((n) => n.slug === slug)) return slug;
		return homesOf(arch, slug)[0]?.node ?? null;
	};

	// A node slug as the path a human recognises.
	const pathOf = (slug) => nodes.find((n) => n.slug === slug)?.paths?.[0] ?? slug;

	// EVERY role that declares a place — the candidate set a destination decision
	// may choose from ("какие есть").
	const roles = () => Object.keys(arch?.nodes?.roleHomes ?? {});

	// Roles whose declared home covers this path, most specific first: what this
	// file already IS, according to the tree.
	const rolesAtPath = (rel) => rolesDeclaredAt(arch, rel);

	// The path templates a role declares (`…/constants.ts`, `…/actions/**`).
	const homeTemplates = (role) => homesOf(arch, role).map((h) => h.template);

	// Where this role's code belongs FOR THIS FILE, and the box that hosts it —
	// the engine's own answer, never a folder invented here.
	const homeFor = (role, rel) => homeForRole(arch, role, rel);

	// The box that HOLDS a path — `apps/backend/document/store.ts` → the node that
	// owns `apps/backend/document`.
	const nodeAtPath = (path) => boxOfPlace(arch, path);

	return { folderOf, pathOf, roles, rolesAtPath, homeTemplates, homeFor, nodeAtPath };
};

module.exports = { make };

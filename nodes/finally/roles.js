"use strict";

// Role ↔ place: is this file a home for that role, and which paths may an
// action's `from:` list name.

const { fillTemplate } = require("../../entities/location");
const { homesOf, roleFitsAt: homeCovers } = require("../../entities/location");

const fitsRole = (roleSlug, arch, rel) => {
	if (!arch.codeRoles?.[roleSlug]) return true;
	if (!homesOf(arch, roleSlug).length) return true;
	return homeCovers(arch, roleSlug, rel);
};

const allowedPlaces = (entries, arch, targetCaps) => {
	const out = [];
	for (const entry of entries ?? []) {
		if (entry.type === "role") {
			const homes = homesOf(arch, entry.role);
			const paths = homes.map((h) => fillTemplate(h.template, null, targetCaps)).filter(Boolean);
			// `same: true` is part of the RULE, not decoration: an orchestrator may
			// call an action only inside its own feature. The message has to say so,
			// or it reads as "orchestrators may not call actions at all".
			out.push({ role: entry.role, paths, anywhere: !homes.length, same: Boolean(entry.same) });
		} else if (entry.type === "node") {
			out.push({ role: null, paths: [fillTemplate(arch.nodes?.bySlug?.[entry.node]?.path, null, targetCaps)].filter(Boolean) });
		} else if (entry.type === "glob") {
			out.push({ role: null, paths: [entry.glob] });
		} else {
			out.push({ role: null, paths: [], filter: true });
		}
	}
	return out;
};

module.exports = { fitsRole, allowedPlaces };

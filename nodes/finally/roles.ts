"use strict";

// Role ↔ place: is this file a home for that role, and which paths may an
// action's `from:` list name.

import { fillTemplate, homesOf, roleFitsAt } from "../../entities/location";
import { admitsWhenNoneReject } from "../../utils/gate";
import type { Arch, WhereEntry } from "../../entities/architecture";
import type { Caps } from "../../entities/location/where";

// Does this file sit in one of the role's homes? The home question is the ONE
// implementation in `entities/location/homes` (`roleFitsAt`, asked through the
// shared `where` grammar). The two exemptions are the shared gate: a role
// nobody declares, or one with no home, restricts nothing — when neither
// rejection fires, the home answer decides.
const fitsRole = (roleSlug: string, arch: Arch, rel: string): boolean =>
	!admitsWhenNoneReject(roleSlug, [(slug) => !arch.codeRoles?.[slug], (slug) => !homesOf(arch, slug).length]) || roleFitsAt(arch, roleSlug, rel);

// One place an action's `where` entry allows: the role it names (if any), the
// concrete paths, and the rule's own qualifiers.
type AllowedPlace = { role: string | null; paths: string[]; anywhere?: boolean; same?: boolean; filter?: boolean };

const rolePlace = (entry: WhereEntry, arch: Arch, targetCaps: Caps | null): AllowedPlace => {
	const homes = homesOf(arch, entry.role ?? "");
	const paths = homes.map((h) => fillTemplate(h.template, null, targetCaps)).filter((p): p is string => Boolean(p));
	// `same: true` is part of the RULE, not decoration: an orchestrator may
	// call an action only inside its own feature. The message has to say so,
	// or it reads as "orchestrators may not call actions at all".
	return { role: entry.role ?? null, paths, anywhere: !homes.length, same: Boolean(entry.same) };
};

const nodePlace = (entry: WhereEntry, arch: Arch, targetCaps: Caps | null): AllowedPlace => {
	const path = fillTemplate(arch.nodes?.bySlug?.[entry.node ?? ""]?.path, null, targetCaps);

	return { role: null, paths: path ? [path] : [] };
};

const allowedPlaces = (entries: WhereEntry[] | null | undefined, arch: Arch, targetCaps: Caps | null): AllowedPlace[] => {
	const out: AllowedPlace[] = [];
	for (const entry of entries ?? []) {
		if (entry.type === "role") out.push(rolePlace(entry, arch, targetCaps));
		else if (entry.type === "node") out.push(nodePlace(entry, arch, targetCaps));
		else if (entry.type === "glob") out.push({ role: null, paths: entry.glob ? [entry.glob] : [] });
		else out.push({ role: null, paths: [], filter: true });
	}

	return out;
};

export { fitsRole, allowedPlaces };
export type { AllowedPlace };

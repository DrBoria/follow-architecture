"use strict";

// Engine names → report names: role → box, place → node.

// ONE source for every place question. `homeFor`, `nodeAtPath`, `homeTemplates`
// and `pathOf` used to be spelled again here, in a second wording, next to the
// real ones in `entities/location.js` — the report and the engine then disagreed
// about where a role lives. This file only NAMES things now.
import { homesOf, rolesAtPath as rolesDeclaredAt, homeForRole, boxOfPlace } from "../../../entities/location";
import type { Arch } from "../../../entities/architecture";
import type { NodeSummary } from "../../../entities/overview-summaries";
import type { Places } from "../../../entities/decision-ctx";

const make = ({ nodes, arch }: { nodes: NodeSummary[]; arch: Arch }): Places => {
	const folderOf = (slug: string | null | undefined): string | null => {
		if (!slug) return null;
		if (nodes.some((n) => n.slug === slug)) return slug;
		return homesOf(arch, slug)[0]?.node ?? null;
	};

	// A node slug as the path a human recognises.
	const pathOf = (slug: string): string => nodes.find((n) => n.slug === slug)?.paths?.[0] ?? slug;

	// EVERY role that declares a place — the candidate set a destination decision
	// may choose from ("какие есть").
	const roles = (): string[] => Object.keys(arch.nodes.roleHomes);

	// Roles whose declared home covers this path, most specific first: what this
	// file already IS, according to the tree.
	const rolesAtPath = (rel: string): string[] => rolesDeclaredAt(arch, rel);

	// The path templates a role declares (`…/constants.ts`, `…/actions/**`).
	const homeTemplates = (role: string): string[] => homesOf(arch, role).map((h) => h.template);

	// Where this role's code belongs FOR THIS FILE, and the box that hosts it —
	// the engine's own answer, never a folder invented here.
	const homeFor = (role: string, rel: string) => homeForRole(arch, role, rel);

	// The box that HOLDS a path — `apps/backend/document/store.ts` → the node that
	// owns `apps/backend/document`.
	const nodeAtPath = (path: string | null | undefined): string | null => boxOfPlace(arch, path);

	return { folderOf, pathOf, roles, rolesAtPath, homeTemplates, homeFor, nodeAtPath };
};

export { make };

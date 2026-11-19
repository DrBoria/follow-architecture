"use strict";

// THE ROLES A CHILD DECLARES — one reading, shared by every consumer that asks
// "what kinds of code does this child hold": a child carries its own roles, or
// names another node that does. The folder lookalikes measure an entity's
// shape by them (`nodes/similar`); the unroled check names what a place
// declares (`pipeline-unroled`). The question is the same, so the answer lives
// here once.

import type { Arch, ArchChild } from "../entities/architecture";

const rolesOfChild = (arch: Arch, child: ArchChild | null | undefined): string[] => {
	if (!child) return [];
	if (child.roles?.length) return child.roles;
	const target = child.nodeSlug ? arch.nodes.bySlug[child.nodeSlug] : null;

	return target?.roles ?? [];
};

export { rolesOfChild };
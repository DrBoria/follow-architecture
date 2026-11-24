"use strict";

// The per-file pipeline. One entry point the CLI and the ESLint rule both call,
// in named phases: load the source file and collect its facts
// (`pipeline-facts`), classify the candidates' roles, assert those roles'
// homes (`pipeline-roles`), report the pieces no role describes
// (`pipeline-unroled`), then run the three check layers — node tree, node
// structure, and invariants. Every layer receives the same context and appends
// findings to the same list.

import type { Project } from "ts-morph";
import { createTsProject } from "./entities/ast";
import { classifyRoles } from "./code-roles/classify";
import { projectRoleIndex, codeRoleScope, providersFor } from "./code-roles/project";
import { checkTree } from "./entities/tree";
import { checkFinally } from "./nodes/finally";
import { checkInvariants } from "./invariants";
import { findingFrom } from "./report/cli-report";
import { collectFacts } from "./pipeline-facts";
import { checkRoleHomes } from "./pipeline-roles";
import { checkUnroled } from "./pipeline-unroled";
import type { Arch, Invariant, QueryFilter } from "./entities/architecture";
import type { Candidate } from "./entities/facts";
import type { Finding } from "./entities/findings";
import type { SeenStore } from "./utils/seen";

// Does any filter name the project-wide `codeRole` scope (as a field or a
// `$codeRole.…` reference)? Only then is the project-wide classify pass worth
// running — a config that never asks for it pays nothing.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- a filter walk for one key name
const filterNamesCodeRole = (filter: QueryFilter): boolean => {
	if (typeof filter === "string") return filter.includes("$codeRole");
	if (Array.isArray(filter)) return filter.some(filterNamesCodeRole);
	if (filter === null || typeof filter !== "object") return false;

	return Object.entries(filter).some(([key, value]) => key === "codeRole" || filterNamesCodeRole(value));
};

const invariantNamesCodeRole = (inv: Invariant): boolean =>
	inv.when !== null && filterNamesCodeRole(inv.when) ? true : inv.infer.some(filterNamesCodeRole) || inv.children.some(invariantNamesCodeRole);

const namesCodeRole = (invs: readonly Invariant[]): boolean => invs.some(invariantNamesCodeRole);

// The lazy `codeRole` scope: role slug → the project-wide classified pieces.
// Defined as a getter so the whole-project scan runs only when a filter reads
// it, and memoised in the closure so it runs once per file.
const defineCodeRole = (facts: object, build: () => Record<string, Candidate[]>): void => {
	let cached: Record<string, Candidate[]> | null = null;
	Object.defineProperty(facts, "codeRole", {
		enumerable: true,
		configurable: true,
		get: () => (cached ??= build()),
	});
};

const checkFile = (...args: [abs: string, arch: Arch, project: Project, repoFiles: string[], dedupe: SeenStore]): Finding[] => {
	const [abs, arch, project, repoFiles, dedupe] = args;
	// 1. LOAD → FACTS: candidates once, facets attached, the file's fact set.
	const { ctx, candidates, fileFacts } = collectFacts(abs, arch, project, repoFiles, dedupe);

	// 2. ROLES: classify, then fill the two fields that need the classification.
	const { present, roleCtx, candidates: withRoles } = classifyRoles(candidates, arch.codeRoles ?? {}, arch, fileFacts);
	ctx.roles = present;
	ctx.roleCtx = roleCtx;
	// `c.file` is the snapshot every candidate carries, and roles are known only
	// now: filling them here keeps "the file this piece sits in" complete instead
	// of a copy that silently lacks the one field a rule asks about.
	fileFacts.roles = [...new Set<string>(present)];
	// File facts (candidates attached) — the invariants' filter target.
	// `repoFiles` travels with the facts: an edge's module is a repo FILE or a
	// library SPECIFIER, and the file list is the one place that tells them apart.
	ctx.facts = { ...fileFacts, candidates: withRoles, roles: [...new Set(present)], repoFiles };
	// The project-wide role index serves two things, both lazy: the `codeRole`
	// scope a filter can navigate, and the providers resolution resolves against.
	if (namesCodeRole(arch.invariants)) defineCodeRole(ctx.facts, () => codeRoleScope(projectRoleIndex(project, arch, repoFiles)));
	ctx.providersFor = (slugs) => providersFor(projectRoleIndex(project, arch, repoFiles), slugs);

	const out: Finding[] = [];
	// 3. ROLE HOMES: every candidate must fit its role's declared home.
	checkRoleHomes(withRoles, ctx, arch, out);
	// 4. UNROLED: the pieces no role describes, and the file nothing describes.
	checkUnroled(withRoles, { present, ctx, arch, project, repoFiles, out });
	// 5. STRUCTURE: the node tree, then the built-in structure rule (kind +
	// declaration), then the invariants.
	checkTree(ctx.rel, arch, out, findingFrom, ctx.facts, ctx.repoFiles);
	checkFinally(ctx, arch, out, findingFrom);
	checkInvariants(arch.invariants, ctx, out, findingFrom, dedupe);

	return out;
};

export { checkFile, createTsProject };

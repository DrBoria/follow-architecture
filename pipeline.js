"use strict";

// The per-file pipeline. One entry point the CLI and the ESLint rule both call:
// load the source file, collect candidates once, classify their roles, assert
// those roles, collect the file's raw facts, then run the three check layers —
// node tree, node role expectations, and invariants. Every layer receives the
// same context and appends findings to the same list.

const path = require("node:path");
const fs = require("node:fs");
const { toRel } = require("./utils/imports");
const { createTsProject, loadSourceFile, collectCandidates, collectFileFacts, importNameModules } = require("./ast");
const { classifyRoles } = require("./code-roles/classify");
const { assertRole } = require("./code-roles/assert");
const { checkTree, deepestMatch } = require("./nodes/tree");
const { checkFinally, destinationFor, fitsRole } = require("./nodes/finally");
const { checkInvariants } = require("./invariants");
const { findingFrom } = require("./report/report");

const buildFileContext = (abs, repoRoot, arch, sf) => {
	const rel = toRel(repoRoot, abs);
	const dir = path.posix.dirname(rel);
	const basename = path.posix.basename(rel);
	return {
		abs,
		rel,
		dir,
		basename,
		sf,
		repoRoot,
		aliases: arch.aliases ?? {},
		roles: [],
		roleCtx: null,
		facts: null,
	};
};

const checkFile = (abs, arch, project, repoFiles, dedupe) => {
	const text = fs.readFileSync(abs, "utf8");
	const sf = loadSourceFile(project, abs, text);
	const ctx = buildFileContext(abs, arch.repoRoot, arch, sf);
	ctx.repoFiles = repoFiles;

	// Collect candidates once; classification and file facts both consume them.
	const importMap = importNameModules(sf, arch.repoRoot, ctx.aliases, repoFiles);
	const candidates = collectCandidates(sf, importMap, ctx.rel);
	const { present, roleCtx, candidates: withRoles } = classifyRoles(candidates, arch.codeRoles ?? {}, arch);
	ctx.roles = present;
	ctx.roleCtx = roleCtx;

	// Assert each classified candidate against its role's assert block, and
	// emit the role's top-level `report` for every candidate classified into it.
	// A role may declare `except` globs (same pattern language as invariants):
	// a matching file is exempt from the role's checks entirely — e.g. test
	// mocks and extension adapter bridges are allowed to be thin forwarders.
	const out = [];
	for (const c of withRoles) {
		const roleDef = (arch.codeRoles ?? {})[c.role];
		if (!roleDef) continue;
		if (roleDef.except?.some((g) => g.re.test(ctx.rel))) continue;
		assertRole(c, roleDef, ctx, withRoles, out, findingFrom);
		if (roleDef.report) {
			// The role's top-level `report` fires only for a MISFIT candidate —
			// one whose role is not among the owning node's declared kinds, or
			// whose role declares a location.declaration node elsewhere. A candidate that fits
			// its node is correct code and stays silent. `{destination}` names
			// where the architecture says this role may live (its declaration node, or
			// the most specific node whose kind includes it) — resolved the
			// same way as the built-in `finally-follow-architecture` rule, so a
			// fixer can act on the text alone.
			const owner = deepestMatch(ctx.rel, arch)?.node ?? null;
			// A candidate is a misfit when it sits in a node that doesn't
			// declare its role, or outside any node at all (then the
			// destination is empty and the report says so).
			const fits = owner !== null && fitsRole(c.role, arch, owner, ctx.rel);
			if (!fits) {
				const dest = owner ? destinationFor(c.role, arch, owner, ctx.rel) : null;
				out.push(findingFrom({ report: roleDef.report, line: c.line }, "codeRoles", c.role, `role:${c.role}:report`, { path: ctx.rel, what: c.name ?? c.calledBy ?? c.parentName ?? null, destination: dest?.path ?? null, destinationSlug: dest?.slug ?? null }));
			}
		}
	}

	// File facts (candidates attached) — the invariants' filter target.
	ctx.facts = collectFileFacts(sf, { rel: ctx.rel, repoFiles, aliases: ctx.aliases, repoRoot: arch.repoRoot, candidates: withRoles, scopeAccessors: arch.scopeAccessors });

	checkTree(ctx.rel, arch, out, findingFrom);
	// finally-follow-architecture: the built-in structure rule (kind + declaration).
	// Replaces the old per-node required/forbidden and role-declaration checks.
	checkFinally(ctx, arch, out, findingFrom);
	checkInvariants(arch.invariants, ctx, out, findingFrom, dedupe);
	return out;
};

module.exports = { checkFile, buildFileContext, createTsProject };

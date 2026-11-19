"use strict";

// The FACTS phase of the per-file pipeline: load the source file, collect the
// candidates once, attach the facet readings (framework, CSS, call depth), and
// build the file's fact set. Classification and the file facts both consume the
// same candidates, so nothing is collected twice.

import * as path from "node:path";
import * as fs from "node:fs";
import type { Project, SourceFile } from "ts-morph";
import { toRel } from "./utils/imports";
import { loadSourceFile, collectCandidates, collectFileFacts, importNameModules } from "./entities/ast";
import { attachToCandidates as attachCssFacts } from "./css";
import { classifyValue } from "./css/values";
import { enrich as attachFrameworkFacts } from "./frameworks";
import { attachCallDepth } from "./entities/ast/depth";
import type { Arch } from "./entities/architecture";
import type { FileContext } from "./entities/context";
import type { Candidate, FileFacts, MemberFact, AnyMember } from "./entities/facts";
import type { SeenStore } from "./utils/seen";

// The file's place and the run's shared state, before any fact is collected.
const buildFileContext = (abs: string, arch: Arch, load: { sf: SourceFile; repoFiles: string[]; dedupe: SeenStore }): FileContext => {
	const repoRoot = arch.repoRoot ?? ".";
	const rel = toRel(repoRoot, abs);

	return {
		abs,
		rel,
		dir: path.posix.dirname(rel),
		basename: path.posix.basename(rel),
		sf: load.sf,
		repoRoot,
		aliases: arch.aliases ?? {},
		// The built architecture — scope entries (`{ node: slug }`) resolve
		// against the tree, and filters may reference it too.
		arch,
		roles: [],
		roleCtx: null,
		facts: null,
		repoFiles: load.repoFiles,
		// Shared across the run: lets node-level checks report once per folder
		// instead of once per file inside it.
		dedupe: load.dedupe,
	};
};

// A member written as a STRING is a CSS value when the grammar says so: a
// theme's `section: '#182022'` is a `Hash`, `overlayBackground: 'rgba(0,0,0,.7)'`
// is a `Function`, `borderRadius: 'var(--radius)'` is a read. The classification
// is css-tree's, so a colour written any of those ways is the same kind of fact
// — and nothing here decides which of them a rule accepts. Members nest
// (`theme.colors.section`), so the walk does too: every string member at ANY
// depth gets the same grammar reading.
type CssMember = (MemberFact | AnyMember) & { line?: number; css?: ReturnType<typeof classifyValue> };
const classifyMembers = (members: readonly CssMember[] | undefined): void => {
	for (const member of members ?? []) {
		if (typeof member.value === "string") member.css = classifyValue(member.value, member.line ?? null);
		classifyMembers(member.members);
	}
};

// The candidates with every facet reading attached: call depth (a FACT, so a
// rule can refuse a chain nobody can follow), the framework and style readings
// of the same AST (attached before classification, so a code role can be
// defined on them exactly like on `kind` — both are optional namespaces, a
// plain `.ts` file gets neither), and the CSS grammar reading of string members.
const withFacets = (candidates: Candidate[], run: { ctx: FileContext; sf: SourceFile; text: string; project: Project; arch: Arch; repoFiles: string[] }): Candidate[] => {
	const { ctx, sf, text, project, arch, repoFiles } = run;
	attachCallDepth(candidates, {
		rel: ctx.rel,
		project,
		repoRoot: arch.repoRoot ?? ctx.repoRoot ?? ".",
		aliases: ctx.aliases,
		repoFiles,
		cache: (arch.depthCache ??= { memo: new Map(), files: new Map() }),
	});
	attachFrameworkFacts(candidates, { rel: ctx.rel, sf, text, repoRoot: arch.repoRoot ?? ctx.repoRoot });
	attachCssFacts(candidates, { sf });
	for (const candidate of candidates) classifyMembers(candidate.kind?.initializer?.members);

	return candidates;
};

// Load → candidates → facets → file facts. The file's facts are needed BEFORE
// classification — a role may be recognised by what the file depends on
// (`file.imports`), not only by the candidate's own shape. The only fields that
// need the classification are `candidates` and `roles`, so they are filled in
// afterwards; every candidate holds the same facts object, so `infer` sees
// everything the file facts offer, not a hand-picked subset.
const collectFacts = (...args: [abs: string, arch: Arch, project: Project, repoFiles: string[], dedupe: SeenStore]): { ctx: FileContext; candidates: Candidate[]; fileFacts: FileFacts } => {
	const [abs, arch, project, repoFiles, dedupe] = args;
	const text = fs.readFileSync(abs, "utf8");
	const sf = loadSourceFile(project, abs, text);
	const ctx = buildFileContext(abs, arch, { sf, repoFiles, dedupe });
	const importMap = importNameModules(sf, ctx.repoRoot ?? ".", ctx.aliases, repoFiles);
	// `repoRoot` lets the type-resolved facts (`assignments[].type`,
	// `parameters[].typeFile`) be repo-relative, which is what
	// `location: { node: … }` matches against.
	const candidates = withFacets(collectCandidates(sf, importMap, ctx.rel, ctx.repoRoot ?? "."), { ctx, sf, text, project, arch, repoFiles });
	const fileFacts = collectFileFacts(sf, { rel: ctx.rel, repoFiles, aliases: ctx.aliases, repoRoot: ctx.repoRoot ?? ".", candidates: [] });
	for (const c of candidates) c.file = fileFacts;

	return { ctx, candidates, fileFacts };
};

export { collectFacts };
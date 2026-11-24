"use strict";

// THE PROJECT-WIDE CLASSIFY PASS. A query scope may name any code role
// (`codeRole.<slug>`) and read the pieces that carry it ACROSS the repo — a
// provider role's literals, for instance, live in files other than the one the
// invariant is judging. Classification is per piece and per file, so the pass
// runs the SAME per-file walk (`collectCandidates` + facets + `classifyRoles`)
// over every source file and indexes the results by role.
//
// Nothing here knows a role name: the index is `slug → candidates`, and the
// provider literals are the object-literal initializers of a role's candidates.
// Cached per project (rebuilt when the project grows), so the whole scan happens
// once per run, not once per file.

import { Node, type ObjectLiteralExpression, type Project, type SourceFile } from "ts-morph";
import { toRel } from "../utils/imports";
import { pushGroup } from "../utils/group";
import { collectCandidates, collectFileFacts, importNameModules } from "../entities/ast";
import { enrich as attachFrameworkFacts } from "../frameworks";
import { attachToCandidates } from "../css";
import type { ProviderLiteral } from "../css/core/scope-types";
import { classifyRoles } from "./classify";
import type { Arch } from "../entities/architecture";
import type { Candidate } from "../entities/facts";

// What the pass produces: the classified candidates per role, and — for each
// role — the object literals its candidates are initialised with. A provider is
// one of those literals; a role may have none (a component role, a helper role).
type ProjectRoleIndex = {
	bySlug: Map<string, Candidate[]>;
	providersBySlug: Map<string, ProviderLiteral[]>;
};

const emptyIndex = (): ProjectRoleIndex => ({ bySlug: new Map(), providersBySlug: new Map() });

// Strip the wrappers that do not change a value: `(x)`, `x as T`, `x satisfies T`,
// `x!`. A theme written as `{…} satisfies ThemeInterface` carries its members on
// the wrapped literal, so this is where the provider node is found.
const unwrapToLiteral = (node: Node): ObjectLiteralExpression | null => {
	let current = node;
	for (;;) {
		if (Node.isParenthesizedExpression(current) || Node.isAsExpression(current) || Node.isSatisfiesExpression(current) || Node.isNonNullExpression(current) || Node.isTypeAssertion(current)) {
			current = current.getExpression();
			continue;
		}

		return Node.isObjectLiteralExpression(current) ? current : null;
	}
};

// The classified candidate a declaration's initializer belongs to: the same name
// and start line. A variable holding an object literal has one candidate whose
// `kind.initializer` is that literal, so name+line is unambiguous here.
const candidateAt = (classified: readonly Candidate[], name: string, line: number): Candidate | null => classified.find((c) => c.name === name && c.lines?.[0] === line) ?? null;

// Push a role's object-literal provider when the declaration's initializer is
// one. Exported default (`export default {…}`) is a declaration with the name
// `default`, so both spellings read the same way.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- pushes a provider into its role bucket, not a finally check
const addProvider = (provider: { providersBySlug: Map<string, ProviderLiteral[]>; classified: readonly Candidate[]; name: string; line: number; node: ObjectLiteralExpression }): void => {
	const role = candidateAt(provider.classified, provider.name, provider.line)?.role;
	if (!role) return;
	pushGroup(provider.providersBySlug, role, { name: provider.name, node: provider.node });
};

// The object-literal initializers of one file's classified candidates.
const collectProviders = (sf: SourceFile, classified: readonly Candidate[], providersBySlug: Map<string, ProviderLiteral[]>): void => {
	for (const declaration of sf.getVariableDeclarations()) {
		const initializer = declaration.getInitializer();
		const nameNode = declaration.getNameNode();
		if (!initializer || !Node.isIdentifier(nameNode)) continue;
		const literal = unwrapToLiteral(initializer);
		if (literal) addProvider({ providersBySlug, classified, name: nameNode.getText(), line: declaration.getStartLineNumber(), node: literal });
	}
	for (const assignment of sf.getExportAssignments()) {
		const literal = unwrapToLiteral(assignment.getExpression());
		if (literal) addProvider({ providersBySlug, classified, name: "default", line: assignment.getStartLineNumber(), node: literal });
	}
};

// One file's classified candidates, with the facets a role may be recognised
// by. The facets are attached exactly as the per-file pipeline attaches them,
// so a role classifies the same way here and there.
// A per-file classify walk; it is not the depth walk's `read`.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- distinct per-file classify
const classifyFile = (sf: SourceFile, run: { arch: Arch; repoFiles: string[] }): Candidate[] => {
	const repoRoot = run.arch.repoRoot ?? ".";
	const rel = toRel(repoRoot, sf.getFilePath());
	const text = sf.getFullText();
	const importMap = importNameModules(sf, repoRoot, run.arch.aliases ?? {}, run.repoFiles);
	const candidates = collectCandidates(sf, importMap, rel, repoRoot);
	attachFrameworkFacts(candidates, { rel, sf, text, repoRoot, importMap });
	attachToCandidates(candidates, { sf });
	const fileFacts = collectFileFacts(sf, { rel, repoFiles: run.repoFiles, aliases: run.arch.aliases ?? {}, repoRoot, candidates: [] });

	return classifyRoles(candidates, run.arch.codeRoles, run.arch, fileFacts).candidates;
};

// The project index, cached per project and rebuilt when the project grows (the
// same policy the value scope uses).
const PROJECT_INDEX = new WeakMap<Project, { count: number; index: ProjectRoleIndex }>();

// Cached per project, like the scope cache, but a different index.
// eslint-disable-next-line md-code-utils/utils-uniqueness -- distinct project index cache
const projectRoleIndex = (project: Project, arch: Arch, repoFiles: string[]): ProjectRoleIndex => {
	const files = project.getSourceFiles();
	const cached = PROJECT_INDEX.get(project);
	if (cached && cached.count === files.length) return cached.index;

	const index = emptyIndex();
	for (const sf of files) {
		const classified = classifyFile(sf, { arch, repoFiles });
		for (const candidate of classified) {
			if (!candidate.role) continue;
			index.bySlug.set(candidate.role, [...(index.bySlug.get(candidate.role) ?? []), candidate]);
		}
		collectProviders(sf, classified, index.providersBySlug);
	}
	PROJECT_INDEX.set(project, { count: files.length, index });

	return index;
};

// The `codeRole` scope object: role slug → the project-wide pieces carrying it.
// A plain record so the filter engine can navigate it (`codeRole.<slug>`).
const codeRoleScope = (index: ProjectRoleIndex): Record<string, Candidate[]> => Object.fromEntries(index.bySlug);

// The provider literals a set of role slugs offers, de-duplicated by literal.
const providersFor = (index: ProjectRoleIndex, slugs: readonly string[]): ProviderLiteral[] => {
	const seen = new Set<ProviderLiteral>();
	const out: ProviderLiteral[] = [];
	for (const slug of slugs) {
		for (const provider of index.providersBySlug.get(slug) ?? []) {
			if (seen.has(provider)) continue;
			seen.add(provider);
			out.push(provider);
		}
	}

	return out;
};

export { projectRoleIndex, codeRoleScope, providersFor };
export type { ProjectRoleIndex };

"use strict";

// The REAL EXAMPLES on a role card: the overview re-walks the sources and
// classifies candidates with the same engines the rule uses, so every card
// shows actual matches from this repository with a code snippet and the marks
// of what made the piece that role.

import * as path from "node:path";
import type { Project } from "ts-morph";
import { loadSourceFile, collectCandidates, collectFileFacts, importNameModules } from "../../../entities/ast";
import { classifyRoles } from "../../../code-roles/classify";
import { attachToCandidates as attachCssFacts } from "../../../css";
import { enrich as attachFrameworkFacts } from "../../../frameworks";
import { groupBy } from "../../../utils/group";
import { snippet, readText } from "./scan";
import { matchedRanges } from "./role-marks";
import type { Arch } from "../../../entities/architecture";
import type { Candidate } from "../../../entities/facts";
import type { RoleExample } from "../../../entities/overview-summaries";

const MAX_EXAMPLES_PER_ROLE = 8;

// A NAMED piece beats an anonymous one as the face of a role: anonymous
// matches are kept (they are real matches) but sorted after the named ones.
const exampleRank = (c: Candidate): number => (c.name ? 0 : 1);

// The candidates of one file, with the facets and file facts attached in the
// engine's own order, then classified. A file the engines cannot read is
// skipped — the card shows what IS there, never a guess.
const classifiedFile = (rel: string, ask: { arch: Arch; repoRoot: string; repoFiles: string[]; project: Project }): Candidate[] => {
	const { arch, repoRoot, repoFiles, project } = ask;
	const abs = path.join(repoRoot, rel);
	try {
		const sf = loadSourceFile(project, abs, readText(abs));
		const importMap = importNameModules(sf, repoRoot, arch.aliases ?? {}, repoFiles);
		const candidates = collectCandidates(sf, importMap, rel, repoRoot);
		attachFrameworkFacts(candidates, { rel, sf, text: readText(abs), repoRoot });
		attachCssFacts(candidates, { sf });
		const fileFacts = collectFileFacts(sf, { rel, repoFiles, aliases: arch.aliases ?? {}, repoRoot, candidates: [] });
		for (const c of candidates) c.file = fileFacts;
		return classifyRoles(candidates, arch.codeRoles ?? {}, arch).candidates;
	} catch {
		return [];
	}
};

// One example row: the piece, its window, and the marks of its own infer.
const exampleOf = (c: Candidate, rel: string, ask: { arch: Arch; repoRoot: string }): RoleExample => {
	const line = c.lines?.[0] ?? 1;
	return {
		file: rel,
		line,
		name: c.name ?? "(anonymous)",
		rank: exampleRank(c),
		code: snippet(path.join(ask.repoRoot, rel), line),
		matched: matchedRanges(c, ask.arch.codeRoles?.[c.role ?? ""]?.infer),
	};
};

// Named first, document order within each group; then cap. The overflow count
// stays honest: every match beyond the cap is counted, not dropped. The count
// travels BESIDE the list (the payload is JSON — a property on an array would
// serialize to nothing).
type ExampleBucket = { list: RoleExample[]; overflow: number };
const capped = (list: RoleExample[]): ExampleBucket => {
	list.sort((a, b) => a.rank - b.rank);
	if (list.length <= MAX_EXAMPLES_PER_ROLE) return { list, overflow: 0 };
	return { list: list.slice(0, MAX_EXAMPLES_PER_ROLE), overflow: list.length - MAX_EXAMPLES_PER_ROLE };
};

const collectExamples = (ask: { arch: Arch; files: string[]; repoRoot: string; repoFiles: string[]; project: Project }): Map<string, ExampleBucket> => {
	const rows: { role: string; example: RoleExample }[] = [];
	for (const rel of ask.files) {
		for (const c of classifiedFile(rel, ask)) {
			if (!c.role) continue;
			rows.push({ role: c.role, example: exampleOf(c, rel, ask) });
		}
	}
	const buckets = groupBy(rows, (r) => r.role);
	return new Map(buckets.map(([role, items]) => [role, capped(items.map((r) => r.example))]));
};

export { collectExamples };
export type { ExampleBucket };

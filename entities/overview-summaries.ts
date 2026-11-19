"use strict";

// THE overview's node / role / invariant summaries — what the browser renders
// for the declared architecture. DERIVED from their one producers
// (`buildNodes`, `buildRoles`, `buildInvariants`), so the Node builders and the
// browser screens read the same shapes. Plain JSON throughout.

import type { FieldValue } from "../utils/field";
import type { Located } from "./facts";
import type { RoleDef, ReportObject } from "./architecture";

// A code window: the lines around a declaration, with its first line and
// whether the window was cut short.
type Snippet = { startLine: number; lines: string[]; truncated: boolean };

// One line range the role's infer matched, RELATIVE to the snippet's first
// line, with WHY it matched.
type MatchedRange = { from: number; to: number; why: string };

// One real example of a role: a piece of code from this repository. The
// `name`/`line` pair is the ONE located-facet shape every fact carries.
type RoleExample = Required<Pick<Located, "name" | "line">> & {
	file: string;
	rank: number;
	code: Snippet | null;
	matched: MatchedRange[];
};

// Where a role may be declared: one row per node that gives it a home.
type RoleHome = { slug: string; paths: string[]; label: string; labels: string[] };

// One action a role allows: who may do it, and how the code is reached without
// an import.
type RoleAction = { kind: string; of: string | null; from: string[]; scopeAccess: { scope: string; segments: string[] }[] };

// The role card: the role's own identity (`slug`/`name` from the ONE role
// contract), its infer as written, its report unwrapped to the two sentence
// fields the card shows, and the overview's own sections.
type RoleSummary = Pick<RoleDef, "slug" | "name"> & {
	infer: FieldValue;
	report: { message: string | null; fix: string | null };
	actions: RoleAction[];
	homes: RoleHome[];
	examples: RoleExample[];
	exampleCount: number;
};

// One declared node: its paths, allowed children, and the real files in it.
type NodeSummary = {
	slug: string;
	name: string;
	paths: string[];
	isFile: boolean;
	parents: string[];
	children: string[];
	report: string | null;
	files: string[];
	fileCount: number;
	lineCount: number;
	exampleFile: string | null;
	sample: ({ file: string } & Snippet) | null;
	roles: string[];
	closed?: boolean;
};

// One invariant's condition lines and report.
type InvariantRule = { conditions: string[]; message: string | null; fix: FieldValue | ReportObject["fix"] };

type InvariantSummary = {
	id: string;
	where: string[];
	ignore: string[];
	when: string[];
	dedupeBy: string[];
	report: string | null;
	infer: InvariantRule[];
	findingCount: number;
};

export type { Snippet, MatchedRange, RoleExample, RoleHome, RoleAction, RoleSummary, NodeSummary, InvariantRule, InvariantSummary };

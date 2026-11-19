"use strict";

// THE typed model of an architecture config — the ONE description every consumer
// shares. `main.ts` builds it; `tree`, `location`, `kinds`, `queries`, `nodes`,
// `invariants` and the report read it. No module keeps a local copy of these
// shapes: a second spelling of `Arch` is a second truth that drifts.
//
// Two layers live here:
//   • the RAW config as written (`RawNode`, `RawChild`, `RawArch`) — what YAML
//     gives, before any normalisation;
//   • the BUILT model (`Arch`, `ArchNode`, `ArchVariant`, `ArchChild`, …) — what
//     the tree, the roles and the invariants actually hand to the engine.

import type { FieldValue } from "../utils/field";
import type { DepthCache } from "./ast/depth";
import type { SimilarCache } from "../nodes/similar";

// A filter/query in the shared filter language. Structurally it is plain data —
// objects of operators, lists of filters, scalars — so the fact value model is
// the honest type; the engine's recursive vocabulary lives in `queries.ts`.
type QueryFilter = FieldValue;

// The scope a `$ref` is resolved against and a `location` filter reads `arch`
// from: the file's facts, plus the built architecture, plus the file path. `arch`
// is NOT a field value (it carries compiled regexes), so it is named apart.
type ScopeValue = FieldValue | Arch | null | undefined;
type QueryScope = FieldValue | { readonly [key: string]: ScopeValue };

// A `report:` value: a sentence, or a structured object carrying the same fields
// (`description`/`message`) plus a `fix`. Both spellings still render.
type ReportObject = {
	description?: string | null;
	message?: string | null;
	fix?: string | ReportFix | null;
	ask?: string | null;
	code?: string | null;
	path?: string | null;
	place?: string | null;
	to?: string[];
	from?: string | null;
};
type ReportFix = { message?: string | null; location?: WhereEntry | string | (WhereEntry | string)[] | null };
type ReportValue = string | ReportObject | null;

// ── the `where` / place vocabulary ──────────────────────────────────────────
// One entry, shared by role actions, invariants and node roles: a role, a node,
// a glob, a template, or a filter over the file's facts.
type WhereType = "role" | "node" | "glob" | "template" | "query";
type WhereEntry = {
	type?: WhereType;
	role?: string;
	same?: boolean;
	via?: string | null;
	node?: string;
	glob?: string;
	template?: string;
	query?: QueryFilter;
	// A glob that has already been compiled — some readers expect the regex on
	// the entry (see `tree/matchers`). Optional because normalised entries carry
	// the pattern, not the compiled form.
	re?: RegExp;
};

// How code is reached through a declared accessor: `{ scope, segments }`.
type ScopeAccessor = { scope: string; segments: string[] };

// One action a role allows on its code (`import`/`call`/`mutate`/…).
type ActionDef = {
	where?: WhereEntry[];
	except?: WhereEntry[];
	of?: string;
	scopeAccess?: ScopeAccessor[] | null;
};

// One declared code role, normalised.
type RoleDef = {
	slug: string;
	name: string;
	infer: QueryFilter[];
	report: ReportValue;
	actions: Record<string, ActionDef>;
};
type CodeRoles = Record<string, RoleDef>;

// One normalised invariant.
type Invariant = {
	id: string;
	where: WhereEntry[];
	ignore: WhereEntry[];
	when: QueryFilter | null;
	infer: QueryFilter[];
	report: ReportValue;
	dedupeBy: WhereEntry[];
	children: Invariant[];
};

// One `infer` entry as the runtime reads it: a filter (plain data — the filter
// language's own model) plus the `report` template that is NOT a fact field
// (stripped before matching).
type InvariantCheck = QueryFilter & { report?: ReportValue };

// ── the tree ─────────────────────────────────────────────────────────────────

// Where code of a role is declared to live: a path template and the node it
// came from.
type RoleHome = { template: string; node: string | null };

// A `{ placeholder }` claim a variant carries: a literal child name locks a
// capture position to one value (a fixed child is not a `{kebab-case}` sibling).
type ArchClaim = { index: number; value: string };

// One way a node's path can be spelled — one per declared parent.
type ArchVariant = {
	path: string;
	re: RegExp;
	names: string[];
	literalLen: number;
	isFile: boolean;
	claims?: ArchClaim[];
};

// A compiled child of a node.
type ArchChild = {
	nodeSlug: string | null;
	name: string | null;
	re: RegExp;
	captures: string[];
	folder: boolean;
	required: boolean;
	forbidden: boolean;
	query: QueryFilter | null;
	report: ReportValue;
	roles: string[];
	slug?: string | null;
};

// A built node.
type ArchNode = {
	slug: string;
	name: string;
	parent?: string | string[] | null;
	parents: (string | null)[];
	children: ArchChild[];
	roles: string[];
	report?: ReportValue;
	required?: boolean;
	variants: ArchVariant[];
	path: string;
	re: RegExp;
	prefixRe: RegExp;
	prefixNames: string[];
	literalLen: number;
	isFile: boolean;
};

// The built tree, indexed every way the engine asks it.
type ArchNodes = {
	all: ArchNode[];
	bySlug: Record<string, ArchNode>;
	roots: ArchNode[];
	roleHomes: Record<string, RoleHome[]>;
};

// A cache slot the engine lazily fills per run. Both shapes are DERIVED from
// their one producer (`ast/depth`, `nodes/similar`), so a cache and the walk
// that fills it can never disagree about what they hold.

// THE architecture. Everything the engine reasons about hangs off this.
type Arch = {
	nodes: ArchNodes;
	codeRoles: CodeRoles;
	invariants: Invariant[];
	aliases: Record<string, string>;
	raw: RawArch;
	// Filled by the run, not by the config:
	repoRoot?: string | null;
	similarity?: number;
	depthCache?: DepthCache;
	similarCache?: SimilarCache;
};

// ── the RAW config ───────────────────────────────────────────────────────────

// A child as written: a bare name, or a spec object.
type RawChildSpec = {
	name?: string;
	node?: string;
	role?: string | string[];
	required?: boolean;
	forbidden?: boolean;
	query?: QueryFilter | null;
	report?: ReportValue;
};
type RawChild = string | RawChildSpec;

// A node as written.
type RawNode = {
	slug?: string;
	name: string;
	parent?: string | string[] | null;
	children?: RawChild[];
	role?: string | string[];
	report?: ReportValue;
};

// A codeRole as written: every key is data until `normalizeCodeRoles` reads it
// (the schema check rejects unknown keys by name, so nothing is typed shut).
type RawRole = { readonly [key: string]: FieldValue };

// The `codeRoles:` section: a list of `{ slug, … }` entries, or a map keyed by
// slug. Both normalize to the same `{ [slug]: role }` shape.
type RawCodeRoles = RawRole[] | Record<string, RawRole>;

// The `nodes:` section: a list, or a map keyed by slug.
type RawNodes = RawNode[] | Record<string, RawNode>;

// The config as written (YAML/JSON), before normalisation.
type RawArch = {
	// The path this config came from, when it was loaded from a file.
	file?: string;
	nodes?: RawNodes | null;
	codeRoles?: RawCodeRoles | null;
	invariants?: FieldValue[];
	aliases?: Record<string, FieldValue> | null;
	report?: ReportValue;
};

export type {
	QueryFilter,
	ScopeValue,
	QueryScope,
	ReportValue,
	ReportObject,
	WhereType,
	WhereEntry,
	ScopeAccessor,
	ActionDef,
	RoleDef,
	CodeRoles,
	Invariant,
	InvariantCheck,
	RoleHome,
	ArchClaim,
	ArchVariant,
	ArchChild,
	ArchNode,
	ArchNodes,
	DepthCache,
	SimilarCache,
	Arch,
	RawChildSpec,
	RawChild,
	RawNode,
	RawNodes,
	RawRole,
	RawCodeRoles,
	RawArch,
};

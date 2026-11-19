"use strict";

// THE decision context — what every finding type is asked about. The decision
// maker (`errorTypes/decision-maker`) builds it once from the finding, the tree
// and the places vocabulary; each type module reads the fields it needs. One
// shape, so a type never re-derives what the others already read.
//
// `places` is the ONE place vocabulary (`errorTypes/vocabulary/places`); the
// finding / violation / plan are the engine's own bags, read through the shared
// field readers. The context is plain data plus the places closures.

import type { FieldValue } from "../utils/field";
import type { Arch } from "./architecture";
import type { Finding } from "./findings";
import type { NodeSummary } from "./overview-summaries";
import type { RelationToken } from "./token";

// The place vocabulary: every "where" question, answered once.
type Places = {
	folderOf: (slug: string | null | undefined) => string | null;
	pathOf: (slug: string) => string;
	roles: () => string[];
	rolesAtPath: (rel: string) => string[];
	homeTemplates: (role: string) => string[];
	homeFor: (role: string, rel: string) => { role: string; path: string; folder: boolean; concrete: boolean; node: string | null } | null;
	nodeAtPath: (path: string | null | undefined) => string | null;
};

// The plan the report builds for a finding: where the code is, where it belongs.
type CtxPlan = {
	before?: { node?: string | null; paths?: string[] } | null;
	after?: { node?: string | null; paths?: string[] } | null;
	relation?: FieldValue;
	repair?: FieldValue;
	remove?: boolean;
};

// The owner node as the context carries it: a slug plus the paths it covers.
type CtxOwner = { slug?: string; path?: string; paths?: string[]; roles?: string[] } | null | undefined;

// The violation as the context carries it: the engine's structured evidence.
type CtxViolation = {
	kind?: string;
	targetNode?: string | null;
	targetPath?: string | null;
	line?: number;
	destination?: string | null;
	token?: RelationToken | null;
} | null | undefined;

type DecisionCtx = {
	finding?: Finding;
	file: string;
	key?: string;
	violation?: CtxViolation;
	ownerNode?: CtxOwner;
	plan?: CtxPlan;
	nodes?: NodeSummary[];
	arch?: Arch;
	invariant?: string | null;
	places: Places;
};

export type { Places, CtxPlan, CtxOwner, CtxViolation, DecisionCtx };

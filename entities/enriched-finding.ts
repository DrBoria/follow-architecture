"use strict";

// THE overview's enriched finding — what the browser renders for one violation.
// DERIVED from the one producer (`enrichFindings`), so the Node builder and the
// browser screens read the same shape. It is plain JSON: the story, the plan,
// the boundary and the repairs all travel through the payload unchanged.

import type { RelationToken } from "./token";
import type { Repair } from "./repair";
import type { Story } from "./story";
import type { Place } from "./place";
import type { Violation } from "../nodes/finally/violation";

// The before/after plan: where the code is, where it belongs, and the relation
// it crossed (if any). `relation` is present only for a refused relation.
type PlanPlace = Place;
type PlanRelation = Place & { kind: string; line: number | null };
type Plan = {
	role: string | null;
	before: PlanPlace | null;
	after: PlanPlace | null;
	target: PlanPlace | null;
	allowedImporters: string[];
	allowedGlobs: string[];
	relation?: PlanRelation;
	repair?: Repair;
	remove?: boolean;
};

// The boundary panel: WHO may reach the node the relation touched. The list is
// the engine's own verdict, never recomputed.
type Boundary = {
	targetNode: string;
	targetPaths: string[];
	ownerNode: string | null;
	ownerPaths: string[];
	summary: string;
	allowed: string[];
};

// The violation the finding carries (the engine's structured evidence) — the
// relation fields of the ONE violation contract, with the token typed as the
// report reads it.
type FindingViolation = Pick<Violation, "kind" | "targetNode" | "targetPath" | "line" | "destination"> & {
	token?: RelationToken | null;
};

type EnrichedFinding = {
	file: string;
	line: number;
	what: string | null;
	rule: string;
	key: string;
	dedupeKey: string;
	category: string;
	title: string;
	message: string;
	engineMessage: string;
	fixOptions: Repair[];
	errorType: string;
	ownerNode: string | null;
	nodeRoles: string[];
	ownerPaths: string[];
	role: string | null;
	invariant: string | null;
	violation: FindingViolation | null;
	boundary: Boundary | null;
	plan: Plan;
	story: Story;
};

export type { PlanPlace, PlanRelation, Plan, Boundary, FindingViolation, EnrichedFinding };

"use strict";

// Findings for the overview: resolve facts, ask errorTypes once, sort. The
// helpers (title, plan, boundary) live in sibling modules; this file assembles
// the enriched finding the browser renders.

import { deepestMatch } from "../../../entities/tree";
import { describe } from "../../errorTypes";
import { fieldOf, type FieldValue } from "../../../utils/field";
import { stringField, recordListField, numberField } from "../../../utils/read-field";
import { titleFor, categoryOf } from "./finding-title";
import { buildPlan } from "./finding-plan";
import { boundaryDetail } from "./finding-boundary";
import type { Arch, ArchNode } from "../../../entities/architecture";
import type { Finding } from "../../../entities/findings";
import type { NodeSummary } from "../../../entities/overview-summaries";
import type { EnrichedFinding, Plan, FindingViolation } from "../../../entities/enriched-finding";
import type { Story } from "../../../entities/story";
import type { Repair } from "../../../entities/repair";

// The violation a finding carries: the first with a kind AND a target path,
// else the first, else none.
const isViolation = (_v: { readonly [key: string]: FieldValue }): _v is FindingViolation => true;

const violationOf = (f: Finding): FindingViolation | null => {
	const violations = recordListField(fieldOf(f, "data"), "violations").filter(isViolation);
	const hit = violations.find((v) => stringField(v, "kind") && stringField(v, "targetPath")) ?? violations[0] ?? null;
	return hit ?? null;
};

const relationOf = (violation: FindingViolation | null): FindingViolation | null =>
	violation && stringField(violation, "kind") ? violation : null;

// The plan with the relation attached (a refused relation has no "after").
const targetOf = (story: Story): { paths: string[] } | null => ("target" in story ? story.target : null);

const withRelation = (plan: Plan, relation: FindingViolation | null, story: Story): Plan => {
	if (!relation) return plan;
	const target = targetOf(story);
	return {
		...plan,
		relation: {
			kind: stringField(relation, "kind"),
			node: stringField(relation, "targetNode") || null,
			// The STORY's target paths are the final answer (the decision maker
			// resolved them); a story with no target names no paths — the raw
			// violation path is only the initial value the story overwrites.
			paths: target?.paths ?? [],
			line: numberField(relation, "line", 0) || null,
		},
	};
};

// The after-card read from the SAME repair the arrows are drawn from. A repair
// may name a PLACE with no box: the card still names it.
const withAfter = (plan: Plan, options: readonly Repair[], nodes: readonly NodeSummary[]): Plan => {
	if (plan.after) return plan;
	const destination = options.find((o) => o.path || o.to.length);
	if (!destination) return plan;
	const slug = destination.to[0] ?? null;
	const path = destination.path ?? nodes.find((n) => n.slug === slug)?.paths[0];
	return { ...plan, after: { node: slug, paths: [path].filter((p): p is string => Boolean(p)) } };
};

// The card says what the REPAIR says: "Delete it" and "nothing moves" are two
// different claims, and the reader is the one who notices.
const withRepair = (plan: Plan, options: readonly Repair[]): Plan => {
	const destination = options.find((o) => o.path || o.to.length);
	const repair = destination ?? options[0] ?? null;
	if (!repair) return plan;
	const next = { ...plan, repair };
	return !plan.after && repair.code === "remove" ? { ...next, remove: true } : next;
};

// A finding about ONE declaration is about the FILE it sits in, not the folder.
const withPiece = (plan: Plan, what: string | null, file: string): Plan =>
	what && plan.before ? { ...plan, before: { ...plan.before, paths: [file] } } : plan;

const rankOf = (f: EnrichedFinding): number => {
	if (f.category === "invariant") return 0;
	return f.category === "codeRole" ? 1 : 2;
};

const destinationOf = (relation: FindingViolation | null, violation: FindingViolation | null, byPath: (rel: string) => ArchNode | null): ArchNode | null => {
	if (relation) return null;
	return violation?.destination ? byPath(violation.destination) : null;
};

// The finding's resolved inputs: its subject, owner, violation, and the plan
// the decision maker reads.
const subjectOf = (f: Finding): { dedupeKey: string; role: string | null; invariant: string | null } => {
	const dedupeKey = stringField(f, "dedupeKey") || stringField(f, "key");
	return {
		dedupeKey,
		role: /^role:([^:]+)/.exec(dedupeKey)?.[1] ?? null,
		invariant: /^invariant:([^:]+)/.exec(dedupeKey)?.[1] ?? null,
	};
};

const targetNodeOf = (relation: FindingViolation | null, violation: FindingViolation | null, bySlug: Map<string, NodeSummary>): NodeSummary | null => {
	if (!relation && violation?.targetNode) return bySlug.get(violation.targetNode) ?? null;
	return null;
};

const boundaryTargetOf = (targetNode: NodeSummary | null, relation: FindingViolation | null, bySlug: Map<string, NodeSummary>): NodeSummary | null =>
	targetNode ?? (relation?.targetNode ? bySlug.get(relation.targetNode) ?? null : null);

const resolveFinding = (args: { f: Finding; arch: Arch; nodes: readonly NodeSummary[]; bySlug: Map<string, NodeSummary>; byPath: (rel: string) => ArchNode | null }) => {
	const { f, arch, nodes, bySlug, byPath } = args;
	const file = stringField(f, "file");
	const ownerNode = byPath(file);
	const { dedupeKey, role, invariant } = subjectOf(f);
	const violation = violationOf(f);
	const relation = relationOf(violation);
	const targetNode = targetNodeOf(relation, violation, bySlug);
	const destination = destinationOf(relation, violation, byPath);
	const plan = buildPlan({ role, ownerNode, destination, targetNode, arch });
	const boundaryTarget = boundaryTargetOf(targetNode, relation, bySlug);
	const meta = describe({ finding: f, file, key: dedupeKey, violation, ownerNode, plan, nodes: [...nodes], arch, invariant });
	return { f, file, ownerNode, dedupeKey, role, invariant, violation, relation, boundaryTarget, meta, nodes, plan };
};

// The plan with the relation, after-card, repair and piece attached — the card
// and the picture read the SAME repair.
const planOf = (resolved: ReturnType<typeof resolveFinding>): Plan => {
	const { meta, relation, nodes, file, f, plan } = resolved;
	let next = withRelation(plan, relation, meta.story);
	next = withAfter(next, meta.options, nodes);
	next = withRepair(next, meta.options);
	return withPiece(next, stringField(f, "what") || null, file);
};

const enrichOne = (args: { f: Finding; arch: Arch; nodes: readonly NodeSummary[]; bySlug: Map<string, NodeSummary>; byPath: (rel: string) => ArchNode | null }): EnrichedFinding => {
	const resolved = resolveFinding(args);
	const { f, file, ownerNode, dedupeKey, role, invariant, violation, boundaryTarget, meta } = resolved;
	const story = meta.story;
	const plan = planOf(resolved);
	const message = meta.message ?? stringField(f, "message");
	const actors = "actors" in story ? story.actors : [];
	const rule = stringField(f, "rule");

	return {
		file,
		line: numberField(fieldOf(f, "pos"), "line", 1),
		what: stringField(f, "what") || null,
		rule,
		key: stringField(f, "key"),
		dedupeKey,
		category: categoryOf(rule),
		title: titleFor({ invariant, role, node: ownerNode?.slug, rule, message }),
		message,
		engineMessage: stringField(f, "message"),
		fixOptions: meta.options,
		errorType: meta.type,
		...ownerFields(ownerNode),
		role,
		invariant,
		violation,
		boundary: boundaryTarget ? boundaryDetail({ ownerNode, targetNode: boundaryTarget, roles: actors }) : null,
		plan,
		story,
	};
};

const ownerFields = (ownerNode: ArchNode | null): { ownerNode: string | null; nodeRoles: string[]; ownerPaths: string[] } => ({
	ownerNode: ownerNode?.slug ?? null,
	nodeRoles: ownerNode?.roles ?? [],
	ownerPaths: ownerNode ? [ownerNode.path] : [],
});

const enrichFindings = (args: { findings: readonly Finding[]; arch: Arch; nodes: readonly NodeSummary[] }): EnrichedFinding[] => {
	const { findings, arch, nodes } = args;
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));
	const byPath = (rel: string): ArchNode | null => deepestMatch(rel, arch)?.node ?? null;
	const list = findings.map((f) => enrichOne({ f, arch, nodes, bySlug, byPath }));
	return list.sort((a, b) => rankOf(a) - rankOf(b) || a.file.localeCompare(b.file) || a.line - b.line);
};

export { enrichFindings };

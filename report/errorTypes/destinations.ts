"use strict";

// WHERE THIS CODE BELONGS — the destination decision, split from the decision
// maker so each file stays small. The decision maker (`../decision-maker`)
// calls `decide` once per story; the type modules render the destinations it
// chose, never pick one.
//
//   input    several INDEPENDENT SOURCES, each answering its own question about
//            the SAME candidate role (tree / piece / name / place / branch),
//            plus one GATE: may that role perform the relation at all?
//   process  each source is a SIGNAL (0..1), the CODE ROLE carries most of the
//            weight, and a decision needs ENOUGH of them
//   output   ONE object per candidate, same keys every time, best first, max 3.
//
// The rule the linter enforces is "everything not allowed is forbidden", so a
// permission is a precondition, never a percentage.

import { leafOf, type Resolved } from "../../entities/location";
import { rankedOffers } from "../../utils/rank";
import { stringListField } from "../../utils/read-field";
import { fieldOf } from "../../utils/field";
import type { DecisionCtx, Places } from "../../entities/decision-ctx";
import type { Story, Destination } from "../../entities/story";

// Priority order; the weights sum to 1, so confidence is a 0..1 number.
// THE CODE ROLE IS THE DECISION (0.75 of the total). Everything else confirms it.
const DEFAULT_WEIGHTS = {
	declared: 0.45,
	inferred: 0.3,
	named: 0.13,
	hostable: 0.07,
	branch: 0.05,
};

// NOT a weight: a PRECONDITION. A place where the relation is still forbidden
// does not repair anything — it is not a destination at all.
const REQUIRES = ["permits"];

// Fewer sources than this and the decision is a guess, whatever the sum says.
const MIN_EVIDENCE = 2;

// The code role has to BE known: without it there is nothing to move.
const ROLE_SOURCES = ["declared", "inferred"];

// Below this a role is a coincidence, not a destination.
const DEFAULT_THRESHOLDS = { move: 0.5 };

const KEYS = ["declared", "inferred", "named", "hostable", "branch"] as const;
type SignalKey = (typeof KEYS)[number];
type Signals = Record<SignalKey | "permits", number>;
type Weights = Record<SignalKey, number>;
type Thresholds = { move: number };

const round = (n: number): number => Math.round(n * 1000) / 1000;

const branchOf = (p: string | null | undefined): string => String(p ?? "").split("/")[0] ?? "";

const resolveWeights = (override: Partial<Weights> | null | undefined): Weights => ({ ...DEFAULT_WEIGHTS, ...(override ?? {}) });
const resolveThresholds = (override: Partial<Thresholds> | null | undefined): Thresholds => ({ ...DEFAULT_THRESHOLDS, ...(override ?? {}) });

// The home a candidate role offers for this file: the box and path the ONE
// place answer carries (`Resolved`), plus whether the place can exist today.
type Home = Resolved & { concrete: boolean };

// The SOURCES, read once per candidate role. Each returns 0 or 1: these are
// facts, not guesses, and the weight is what makes one matter more than another.
const collect = (args: { role: string; rel: string; home: Home | null; templates: string[]; here: string[]; inferred: string[]; permits: string[] }): Signals => {
	const { role, rel, home, templates, here, inferred, permits } = args;
	const relLeaf = leafOf(rel).segments.at(-1);
	return {
		declared: here.includes(role) ? 1 : 0,
		inferred: inferred.includes(role) ? 1 : 0,
		named: templates.some((t) => leafOf(t).segments.at(-1) === relLeaf) ? 1 : 0,
		hostable: home?.concrete ? 1 : 0,
		branch: templates.some((t) => branchOf(t) === branchOf(rel)) ? 1 : 0,
		// The gate, not a score.
		permits: permits.includes(role) ? 1 : 0,
	};
};

// The inputs that come from the ENGINE (not from the tree): what the tree says
// this FILE is, what the engine made of the CODE, and who may do the relation.
const engineInputs = (story: Story, ctx: DecisionCtx, places: Places, rel: string) => ({
	here: [...new Set(ctx.ownerNode?.roles ?? places.rolesAtPath(rel))].filter(Boolean),
	inferred: [...new Set(stringListField(fieldOf(story, "subject"), "roles").concat(stringListField(fieldOf(story, "token"), "subject.roles")))].filter(Boolean),
	permits: [...new Set(stringListField(fieldOf(story, "token"), "why.roles"))].filter(Boolean),
});

// Each source's weighted contribution, named so a percentage is explainable.
// The record is the weights map with each value scaled by its signal — the ONE
// key set (`Weights`), never a second copy of the keys.
const contributionsOf = (signals: Signals, weights: Weights): Weights => {
	const out = { ...weights };
	for (const k of KEYS) out[k] = round(signals[k] * weights[k]);
	return out;
};

// The score a candidate's signals earn, or null when it is not a destination:
// the relation still forbidden, the code role unknown, or too little evidence.
const scoreCandidate = (signals: Signals, weights: Weights, thresholds: Thresholds): { confidence: number; evidence: string[]; contributions: Weights } | null => {
	if (REQUIRES.some(() => !signals.permits)) return null;
	if (!ROLE_SOURCES.some((k) => signals[k === "declared" ? "declared" : "inferred"])) return null;
	const contributions = contributionsOf(signals, weights);
	const confidence = round(KEYS.reduce((sum, k) => sum + contributions[k], 0));
	const evidence = KEYS.filter((k) => signals[k] > 0);
	if (confidence < thresholds.move || evidence.length < MIN_EVIDENCE) return null;
	return { confidence, evidence, contributions };
};

// Every contribution is named, so a percentage is explainable.
const reasonOf = (confidence: number, signals: Signals, evidence: string[]): string =>
	`confidence ${confidence.toFixed(2)} (${KEYS.map((k) => `${k} ${signals[k].toFixed(2)}`).join(", ")}, evidence ${evidence.join("+")})`;

type CandidateArgs = { role: string; rel: string; story: Story; places: Places; here: string[]; inferred: string[]; permits: string[]; weights: Weights; thresholds: Thresholds };
type Scored = { confidence: number; evidence: string[]; contributions: Weights };

// A home the code can MOVE to: a real box and path, not the file's own place,
// and not the box the finding already names.
const movableHome = (home: Home | null, rel: string, from: string | null): home is Home =>
	Boolean(home?.node) && Boolean(home?.path) && home.path !== rel && home.node !== from;

// The destination object one scored candidate earns — same keys every time.
const destinationOf = (ask: { role: string; home: Home; scored: Scored; signals: Signals; thresholds: Thresholds; weights: Weights }): Destination => ({
	role: ask.role,
	node: ask.home.node,
	path: ask.home.path,
	confidence: ask.scored.confidence,
	tier: "move",
	reason: reasonOf(ask.scored.confidence, ask.signals, ask.scored.evidence),
	signals: ask.signals,
	contributions: ask.scored.contributions,
	evidence: ask.scored.evidence,
	thresholds: ask.thresholds,
	weights: ask.weights,
});

// One candidate's decision, or null when it is not a destination: no movable
// home, or the score below the bar.
const candidateDecision = (args: CandidateArgs): Destination | null => {
	const { role, rel, story, places, here, inferred, permits, weights, thresholds } = args;
	const home = places.homeFor(role, rel);
	if (!movableHome(home, rel, story.from)) return null;
	const signals = collect({ role, rel, home, templates: places.homeTemplates(role), here, inferred, permits });
	const scored = scoreCandidate(signals, weights, thresholds);
	return scored ? destinationOf({ role, home, scored, signals, thresholds, weights }) : null;
};

/**
 * → [{ role, node, path, confidence, tier, reason, signals, contributions,
 *      evidence, thresholds, weights }] best first, max 3.
 *
 * Empty when there is no tree to ask, when the code already sits where its role
 * lives, when the code's own role is unknown, or when the relation stays
 * forbidden at the candidate's place.
 */
type Tuning = { weights?: Partial<Weights>; thresholds?: Partial<Thresholds> };
type EngineInputs = ReturnType<typeof engineInputs>;

// One role's offer: the candidate question with the three engine lists folded
// into ONE `inputs` bag (derived from CandidateArgs, so the two never drift).
type OfferAsk = Omit<CandidateArgs, "role" | "here" | "inferred" | "permits"> & { inputs: EngineInputs };
const offerFor = (role: string, ask: OfferAsk): Destination | null =>
	candidateDecision({ role, rel: ask.rel, story: ask.story, places: ask.places, here: ask.inputs.here, inferred: ask.inputs.inferred, permits: ask.inputs.permits, weights: ask.weights, thresholds: ask.thresholds });

// Best first: higher confidence, then the role's own name for a stable order.
const byConfidence = (a: Destination, b: Destination): number => {
	const diff = b.confidence - a.confidence;
	return diff !== 0 ? diff : a.role.localeCompare(b.role);
};

// The decision once the tree is ready: score every candidate role, keep the
// ones that earn a move, rank best first. The score-keep-rank walk is the shared
// `rankedOffers` core; the scoring policy (sources, gate, bar) is this module's.
const decideReady = (ask: { story: Story; ctx: DecisionCtx; places: Places; rel: string; tuning?: Tuning }): Destination[] => {
	const { story, ctx, places, rel, tuning } = ask;
	const inputs = engineInputs(story, ctx, places, rel);
	const weights = resolveWeights(tuning?.weights);
	const thresholds = resolveThresholds(tuning?.thresholds);
	const offer = (role: string): Destination | null => offerFor(role, { rel, story, places, inputs, weights, thresholds });
	return rankedOffers(places.roles(), offer, byConfidence).slice(0, 3);
};

const decide = (args: { story: Story; ctx: DecisionCtx; tuning?: Tuning }): Destination[] => {
	const { story, ctx, tuning } = args;
	const places = ctx.places;
	const rel = ctx.file;
	return places?.homeFor && rel ? decideReady({ story, ctx, places, rel, tuning }) : [];
};

export { decide, resolveWeights, resolveThresholds, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS };

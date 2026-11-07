"use strict";

// THE decision maker — one file, three jobs, in this order:
//
//   1. WHICH KIND of finding this is  (`TYPES`, first claim wins);
//   2. WHAT the reader is told         (`message`) and WHAT THEY CAN DO
//                                      (`options`, one shape for all of them);
//   3. WHERE the code belongs          (`decide`, the move destination).
//
// Both representations read only its output:
//
//   report/cli-report.js          text  ← view.message + view.options[].text
//   user-report/src/graph/        graph ← view.story + view.options[].to
//
// Nothing downstream re-decides anything, so the sentence and the picture cannot
// disagree: an option with three destinations IS three arrows and three lines.

const { make } = require("./vocabulary/places");
const ids = require("./vocabulary/ids");

const wrongAction = require("./types/wrongAction");
const wrongPlacement = require("./types/wrongPlacement");
const unknownRole = require("./types/unknownRole");
const fileContents = require("./types/fileContents");

// Order is the decision: the first type that claims the finding wins, and
// fileContents claims everything, so it stays last.
const TYPES = [wrongAction, wrongPlacement, unknownRole, fileContents];

// ---------------------------------------------------------------------------
// WHERE THIS CODE BELONGS — a decision, in the same shape as every other
// decision maker in these packages:
//
//   input    several INDEPENDENT SOURCES, each answering its own question about
//            the SAME candidate role:
//              1. the tree      — is this file already that role?
//              2. the piece     — did the engine infer that role for the code?
//              3. the name      — does a home of that role name this file?
//              4. the place     — does that home exist (a real node instance)?
//              5. the branch    — is that home in the file's own top branch?
//            plus one GATE (not a source): may that role perform the relation
//            at all? A place where the rule still forbids it repairs nothing.
//   process  each source is a SIGNAL (0..1), the CODE ROLE carries most of the
//            weight, and a decision needs ENOUGH of them
//   output   ONE object per candidate, same keys every time:
//            { role, node, path, confidence, tier, reason, signals,
//              contributions, evidence, thresholds, weights }
//
// The rule the linter enforces is "everything not allowed is forbidden", so a
// permission is a precondition, never a percentage: `testCode` may call an
// action, and that says nothing about where production code belongs.
// ---------------------------------------------------------------------------

// Priority order; the weights sum to 1, so confidence is a 0..1 number.
//
// THE CODE ROLE IS THE DECISION (0.75 of the total). Everything else only
// confirms it:
const DEFAULT_WEIGHTS = {
	// The tree already calls this file that role.
	declared: 0.45,
	// The engine inferred that role from the code itself (its shape, not its path).
	inferred: 0.3,
	// A home of that role names exactly this file (`…/constants.ts`).
	named: 0.13,
	// The home exists: a real node instance can host it today.
	hostable: 0.07,
	// The home is in the file's own top-level branch.
	branch: 0.05,
};

// NOT a weight: a PRECONDITION. The linter's rule is "everything not allowed is
// forbidden", so a place where the relation is still forbidden does not repair
// anything — it is not a destination at all, whatever the rest of the signals
// say. That is why "who may do this" is a gate here and never a percentage:
// a permission says the move would be legal, not that it is right.
const REQUIRES = ["permits"];

// Fewer sources than this and the decision is a guess, whatever the sum says.
const MIN_EVIDENCE = 2;

// The code role has to BE known: "this is a test", "this is an action". Without
// it there is nothing to move — only a guess about someone else's code.
const ROLE_SOURCES = ["declared", "inferred"];

// Below this a role is a coincidence, not a destination.
const DEFAULT_THRESHOLDS = { move: 0.5 };

const KEYS = ["declared", "inferred", "named", "hostable", "branch"];

const round = (n) => Math.round(n * 1000) / 1000;

const { leafOf } = require("../../entities/location");
const branchOf = (p) => String(p ?? "").split("/")[0] ?? "";

const resolveWeights = (override) => ({ ...DEFAULT_WEIGHTS, ...(override ?? {}) });
const resolveThresholds = (override) => ({ ...DEFAULT_THRESHOLDS, ...(override ?? {}) });

// The SOURCES, read once per candidate role. Each returns 0 or 1: these are
// facts, not guesses, and the weight is what makes one matter more than another.
const collect = ({ role, rel, home, templates, here, inferred, permits }) => ({
	declared: here.includes(role) ? 1 : 0,
	inferred: inferred.includes(role) ? 1 : 0,
	named: templates.some((t) => leafOf(t).segments.at(-1) === leafOf(rel).segments.at(-1)) ? 1 : 0,
	hostable: home?.concrete ? 1 : 0,
	branch: templates.some((t) => branchOf(t) === branchOf(rel)) ? 1 : 0,
	// The gate, not a score.
	permits: permits.includes(role) ? 1 : 0,
});

/**
 * → [{ role, node, path, confidence, tier, reason, signals, contributions,
 *      evidence, thresholds, weights }] best first, max 3.
 *
 * Empty when there is no tree to ask, when the code already sits where its role
 * lives (nothing to move), when the code's own role is unknown, or when the
 * relation stays forbidden at the candidate's place.
 */
const decide = ({ story, ctx, tuning } = {}) => {
	const places = ctx?.places;
	const rel = ctx?.file;
	if (!places?.homeFor || !rel) return [];

	// The inputs that come from the ENGINE (not from the tree):
	//   here      what the tree says this FILE is — the owner node's own roles
	//   inferred  what the engine made of the CODE (the piece's roles)
	//   permits   the GATE above: who may perform the relation at all
	const here = [...new Set(ctx?.ownerNode?.roles ?? places.rolesAtPath(rel) ?? [])].filter(Boolean);
	const inferred = [...new Set(story.subject?.roles ?? story.token?.subject?.roles ?? [])].filter(Boolean);
	const permits = [...new Set(story.token?.why?.roles ?? [])].filter(Boolean);

	const weights = resolveWeights(tuning?.weights);
	const thresholds = resolveThresholds(tuning?.thresholds);
	const out = [];

	for (const role of places.roles()) {
		const home = places.homeFor(role, rel);
		// No box, no arrow — and a home the file already occupies is not a move.
		if (!home?.node || !home.path || home.path === rel) continue;
		if (home.node === story.from) continue;

		const signals = collect({ role, rel, home, templates: places.homeTemplates(role), here, inferred, permits });

		// The gate: the move must actually repair the finding.
		if (REQUIRES.some((k) => !signals[k])) continue;
		// The code role must be known — this is what the move is based on.
		if (!ROLE_SOURCES.some((k) => signals[k])) continue;

		const contributions = Object.fromEntries(KEYS.map((k) => [k, round(signals[k] * weights[k])]));
		const confidence = round(KEYS.reduce((sum, k) => sum + contributions[k], 0));
		const evidence = KEYS.filter((k) => signals[k] > 0);

		const tier = confidence >= thresholds.move && evidence.length >= MIN_EVIDENCE ? "move" : null;
		if (!tier) continue;

		out.push({
			role,
			node: home.node,
			path: home.path,
			confidence,
			tier,
			// Every contribution is named, so a percentage is explainable.
			reason: `confidence ${confidence.toFixed(2)} (${KEYS.map((k) => `${k} ${signals[k].toFixed(2)}`).join(", ")}, evidence ${evidence.join("+")})`,
			signals,
			contributions,
			evidence,
			thresholds,
			weights,
		});
	}

	return out
		.sort((a, b) => b.confidence - a.confidence || String(a.role).localeCompare(String(b.role)))
		.slice(0, 3);
};

// ---------------------------------------------------------------------------

/**
 * ctx = { finding, file, key, violation, ownerNode, plan, nodes, arch, invariant }
 *
 * → { type, label, story, message, options }
 *
 *   story        what the finding is about (nodes + script of the picture), plus
 *                `destinations` — the decision above, already made
 *   message      the sentence the reader sees
 *   options      [{ code, text, to }] — code is the repair kind (`remove`,
 *                `move`, `split`, `delete`, `rules`), `to` are the boxes it
 *                lands in, `text` is the line printed for it
 */
const describe = (ctx) => {
	const places = make(ctx);
	const full = { ...ctx, places };
	for (const type of TYPES) {
		const story = type.classify(full, places);
		if (!story) continue;
		// WHERE the code belongs is decided HERE, once, for every type: the type
		// module renders a destination, it never picks one.
		story.destinations = decide({ story, ctx: full });
		return {
			type: type.id,
			label: type.label,
			story,
			message: type.message(story, full) ?? null,
			options: normalize(type.fixes(story, full)),
		};
	}
	return {
		type: ids.FILE_CONTENTS,
		label: fileContents.label,
		story: { type: ids.FILE_CONTENTS, from: null, to: [] },
		message: null,
		options: [],
	};
};

// One shape for every option, whatever produced it: an old string-returning type
// cannot reintroduce a second format.
const normalize = (list) =>
	(list ?? [])
		.filter(Boolean)
		.map((o) => (typeof o === "string" ? { code: "rules", to: [], from: null, path: null, text: o } : { code: o.code ?? "rules", to: o.to ?? [], from: o.from ?? null, path: o.path ?? null, text: String(o.text ?? "") }))
		.filter((o) => o.text);

module.exports = { describe, TYPES, normalize, decide, resolveWeights, resolveThresholds, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS };

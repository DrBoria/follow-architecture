"use strict";

// THE decision maker — one file, three jobs, in this order:
//
//   1. WHICH KIND of finding this is  (`TYPES`, first claim wins);
//   2. WHAT the reader is told         (`message`) and WHAT THEY CAN DO
//                                      (`options`, one shape for all of them);
//   3. WHERE the code belongs          (`decide`, in ./destinations).
//
// Both representations read only its output:
//
//   report/cli-report.ts          text  ← view.message + view.options[].text
//   user-report/src/graph/        graph ← view.story + view.options[].to
//
// Nothing downstream re-decides anything, so the sentence and the picture cannot
// disagree: an option with three destinations IS three arrows and three lines.

import { make } from "./vocabulary/places";
import * as ids from "./vocabulary/ids";
import { decide, resolveWeights, resolveThresholds, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from "./destinations";
import { normalizeRepairs, type StatedRepair } from "../../entities/repair";
import type { DecisionCtx } from "../../entities/decision-ctx";
import type { Arch } from "../../entities/architecture";
import type { Story, Described } from "../../entities/story";
import type { FindingType } from "./finding-type";

import * as wrongAction from "./types/wrongAction";
import * as wrongPlacement from "./types/wrongPlacement";
import * as unknownRole from "./types/unknownRole";
import * as fileContents from "./types/fileContents";

// Order is the decision: the first type that claims the finding wins, and
// fileContents claims everything, so it stays last.
const TYPES: FindingType[] = [wrongAction, wrongPlacement, unknownRole, fileContents];

// One shape for every option, whatever produced it: an old string-returning type
// cannot reintroduce a second format. The walk lives in `entities/repair`.
const normalize = (list: readonly (string | StatedRepair | null | undefined)[] | null | undefined): ReturnType<typeof normalizeRepairs> => normalizeRepairs(list);

/**
 * ctx = { finding, file, key, violation, ownerNode, plan, nodes, arch, invariant }
 *
 * → { type, label, story, message, options }
 *
 *   story        what the finding is about (nodes + script of the picture), plus
 *                `destinations` — the decision above, already made
 *   message      the sentence the reader sees
 *   options      [{ code, text, to }] — code is the repair kind, `to` are the
 *                boxes it lands in, `text` is the line printed for it
 */
const describe = (ctx: Omit<DecisionCtx, "places"> & { arch: Arch }): Described => {
	const places = make({ nodes: ctx.nodes ?? [], arch: ctx.arch });
	const full: DecisionCtx = { ...ctx, places };
	for (const type of TYPES) {
		const story = type.classify(full, places);
		if (!story) continue;
		// WHERE the code belongs is decided HERE, once, for every type: the type
		// module renders a destination, it never picks one.
		const withDestinations: Story = { ...story, destinations: decide({ story, ctx: full }) };
		return {
			type: type.id,
			label: type.label,
			story: withDestinations,
			message: type.message(withDestinations, full) ?? null,
			options: normalize(type.fixes(withDestinations, full)),
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

export { describe, TYPES, normalize, decide, resolveWeights, resolveThresholds, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS };

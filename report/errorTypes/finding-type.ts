"use strict";

// THE finding type — one module per kind of problem, each answering the same
// four questions about a finding. The decision maker tries them in declared
// order; the first whose `classify` claims the finding wins, and its `message`
// / `fixes` are the wording the two representations read.
//
//   classify  is this finding MINE? → a story, or null
//   message   the sentence the reader sees (or null to keep the engine's own)
//   fixes     the repairs, as objects the picture draws
//
// A type module renders a destination, it never picks one — the decision maker
// decides WHERE the code belongs, once, for every type.

import type { DecisionCtx, Places } from "../../entities/decision-ctx";
import type { Story } from "../../entities/story";
import type { StatedRepair } from "../../entities/repair";

type FindingType = {
	id: string;
	label: string;
	classify: (ctx: DecisionCtx, places: Places) => Story | null;
	message: (story: Story, ctx: DecisionCtx) => string | null;
	fixes: (story: Story, ctx: DecisionCtx) => (StatedRepair | string | null)[];
};

export type { FindingType };

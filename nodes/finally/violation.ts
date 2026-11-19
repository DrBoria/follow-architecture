"use strict";

// THE violation — what a structure check states before it becomes a finding.
// One shape, shared by the child-query check, the relation check and the
// emitter: the line, the sentence, and (for a relation) the structured token
// the report draws. DERIVED from the emitter's own reading would be circular;
// this is the contract the producers write and `emit.ts` reads.

import type { FieldValue } from "../../utils/field";

type Violation = {
	line: number;
	text: string;
	fix?: string | null;
	ask?: string | null;
	kind?: string;
	role?: string | null;
	names?: string[];
	where?: string | null;
	owning?: string | null;
	targetNode?: string | null;
	targetPath?: string | null;
	destination?: string | null;
	token?: FieldValue;
};

export type { Violation };
"use strict";

// THE facts a structure verdict reads — what the tree check states about an
// entry the folder does not declare. ONE shape, shared by the producer
// (`entities/tree/entries`) and the renderer (`errorTypes/codes/structure`), so
// the facts the check states and the facts the sentence reads can never drift.

type StructureFacts = {
	asDir?: boolean;
	dest?: string | null;
	duplicate?: string | null;
	homeHere?: string[];
	roles?: string[];
	held?: string[];
	named?: string;
	seen?: string;
};

export type { StructureFacts };

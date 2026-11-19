"use strict";

// The repair vocabulary — ONE table for the picture. A repair's `code` reads
// as the word that goes IN the box (`verb`) and as the clause the caption
// completes ("this code is …", `phrase`). The same codes `report/asks` writes
// its sentences from; a code the table does not name reads as itself.

type RepairWord = { verb: string; phrase: string };

const REPAIR_WORDS: Record<string, RepairWord> = {
	move: { verb: "move", phrase: "moved" },
	remove: { verb: "delete", phrase: "deleted where it stands" },
	split: { verb: "split", phrase: "split into the parts it is made of" },
	rewrite: { verb: "rewrite", phrase: "rewritten where it stands" },
	merge: { verb: "merge", phrase: "merged into the file it duplicates" },
	add: { verb: "create", phrase: "created" },
	// `role` is the rule saying "nothing declares what this code IS": the
	// answer is to declare it (or delete it), and no box changes.
	role: { verb: "declare", phrase: "not declared as any kind of code — give it its kind, or delete it" },
};

// The word in the box for a repair code (the code itself when unnamed).
const verbFor = (code: string): string => REPAIR_WORDS[code]?.verb ?? code;

// The caption clause for a repair code (the code itself when unnamed).
const phraseFor = (code: string): string => REPAIR_WORDS[code]?.phrase ?? code;

// `remove` and `role` are both "this must not stay as it is": the box is
// crossed out. `split`/`rewrite` keep the box — the code stays, in pieces.
const crossesBox = (code: string): boolean => code === "remove" || code === "role";

export { REPAIR_WORDS, verbFor, phraseFor, crossesBox };

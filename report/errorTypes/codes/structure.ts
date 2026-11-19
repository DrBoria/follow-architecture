"use strict";

// structure.* codes: this entry does not belong in this folder. Each code is a
// pair of sentence templates (message + fix) over the SAME facts the tree check
// states; `choose` picks the code by the facts, `render` fills the templates.

import { leafOf } from "../../../entities/location";

import type { StructureFacts } from "../../../entities/structure-facts";

type StructureCode = { ask: string; message: (f: StructureFacts) => string; fix: (f: StructureFacts) => string };

const held = (f: StructureFacts): string => f.held?.[0] ?? f.named ?? "";

const CODES: Record<string, StructureCode> = {
	// The fallback: the entry is not declared, and no destination is certain.
	"structure.entry": {
		ask: "role",
		message: (f) => `\`{basename}\` is not an entry this folder declares.${f.seen ?? ""}`,
		// A file the tree does not name has no home and no kind: the fix is to
		// declare it (the folder's own list is right there) or to move it where it
		// is declared. `null` here printed a card with nothing to do.
		fix: (f) =>
			`Move what \`{basename}\` holds into ${f.named ? `\`${f.named}\`` : "the files this folder declares"}, or delete it: this folder has no place for it.`,
	},

	// A DIRECTORY: its contents have a home, the directory itself does not.
	"structure.directory": {
		ask: "move",
		message: (f) => `\`{basename}\` is not an entry this folder declares.${f.seen ?? ""}${f.held?.length ? ` What it holds is \`${f.held[0]}\` code.` : ""}`,
		fix: (f) =>
			`Move what \`{basename}/\` holds ${f.dest ? `into \`${f.dest}\`` : `into the files this folder declares (${f.named})`}, then delete the directory.`,
	},

	// One certain destination: the entry belongs there, whole.
	"structure.belongs-in": {
		ask: "move",
		message: (f) => `\`{basename}\` belongs in \`${f.dest}\`.${f.seen ?? ""} It holds a \`${held(f)}\`.`,
		fix: (f) => `Move \`{basename}\` to \`${f.dest}\`.`,
	},

	// A second copy of a file that already lives here.
	"structure.duplicate": {
		ask: "remove",
		message: (f) =>
			`\`{basename}\` is not an entry this folder declares.${f.seen ?? ""} It duplicates \`${leafOf(f.duplicate).segments.at(-1)}\` — one file per folder, and this is a second copy.`,
		fix: (f) => `Merge \`{basename}\` into \`${f.duplicate}\` and delete \`{basename}\`.`,
	},

	// The folder is right and the NAME is not.
	"structure.rename": {
		ask: "move",
		message: (f) =>
			`\`{basename}\` is not an entry this folder declares.${f.seen ?? ""} The folder is right, the name is not: this folder may hold \`${f.named}\`.`,
		fix: (f) => `Rename \`{basename}\` to \`${f.named}\`.`,
	},

	"structure.role-no-home": {
		ask: "role",
		message: (f) =>
			`\`{basename}\` is not an entry this folder declares.${f.seen ?? ""} It holds a \`${f.roles?.[0]}\`, and that role has no declared home — the architecture names no destination for this file.`,
		fix: () => `Delete it: the code in here belongs to no place the tree has, so there is nothing to move it into.`,
	},

	"structure.contents": {
		ask: "move",
		message: (f) => `\`{basename}\` is not an entry this folder declares.${f.seen ?? ""} Nothing in it belongs to a role this folder holds.`,
		fix: (f) => `Move what \`{basename}\` holds into the files this folder declares (${f.named}), then delete \`{basename}\`.`,
	},
};

// The code the facts earn, first claim wins: a directory, a certain destination,
// a duplicate, a rename, a homeless role, else the folder's contents.
const choose = (facts: StructureFacts): string => {
	if (facts.asDir) return "structure.directory";
	if (facts.dest) return "structure.belongs-in";
	if (facts.duplicate) return "structure.duplicate";
	if (facts.homeHere?.length) return "structure.rename";
	if (facts.roles?.length) return "structure.role-no-home";
	return "structure.contents";
};

const codeOf = (id: string): StructureCode => CODES[id] ?? CODES["structure.entry"];

const render = (id: string, facts: StructureFacts): { code: string; ask: string; message: string; fix: string } => {
	const code = codeOf(id);
	return { code: id, ask: code.ask, message: code.message(facts), fix: code.fix(facts) };
};

export { choose, render, CODES };

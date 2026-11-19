// The problem is in what this file HOLDS — but "holds" is not always "stays
// here": a structure finding that says `Move segments.ts to …/actions` is a
// MOVE, and a `no-factories` finding is a DELETION. The picture reads the same
// repair the text prints (one options array for both), so a sentence with a
// destination gets an arrow to it and a sentence that deletes gets a cross —
// never a lone box with no explanation.

import { ids } from "../ids";
import { phraseFor } from "./repair-words";
import { repairOf, noRepairView, sameFolderView, moveView, codeOnlyView } from "./file-views";
import type { Representation, Scene, Built } from "./contract";
import type { Repair } from "../../../../../entities/repair";

// The picture a stated repair earns: a destination in the same folder, a move
// to another box, or a code with no place.
const repairView = (finding: Scene["finding"], owner: string, repair: Repair): Built => {
	const place = repair.path ?? null;
	if (repair.to?.length && repair.to[0] === owner && place) return sameFolderView(finding, place, owner);
	if (repair.to?.length) return moveView(owner, repair);
	return codeOnlyView(finding, owner, repair);
};

const build = ({ finding, story, options }: Scene): Built => {
	const repair = repairOf(options);
	const owner = finding.ownerNode;
	if (!repair && (story?.from || owner)) return noRepairView(owner ?? story.from ?? "");
	if (repair?.code && owner) return repairView(finding, owner, repair);
	return { edges: [], marks: {}, only: [owner].filter((o): o is string => Boolean(o)) };
};

// The caption for a stated repair: a destination reads as a move, a `remove`
// names the same subject the box does, any other code completes "this code is …".
// A removal names the same subject the box does: one helper going away is not
// the folder going away.
const removeCaption = (finding: Scene["finding"], owner: string | null): string =>
	finding.what
		? `✕ \`${finding.what}\` (\`${finding.file}:${finding.line}\`) goes away — the file and the folder around it stay.`
		: `✕ nothing of this may stay: \`${owner ?? finding.file}\` holds code that goes away.`;

// A destination reads as a move: the same folder (a different file) or another box.
const moveCaption = (finding: Scene["finding"], owner: string | null, repair: Repair): string => {
	if (owner && repair.to[0] === owner && repair.path) {
		return `✕ the code is in \`${finding.file}\`; ✓ it belongs at \`${repair.path}\` — the same folder, a different file: nothing moves between folders, this file becomes that place.`;
	}
	return `✕ the code is in \`${owner}\`; ✓ \`${repair.path ?? repair.to[0]}\` is where it belongs.`;
};

const repairCaption = (finding: Scene["finding"], owner: string | null, repair: Repair): string => {
	if (repair.to?.length) return moveCaption(finding, owner, repair);
	if (repair.code === "remove") return removeCaption(finding, owner);
	return `\`${finding.file}\` — nothing moves between boxes: this code is ${phraseFor(repair.code)}, so the change is inside the file itself.`;
};

const caption = ({ finding, story, options }: Scene): string => {
	const repair = repairOf(options);
	const owner = finding.ownerNode;
	if (!repair && (story?.from || owner)) {
		return `✕ \`${finding.file}\` holds code no rule in the architecture describes: give that code its kind, or delete it — nothing else may live in this shape.`;
	}
	if (repair?.code) return repairCaption(finding, owner, repair);
	return owner
		? `node \`${owner}\` — the problem is in what this file holds, and the repair changes the code rather than moving it.`
		: "no declared node owns this file.";
};

const fileContents: Representation = {
	key: ids.FILE_CONTENTS,
	title: "What's the problem",
	handles: () => true,
	build,
	caption,
};

export { fileContents };

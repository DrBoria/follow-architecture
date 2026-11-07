import { ids } from "../ids";
import { fileName } from "../../utils/format";

// The problem is in what this file HOLDS — but "holds" is not always "stays
// here": a structure finding that says `Move segments.ts to …/actions` is a
// MOVE, and a `no-factories` finding is a DELETION. The picture reads the same
// repair the text prints (one options array for both), so a sentence with a
// destination gets an arrow to it and a sentence that deletes gets a cross —
// never a lone box with no explanation.
const repairOf = (options) => (options ?? []).find((o) => o.to?.length) ?? (options ?? [])[0] ?? null;

// The four things a repair may ask for, as the word that goes IN the box. One
// vocabulary, the same one `report/asks.js` writes its sentences from.
const VERB = { move: "move", remove: "delete", split: "split", rewrite: "rewrite", merge: "merge", add: "create", role: "declare" };

// A PLACE drawn as a box of its own: the file, named by its own segment, inside
// the node that holds it. The architecture graph draws NODES; a move between two
// files of one folder is still a move, so the two files are boxes here.
const placeSlug = (path) => `place:${path}`;
const placeNode = (slug, path, owner) => {
	// The box says the FILE (`store.ts`), not the path again: the folder is the same
	// on both sides, so repeating it in two wide boxes pushed the one word that
	// differs off the edge.
	const file = fileName(path);
	return { slug, name: file, paths: [file], file, parents: owner ? [owner] : [], children: [] };
};

export const fileContents = {
	key: ids.FILE_CONTENTS,
	title: "What's the problem",
	handles: () => true,
	build: ({ finding, story, options }) => {
		const repair = repairOf(options);
		const owner = finding.ownerNode;
		// NO OPTION AT ALL — the finding is the story itself: "this piece's kind is
		// not declared anywhere", "this file holds code nothing describes". There is
		// no repair to read, and the picture used to fall through to a bare blue box
		// with no mark, no word and no caption. The box IS the verdict here: the code
		// is in the wrong shape where it stands.
		if (!repair && (story?.from || owner)) {
			const box = owner ?? story.from;
			return { edges: [], marks: { [box]: "wrong" }, only: [box], action: { [box]: "declare or delete" } };
		}
		// A destination: one arrow per box, the source crossed and each landing
		// point ticked — the same marks a placement finding uses.
		if (repair?.to?.length && owner) {
			const place = repair.path ?? null;
			// The place may be inside the box the code is ALREADY in (`store.ts` of
			// the same feature): there is no second box to draw, and inventing one
			// drew the same folder twice with a `MOVE` label between them. The one
			// box then names the file it should become, and the arrow count is zero.
			if (repair.to[0] === owner && place) {
				// The destination is a FILE in the box the code is already in. Two boxes
				// still, because the reader asked one question — "from where, to where" —
				// and one box cannot answer it: the FILE it is now and the FILE it becomes,
				// drawn as the two places they are.
				const from = placeSlug(finding.file);
				const to = placeSlug(place);
				return {
					edges: [{ from, to, kind: "move", broken: true }],
					marks: { [from]: "wrong", [to]: "right" },
					only: [from, to],
					extra: [placeNode(from, finding.file, owner), placeNode(to, place, owner)],
				};
			}
			const marks = { [owner]: "wrong" };
			for (const to of repair.to) if (to !== owner) marks[to] = "right";
			return { edges: repair.to.filter((to) => to !== owner).map((to) => ({ from: owner, to, kind: "move", broken: true })), marks, only: [owner] };
		}
		// NO PLACE AT ALL — but the rule still SAID what it wants (`code`). A repair
		// with no destination is not an empty picture: the code is split, rewritten
		// or deleted where it stands, and the box says which. Without this the box
		// was a blue rectangle whose caption read "the repair names no place", which
		// tells the reader nothing about the finding they just opened.
		if (repair?.code && owner) {
			const verb = VERB[repair.code] ?? repair.code;
			// `remove` and `role` are both "this must not stay as it is": the box is
			// crossed out. `split`/`rewrite` keep the box and only name the repair —
			// the code stays where it is, in pieces.
			const crossed = repair.code === "remove" || repair.code === "role";
			// WHAT the box is. A rule about a FOLDER (its size) crosses out the folder;
			// a rule about ONE declaration crossed out all 32 files around it —
			// "delete `packages/utils`" for one unused helper. The finding says which it
			// is: a piece (`what`) is a declaration inside a file, so its box is that file.
			const piece = finding.what ? placeSlug(finding.file) : null;
			const box = piece ?? owner;
			return {
				edges: [],
				marks: crossed ? { [box]: "wrong" } : {},
				only: [box],
				action: { [box]: verb },
				...(piece ? { extra: [placeNode(piece, finding.file, owner)] } : null),
			};
		}
		return { edges: [], marks: {}, only: [owner].filter(Boolean) };
	},
	caption: ({ finding, story, options }) => {
		const repair = repairOf(options);
		const owner = finding.ownerNode;
		if (!repair && (story?.from || owner)) {
			return `✕ \`${finding.file}\` holds code no rule in the architecture describes: give that code its kind, or delete it — nothing else may live in this shape.`;
		}
		if (repair?.to?.length && owner && repair.to[0] === owner && repair.path) {
			return `✕ the code is in \`${finding.file}\`; ✓ it belongs at \`${repair.path}\` — the same folder, a different file: nothing moves between folders, this file becomes that place.`;
		}
		if (repair?.to?.length) return `✕ the code is in \`${owner}\`; ✓ \`${repair.path ?? repair.to[0]}\` is where it belongs.`;
		if (repair?.code === "remove") {
			// The sentence names the same subject the box does: one helper going away is
			// not the folder going away.
			return finding.what
				? `✕ \`${finding.what}\` (\`${finding.file}:${finding.line}\`) goes away — the file and the folder around it stay.`
				: `✕ nothing of this may stay: \`${owner ?? finding.file}\` holds code that goes away.`;
		}
		if (repair?.code) {
			const what = {
				split: "split into the parts it is made of",
				rewrite: "rewritten where it stands",
				merge: "merged into the file it duplicates",
				move: "moved",
				add: "created",
				// `role` is the rule saying "nothing declares what this code IS": the
				// answer is to declare it (or delete it), and no box changes.
				role: "not declared as any kind of code — give it its kind, or delete it",
			};
			return `\`${finding.file}\` — nothing moves between boxes: this code is ${what[repair.code] ?? repair.code}, so the change is inside the file itself.`;
		}
		return owner
			? `node \`${owner}\` — the problem is in what this file holds, and the repair changes the code rather than moving it.`
			: "no declared node owns this file.";
	},
};

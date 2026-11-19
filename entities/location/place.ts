"use strict";

// ONE PATH, DESCRIBED AS A LIST OF ITS PARTS — the shared path vocabulary.
// Everything that needs to cut a path apart (a place, a box, a role home) reads
// it through these functions, so the engine never splits a path a second way.
//
// Nothing derivable from a list is stored twice: the folder is `segments.at(-2)`,
// the depth is `segments.length`, the name is `segments.at(-1)`, the last
// extension is `exts.at(-1)`; a copied field is a second truth that drifts.

import type { Leaf, Place } from "../facts";
import { partsOf } from "../../utils/split";

const wordsIn = (name: string | null | undefined): string[] =>
	String(name ?? "")
		// camelCase and ALLCAPS runs: `fileName` → file name, `HTMLParser` → HTML Parser
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(/[^A-Za-z0-9]+/)
		.map((w) => w.toLowerCase())
		.filter(Boolean);

// The name without ANY extension: `x.spec.ts` → `x`. A leading dot is part of
// the name (`.env` has no extension, it IS a name).
const nameOnly = (name: string | null | undefined): string => {
	const n = String(name ?? "");
	const dot = n.indexOf(".", n.startsWith(".") ? 1 : 0);

	return dot > 0 ? n.slice(0, dot) : n;
};

// ONE PATH → its segments. The split is the shared `partsOf` core; a path drops
// the empty segments a leading/trailing `/` would leave.
const segmentsOf = (rel: string | null | undefined): string[] => partsOf(rel, "/").all.filter(Boolean);

// The PARENT of any path: one segment up. The root has none — `""`.
const parentOf = (rel: string | null | undefined): string => segmentsOf(rel).slice(0, -1).join("/");

// ONE PATH → the names it is made of. No folder, no neighbours.
const leafOf = (rel: string | null | undefined): Leaf => {
	const path = String(rel ?? "");
	const segments = segmentsOf(path);
	const name = segments[segments.length - 1] ?? "";
	const fileName = nameOnly(name);
	// `x.spec.ts` → [".spec", ".ts"]; `.env` is a name, not an extension.
	const exts = fileName === name ? [] : name.slice(fileName.length).split(".").filter(Boolean).map((e) => `.${e}`);

	return { path, segments, exts, fileName, words: wordsIn(fileName) };
};

// The place of a file: its own names, plus the folder it sits in.
const placeOf = (rel: string | null | undefined, repoFiles: string[] | null | undefined = []): Place => {
	const leaf = leafOf(rel);
	const dir = parentOf(leaf.path);
	const files = [...new Set((repoFiles ?? []).filter((p) => parentOf(p) === dir))].sort().map(leafOf);

	return { ...leaf, files, siblings: files.filter((f) => f.path !== leaf.path) };
};

// The placeholders a template still has (`{kebab-case}`), for a sentence that
// tells the reader what to fill in.
const placeholdersOf = (template: string | null | undefined): string =>
	[...new Set(String(template ?? "").match(/\{[^}]+\}/g) ?? [])].map((p) => `\`${p}\``).join(", ") || "its placeholders";

// The folder of a path: a file contributes its parent, a folder is itself.
const dirOf = (path: string | null | undefined): string => {
	const p = String(path ?? "");

	return /\.[A-Za-z0-9]+$/.test(p) ? parentOf(p) : p;
};

export { wordsIn, nameOnly, segmentsOf, parentOf, leafOf, placeOf, placeholdersOf, dirOf };

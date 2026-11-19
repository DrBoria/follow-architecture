"use strict";

// The real repository tree (only scanned files), annotated with the node each
// file lands in and how many findings it carries. The UI renders this next to
// the declared architecture so "declared" and "actual" can be compared.

import { deepestMatch } from "../../../entities/tree";
import { parentOf, segmentsOf } from "../../../entities/location";
import type { Arch } from "../../../entities/architecture";
import type { Finding } from "../../../entities/findings";
import type { FileTreeEntry } from "../../../entities/file-tree";
import { stringField } from "../../../utils/read-field";

const emptyDir = (name: string, path: string): FileTreeEntry => ({ name, path, type: "dir", nodeSlug: null, children: [], files: 0, findings: 0 });

const fileEntry = (rel: string, arch: Arch, count: number): FileTreeEntry => ({
	name: segmentsOf(rel).at(-1) ?? "",
	path: rel,
	type: "file",
	nodeSlug: deepestMatch(rel, arch)?.node?.slug ?? null,
	findings: count,
	children: [],
	files: 1,
});

// Roll counts up so a collapsed folder still shows how much is inside.
const rollUp = (dir: FileTreeEntry): FileTreeEntry => {
	let files = 0;
	let findings = 0;
	for (const child of dir.children) {
		if (child.type === "dir") rollUp(child);
		files += child.files;
		findings += child.findings;
	}
	dir.files = files;
	dir.findings = findings;
	return dir;
};

const byType = (a: FileTreeEntry, b: FileTreeEntry): number => {
	if (a.type === b.type) return a.name.localeCompare(b.name);
	return a.type === "dir" ? -1 : 1;
};

const sortDir = (dir: FileTreeEntry): void => {
	dir.children.sort(byType);
	for (const child of dir.children) if (child.type === "dir") sortDir(child);
};

const buildFileTree = (args: { files: readonly string[]; arch: Arch; findings: readonly Finding[] }): FileTreeEntry => {
	const { files, arch, findings } = args;
	const findingCount = new Map<string, number>();
	for (const f of findings) {
		const file = stringField(f, "file");
		findingCount.set(file, (findingCount.get(file) ?? 0) + 1);
	}

	const root = emptyDir(".", "");
	const dirs = new Map<string, FileTreeEntry>([["", root]]);

	const ensureDir = (dirPath: string): FileTreeEntry => {
		const existing = dirs.get(dirPath);
		if (existing) return existing;
		const parent = ensureDir(parentOf(dirPath));
		const node = emptyDir(segmentsOf(dirPath).at(-1) ?? "", dirPath);
		parent.children.push(node);
		dirs.set(dirPath, node);
		return node;
	};

	for (const rel of [...files].sort()) {
		const parent = ensureDir(parentOf(rel));
		parent.children.push(fileEntry(rel, arch, findingCount.get(rel) ?? 0));
	}

	rollUp(root);
	sortDir(root);
	return root;
};

export { buildFileTree };

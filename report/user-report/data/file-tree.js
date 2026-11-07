"use strict";

// The real repository tree (only scanned files), annotated with the node each
// file lands in and how many findings it carries. The UI renders this next to
// the declared architecture so "declared" and "actual" can be compared.

const { deepestMatch } = require("../../../entities/tree");
const { parentOf, segmentsOf } = require("../../../entities/location");

const emptyDir = (name, path) => ({ name, path, type: "dir", nodeSlug: null, children: [], files: 0, findings: 0 });

const buildFileTree = ({ files, arch, findings }) => {
	const findingCount = new Map();
	for (const f of findings) findingCount.set(f.file, (findingCount.get(f.file) ?? 0) + 1);

	const root = emptyDir(".", "");
	const dirs = new Map([["", root]]);

	const ensureDir = (dirPath) => {
		if (dirs.has(dirPath)) return dirs.get(dirPath);
		const parentPath = parentOf(dirPath);
		const parent = ensureDir(parentPath);
		const node = emptyDir(segmentsOf(dirPath).at(-1) ?? "", dirPath);
		parent.children.push(node);
		dirs.set(dirPath, node);
		return node;
	};

	for (const rel of [...files].sort()) {
		const dirPath = parentOf(rel);
		const parent = ensureDir(dirPath);
		const hit = deepestMatch(rel, arch);
		const count = findingCount.get(rel) ?? 0;
		parent.children.push({
			name: segmentsOf(rel).at(-1),
			path: rel,
			type: "file",
			nodeSlug: hit?.node?.slug ?? null,
			findings: count,
			children: [],
			files: 1,
		});
	}

	// Roll counts up so a collapsed folder still shows how much is inside.
	const rollUp = (dir) => {
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
	rollUp(root);

	const sortDir = (dir) => {
		dir.children.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
		for (const child of dir.children) if (child.type === "dir") sortDir(child);
	};
	sortDir(root);

	return root;
};

module.exports = { buildFileTree };

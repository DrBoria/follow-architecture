"use strict";

// Where the components LIVE, not which ones exist: the same React reading, grouped
// by folder, then by the architecture node that folder belongs to.
//
// This is the screen that answers "which area owns the most drilling" — and it
// answers it with the engine's own node resolution (`deepestMatch`), so a folder
// that is NOT a node of the architecture is reported as unowned instead of being
// quietly bucketed under the nearest name.

const path = require("node:path");
const { deepestMatch } = require("../../../entities/tree");

const folderOf = (file) => {
	const dir = path.posix.dirname(String(file ?? ""));

	return dir === "." ? "" : dir;
};

const buildFrameworkFolder = ({ components = [], arch }) => {
	const folders = new Map();

	for (const component of components) {
		const folder = folderOf(component.file);
		if (!folders.has(folder)) {
			const hit = arch ? deepestMatch(folder || ".", arch) : null;
			folders.set(folder, {
				folder: folder || ".",
				node: hit?.node?.slug ?? null,
				// A component in a folder the architecture does not know about is
				// itself a finding elsewhere; here it is marked, not hidden.
				owned: Boolean(hit),
				components: 0,
				drilled: 0,
				names: [],
			});
		}

		const entry = folders.get(folder);
		entry.components += 1;
		entry.drilled += component.drilled ?? 0;
		entry.names.push(component.name);
	}

	const list = [...folders.values()].sort((a, b) => b.drilled - a.drilled || a.folder.localeCompare(b.folder));

	return {
		folders: list,
		totals: {
			folders: list.length,
			unowned: list.filter((entry) => !entry.owned).length,
			worst: list[0]?.folder ?? null,
		},
	};
};

module.exports = { buildFrameworkFolder, folderOf };

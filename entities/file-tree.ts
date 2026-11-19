"use strict";

// THE file tree the overview renders: the real repository tree (only scanned
// files), annotated with the node each file lands in and how many findings it
// carries. DERIVED from the one producer (`buildFileTree`). Plain JSON.

type FileTreeEntry = {
	name: string;
	path: string;
	type: "dir" | "file";
	nodeSlug: string | null;
	children: FileTreeEntry[];
	files: number;
	findings: number;
};

export type { FileTreeEntry };

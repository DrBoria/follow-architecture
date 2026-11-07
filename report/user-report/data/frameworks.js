"use strict";

// The framework reading of the repo, as report data.
//
// `frameworks/*` attaches a `framework` namespace to candidates: what a piece
// renders, what it receives, what it hands down. This module only groups those
// numbers for the UI — it never looks at markup, so adding Vue or Angular to the
// report is a matter of the facet, not of the report.
//
// A component by the same name in two folders is a DIFFERENT component; that is
// what `key` (file + name) is for.

const byEntity = new Map();

const componentRows = ({ files = [] }) => {
	const rows = [];

	for (const file of files) {
		for (const candidate of file.candidates ?? []) {
			const framework = candidate.framework;
			if (!framework || !framework.component) continue;

			rows.push({
				framework: framework.id,
				name: candidate.name,
				file: file.rel ?? file.path ?? "—",
				props: framework.props ?? [],
				forwarded: framework.forwarded ?? [],
				renders: [...new Set((framework.jsx ?? []).map((element) => element.tag))],
				elements: (framework.jsx ?? []).length,
				// Props drilling is a NUMBER here, so screens and rules agree.
				drilled: (framework.forwarded ?? []).length,
			});
		}
	}

	return rows.sort((a, b) => b.drilled - a.drilled || a.file.localeCompare(b.file) || a.name.localeCompare(b.name));
};

const buildFrameworks = ({ files = [] }) => {
	byEntity.clear();
	const components = componentRows({ files });
	const detected = new Map();

	for (const file of files) {
		for (const candidate of file.candidates ?? []) {
			const id = candidate.framework?.id;
			if (!id) continue;
			detected.set(id, (detected.get(id) ?? 0) + 1);
		}
	}

	for (const row of components) {
		const key = `${row.file}::${row.name}`;
		byEntity.set(key, row);
	}

	return {
		// Which facets actually had something to say, so "vue: 0" is visible rather
		// than silently absent.
		detected: [...detected.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, pieces]) => ({ id, pieces })),
		components,
		totals: {
			components: components.length,
			props: components.reduce((sum, row) => sum + row.props.length, 0),
			drilled: components.reduce((sum, row) => sum + row.drilled, 0),
			worst: components[0]?.drilled ?? 0,
		},
	};
};

module.exports = { buildFrameworks };

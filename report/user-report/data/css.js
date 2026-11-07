"use strict";

// The CSS reading of the repo, as report data.
//
// The pipeline attaches `css.templates` to every candidate that declares a
// styled/CSS template (see `css/index.js`). Nothing here re-parses source: the
// report is a GROUPING of facts the engine already produced, in the shape the
// UI draws — per file, per literal kind, and the vocabulary of the design system
// (the variables) that the rest of the repo is supposed to speak.

const numbersOf = (templates) => {
	const literals = [];
	const vars = [];
	const exprs = [];

	for (const template of templates) {
		for (const declaration of template.declarations ?? []) {
			literals.push(...(declaration.literals ?? []).map((literal) => ({ ...literal, prop: declaration.prop })));
			vars.push(...(declaration.vars ?? []));
			exprs.push(...(declaration.exprs ?? []));
		}
	}

	return { literals, vars, exprs };
};

// Colour-ish literals: the ones a design system wants to own. Kept as a pure
// predicate over the fact, so the UI and a rule agree on what "a colour" is.
const isColour = (literal) => literal?.kind === "colour" || /^#|^(rgb|hsl)a?\(/i.test(String(literal?.raw ?? ""));

const buildCss = ({ files = [] }) => {
	const byFile = [];

	for (const file of files) {
		const templates = [];
		for (const candidate of file.candidates ?? []) {
			if (Array.isArray(candidate.css?.templates)) templates.push(...candidate.css.templates);
		}
		if (!templates.length) continue;

		const { literals, vars, exprs } = numbersOf(templates);
		byFile.push({
			file: file.rel ?? file.path ?? "—",
			candidates: (file.candidates ?? []).filter((c) => Array.isArray(c.css?.templates)).map((c) => c.name),
			templates: templates.length,
			declarations: templates.reduce((sum, t) => sum + (t.declarations?.length ?? 0), 0),
			literals: literals.length,
			colours: literals.filter(isColour).length,
			vars: [...new Set(vars)],
			exprs: exprs.length,
		});
	}

	byFile.sort((a, b) => b.literals - a.literals || a.file.localeCompare(b.file));

	const vocabulary = new Map();
	for (const entry of byFile) {
		for (const name of entry.vars) vocabulary.set(name, (vocabulary.get(name) ?? 0) + 1);
	}

	return {
		files: byFile,
		totals: {
			files: byFile.length,
			templates: byFile.reduce((sum, f) => sum + f.templates, 0),
			declarations: byFile.reduce((sum, f) => sum + f.declarations, 0),
			literals: byFile.reduce((sum, f) => sum + f.literals, 0),
			colours: byFile.reduce((sum, f) => sum + f.colours, 0),
		},
		// What the CSS already talks about — the names a "no hardcoded values"
		// rule can point at instead of the literal it found.
		vocabulary: [...vocabulary.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, uses]) => ({ name, uses })),
	};
};

module.exports = { buildCss, isColour };

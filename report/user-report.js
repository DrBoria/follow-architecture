"use strict";

// User-facing markdown report: the CLI renders findings (and orphan files)
// grouped by file. The ESLint plugin path never touches this module.

const { unique } = require("remeda");

const renderReport = (findings, repoRoot, { orphans = [] } = {}) => {
	const files = unique(findings.map((f) => f.file)).sort();
	const lines = [];
	lines.push(`# follow-architecture report`);
	lines.push(``);
	lines.push(`Generated against \`${repoRoot}\`.`);
	lines.push(``);
	if (orphans.length) {
		lines.push(`## Orphan files`);
		lines.push(``);
		lines.push(`Files the architecture says nothing about (no node prefix, no invariant \`where\`):`);
		for (const o of orphans) lines.push(`- \`${o}\``);
		lines.push(``);
	}
	lines.push(`## Findings`);
	for (const file of files) {
		lines.push(``);
		lines.push(`### \`${file}\``);
		const list = findings.filter((x) => x.file === file);
		for (const f of list) {
			lines.push(``);
			lines.push(f.message);
			if (f.fix) {
				lines.push(``);
				lines.push(`**Fix.**`);
				lines.push(``);
				lines.push(f.fix);
			}
			lines.push(``);
			lines.push(`---`);
		}
	}
	lines.push(``);
	return lines.join("\n");
};

module.exports = { renderReport };

"use strict";

const { pipe, groupBy, sort, entries, map, join, filter, flatMap } = require("remeda");

const renderReport = (repoRoot, nodes, findings) => {
	const byFile = pipe(findings, groupBy((f) => f.file));
	const sections = pipe(
		entries(byFile),
		sort(([a], [b]) => a.localeCompare(b)),
		flatMap(([file, items]) => [
			`### \`${file}\``,
			"",
			...pipe(
				items,
				flatMap((item) => [
					item.message.trim(),
					"",
					...(item.fix ? ["**Fix.**", "", item.fix.trim(), ""] : []),
					"---",
					"",
				]),
			),
		]),
	);
	const summary = pipe(
		nodes,
		map((n) => ({ n, count: pipe(findings, filter((f) => f.node === n.id), (f) => f.length) })),
		filter((x) => x.count > 0),
		map((x) => `- \`${x.n.pattern}\` — ${x.count} finding${x.count === 1 ? "" : "s"}`),
	);
	const invCount = pipe(findings, filter((f) => f.node === null), (f) => f.length);
	return pipe(
		[
			"# follow-architecture report",
			"",
			`Generated against \`${String(repoRoot).replace(/\\/g, "/")}\`.`,
			"",
			"## Findings",
			"",
			...(findings.length === 0 ? ["No architecture violations found.", ""] : sections),
			"## Summary",
			"",
			...summary,
			...(invCount > 0 ? [`- invariants — ${invCount} finding${invCount === 1 ? "" : "s"}`] : []),
			"",
		],
		join("\n"),
	);
};

module.exports = { renderReport };
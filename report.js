"use strict";

const { unique } = require("remeda");

const substitute = (text, vars) => String(text).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `\{${k}\}`));

const subText = (t, vars) => {
	if (t == null) return null;
	if (typeof t === "function") return t(vars);
	return substitute(t, vars);
};

const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

const renderSpec = (r, vars) => {
	if (r == null) return null;
	if (typeof r === "function") return r(vars);
	if (typeof r === "string") return { message: substitute(r, vars), fix: null };
	return { message: subText(r.message, vars), fix: subText(r.fix, vars) };
};

const finding = (key, rule, node, message, fix, pos) => {
	const rep = message != null && typeof message === "object" ? renderSpec(message, {}) : null;
	return {
		node,
		rule,
		key,
		message: rep?.message ?? String(message ?? ""),
		fix: rep?.fix ?? fix ?? null,
		pos: pos && pos.line ? pos : { line: 1, column: 1 },
	};
};

const findingFrom = (f, rule, nodeId, keyPrefix, caps) => {
	const vars = { ...caps, ...f };
	const rep = f.report != null ? renderSpec(f.report, vars) : f.message != null || f.fix != null ? { message: subText(f.message, vars), fix: subText(f.fix, vars) } : null;
	const message = rep?.message ?? vars.message ?? "architecture violation";
	const fix = rep?.fix ?? vars.fix ?? null;
	const pos = f.line ? { line: f.line, column: 1 } : { line: 1, column: 1 };
	const key = `${keyPrefix}:${f.key || oneLine(message).slice(0, 40)}`;
	return finding(key, rule, nodeId, message, fix, pos);
};

const renderReport = (findings, repoRoot) => {
	const files = unique(findings.map((f) => f.file)).sort();
	const lines = [];
	lines.push(`# follow-architecture report`);
	lines.push(``);
	lines.push(`Generated against \`${repoRoot}\`.`);
	lines.push(``);
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

module.exports = { finding, findingFrom, renderReport };

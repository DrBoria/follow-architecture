"use strict";

// Report primitives shared by every output path: variable substitution and
// the finding factory. Every entity (nodes, invariants, codeRoles) emits
// findings through this one shape, so the CLI and the ESLint plugin render
// identical messages.



const substitute = (text, vars) => String(text).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `\{${k}\}`));

const subText = (t, vars) => {
	if (t == null) return null;
	if (typeof t === "function") return t(vars);
	return substitute(t, vars);
};

// Render a report spec (string | { message, fix } | function) with the given
// variables. Returns { message, fix } or null.
const renderSpec = (r, vars) => {
	if (r == null) return null;
	if (typeof r === "function") return r(vars);
	if (typeof r === "string") return { message: substitute(r, vars), fix: null };
	return { message: subText(r.message, vars), fix: subText(r.fix, vars) };
};

// Build one finding from a raw report item. The item may carry its own
// `report` spec, or plain `message`/`fix` strings; `vars` supplies the
// substitution variables (path, basename, captures, check-specific values).
const findingFrom = (item, rule, node, key, vars) => {
	const rep = item.report != null ? renderSpec(item.report, vars) : item.message != null || item.fix != null ? { message: subText(item.message, vars), fix: subText(item.fix, vars) } : null;
	const message = rep?.message ?? vars.message ?? "architecture violation";
	const fix = rep?.fix ?? vars.fix ?? null;
	const pos = { line: item.line ?? 1, column: 1 };
	return {
		file: vars.path ?? node,
		node,
		rule,
		key: typeof item === "string" ? item : item.key ?? key,
		// `key` above may be narrowed by the config (`key: rule`), losing the
		// invariant/role identity. `dedupeKey` keeps the engine's own key so
		// consumers (the overview report) can still tell which rule fired.
		dedupeKey: key,
		// Structured payload for consumers that must not parse the message
		// (e.g. which node an import violated).
		data: item.data ?? null,
		message,
		fix,
		pos,
	};
};



// ── markdown CLI report ──────────────────────────────────────────────────────
// The terminal/`--out` view: findings (and orphan files) grouped by file.
// The interactive `--overview` HTML report lives in ./user-report/.

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
	// INVARIANTS FIRST. An invariant is about the shape of the whole tree; a node or
	// role finding is about one piece inside it. A reader who starts with a hundred
	// "belongs in packages/utils" never learns that the tree itself is the problem.
	const invariants = findings.filter((f) => f.rule === "invariant");
	if (invariants.length) {
		lines.push(`## Invariants`);
		lines.push(``);
		for (const f of invariants.sort((a, b) => a.file.localeCompare(b.file) || a.pos.line - b.pos.line)) {
			lines.push(`- \`${f.file}\` (line ${f.pos.line}) — ${f.message}`);
			if (f.fix) lines.push(`  fix: ${f.fix}`);
		}
		lines.push(``);
	}
	lines.push(`## Findings`);
	for (const file of files) {
		lines.push(``);
		lines.push(`### \`${file}\``);
		// Within a file the same order holds: invariant → role → node.
		const rank = (f) => (f.rule === "invariant" ? 0 : f.rule === "codeRoles" ? 1 : 2);
		const list = findings
			.filter((x) => x.file === file)
			.sort((a, b) => rank(a) - rank(b) || a.pos.line - b.pos.line);
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

module.exports = {findingFrom, renderReport};

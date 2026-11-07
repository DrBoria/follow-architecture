"use strict";


// The terminal / --out report. Wording comes from report/errorTypes.

const { repair } = require("./asks");


const substitute = (text, vars) => String(text).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `\{${k}\}`));

const subText = (t, vars) => {
	if (t == null) return null;
	if (typeof t === "function") return t(vars);
	return substitute(t, vars);
};

const renderSpec = (r, vars) => {
	if (r == null) return null;
	if (typeof r === "function") return r(vars);
	if (typeof r === "string") return { message: substitute(r, vars), fix: null };
	// The spec has ONE shape now: `{ code, description, fix: { message, location } }`.
	// The older flat spelling (`message` + a `fix` string) still renders, so a
	// config that has not been migrated keeps working.
	const fixText = typeof r.fix === "string" ? r.fix : r.fix?.message ?? null;
	return { message: subText(r.description ?? r.message, vars), fix: subText(fixText, vars) };
};

// ONE finding, ONE repair. A producer states the repair structurally (`to` boxes,
// `path`, `ask`) and `findingFrom` carries it as `data.repair` — the SAME object
// the CLI prints and the picture draws. A producer that only wrote a sentence
// still ends up with a repair (`rules` with no destination), so downstream never
// has to guess what a sentence meant.
const findingFrom = (item, rule, node, key, vars) => {
	const spec = item.report != null ? item.report : item.message != null || item.fix != null ? item : null;
	// The PLACE first — a sentence may name it (`{destination}`), and a sentence
	// must never have to be parsed to find out where the repair points. `place` is
	// what the caller already resolved from `fix.location`; a spec that still
	// carries one is honoured too.
	const place = spec?.place ?? spec?.path ?? null;
	const scope = place ? { ...vars, destination: place } : vars;
	const rep = spec != null ? renderSpec(spec, scope) : null;
	const message = rep?.message ?? vars.message ?? "architecture violation";
	const fix = rep?.fix ?? vars.fix ?? null;
	const pos = { line: item.line ?? 1, column: 1 };
	const stated = spec != null ? repair({ code: spec.code ?? spec.ask, fix }, { to: spec.to ?? [], from: spec.from ?? null, path: place }) : null;
	const evidence = item.data ?? null;
	return {
		file: vars.path ?? node,
		node,
		rule,
		key: typeof item === "string" ? item : item.key ?? key,
		dedupeKey: key,
		data: stated ? { ...(evidence ?? {}), repair: { ...stated, text: fix } } : evidence,
		// WHAT this finding is about — the piece, when the finding is about one.
		// The report groups by role and then by piece, so the name travels with the
		// finding instead of being re-parsed out of the sentence.
		what: vars.what ?? null,
		// WHICH role the subject is — taken from the finding's OWN key (`role:<slug>`),
		// never from a variable: a node slug in `vars.role` would print a folder as if
		// it were a kind of code.
		role: /^role:([^:]+)/.exec(key)?.[1] ?? item.role ?? null,
		message,
		fix,
		pos,
	};
};




const { unique } = require("remeda");
const { renderToken } = require("./errorTypes");

const renderFinding = (f) => {
	const violation = f.data?.violations?.find?.((v) => v?.token) ?? null;
	const rendered = renderToken(violation?.token, { file: f.file, targetPath: violation?.targetPath ?? null });
	if (!rendered) return { message: f.message, fixes: f.fix ? [{ text: f.fix }] : [] };
	return { message: rendered.message, fixes: rendered.fixes };
};

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
	// GROUPED BY WHAT THE FINDING IS ABOUT — the code role first, then the piece.
	// Grouping by file made a folder with twenty problems look like twenty
	// problems with `store.ts`: the reader opened a file name and had to work out
	// which kind of code was being talked about. The role is the answer to "what
	// is this?", the piece to "which part of it?", and the file is only where it
	// happens to sit today.
	const groups = new Map();
	for (const f of findings) {
		const role = f.role ?? (f.data?.violation?.token?.subject?.roles ?? [])[0] ?? null;
		const key = role ? `role:${role}` : f.node ? `node:${f.node}` : "unroled";
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(f);
	}
	const order = (k) => (k === "unroled" ? 3 : k.startsWith("role:") ? 0 : 1);
	for (const [key, list] of [...groups].sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]))) {
		const heading = key.startsWith("role:") ? `\`${key.slice(5)}\` code` : key.startsWith("node:") ? `node \`${key.slice(5)}\`` : "not code a role describes";
		lines.push(``);
		lines.push(`### ${heading}`);
		// Within a role: by piece, then by place. One piece may have several
		// findings (a relation and a chain, say) — they stay together.
		const rank = (f) => (f.rule === "invariant" ? 0 : f.rule === "codeRoles" ? 1 : 2);
		const sorted = [...list].sort(
			(a, b) => String(a.what ?? "").localeCompare(String(b.what ?? "")) || a.file.localeCompare(b.file) || rank(a) - rank(b) || a.pos.line - b.pos.line,
		);
		for (const f of sorted) {
			const shown = renderFinding(f);
			lines.push(``);
			lines.push(`#### ${f.what ? `\`${f.what}\`` : `\`${f.file}\``} — \`${f.file}:${f.pos.line}\``);
			lines.push(``);
			lines.push(shown.message);
			if (shown.fixes.length) {
				lines.push(``);
				lines.push(`**Fix** — ${shown.fixes.length} option${shown.fixes.length === 1 ? "" : "s"}:`);
				lines.push(``);
				for (const option of shown.fixes) lines.push(`- ${option.text}`);
			}
			lines.push(``);
			lines.push(`---`);
		}
	}
	lines.push(``);
	return lines.join("\n");
};

module.exports = {findingFrom, renderReport};

"use strict";

// The terminal / --out report: findings grouped by what they are ABOUT (the code
// role first, then the piece), each with its message and its repairs. Wording
// comes from report/errorTypes; the finding bag is the engine's own.

import { renderToken } from "./errorTypes";
import { fieldOf, isObj, type FieldValue } from "../utils/field";
import { stringField, stringListField, recordListField, numberField } from "../utils/read-field";
import { groupBy } from "../utils/group";
import type { Finding } from "../entities/findings";
import type { RelationToken } from "../entities/token";
import type { StatedRepair } from "../entities/repair";

// One finding as the text report reads it: the fields it prints.
type TextFinding = {
	file: string;
	message: string;
	fix: string | null;
	what: string | null;
	role: string | null;
	node: string | null;
	rule: string;
	line: number;
	token: RelationToken | null;
	// The SINGULAR `data.violation` bag — only the grouping fallback reads it
	// (a relation finding's `violations` list must not claim a role group).
	singularToken: RelationToken | null;
	targetPath: string | null;
};

// The token as the report reads it: a plain record is the token (every field is
// optional, so any record qualifies), anything else is none.
const isToken = (value: FieldValue): value is RelationToken => value !== null && typeof value === "object" && !Array.isArray(value);
const tokenOf = (value: FieldValue): RelationToken | null => (isToken(value) ? value : null);

const textFinding = (f: Finding): TextFinding => {
	const violations = recordListField(fieldOf(f, "data"), "violations");
	const withToken = violations.find((v) => isObj(fieldOf(v, "token"))) ?? null;
	return {
		file: stringField(f, "file"),
		message: stringField(f, "message"),
		fix: stringField(f, "fix") || null,
		what: stringField(f, "what") || null,
		role: stringField(f, "role") || null,
		node: stringField(f, "node") || null,
		rule: stringField(f, "rule"),
		line: numberField(fieldOf(f, "pos"), "line", 1),
		token: withToken ? tokenOf(fieldOf(withToken, "token")) : null,
		singularToken: tokenOf(fieldOf(f, "data.violation.token")),
		targetPath: withToken ? stringField(withToken, "targetPath") || null : null,
	};
};

// The message and repairs one finding prints: the token's own words when the
// engine sent a verdict, else the finding's message and fix.
const renderFinding = (f: TextFinding): { message: string; fixes: StatedRepair[] } => {
	const rendered = renderToken(f.token, { file: f.file, targetPath: f.targetPath });
	if (!rendered) return { message: f.message, fixes: f.fix ? [{ text: f.fix }] : [] };
	return { message: rendered.message, fixes: rendered.fixes };
};

// The group a finding belongs to: its role, else its node, else "unroled".
// The token fallback reads `data.violation` (the SINGULAR bag a structure
// verdict carries) — a relation finding's `data.violations` list is the
// picture's evidence, not a grouping claim: its subject roles name the FILE's
// roles, and grouping by them moved module-scope relations out of their node.
const groupKeyOf = (f: TextFinding): string => {
	const role = f.role ?? stringListField(fieldOf(f.singularToken, "subject"), "roles")[0] ?? null;
	if (role) return `role:${role}`;
	return f.node ? `node:${f.node}` : "unroled";
};

const groupOrder = (k: string): number => {
	if (k === "unroled") return 3;
	return k.startsWith("role:") ? 0 : 1;
};

const groupHeading = (k: string): string => {
	if (k.startsWith("role:")) return `\`${k.slice(5)}\` code`;
	return k.startsWith("node:") ? `node \`${k.slice(5)}\`` : "not code a role describes";
};

// Within a role: by piece, then by place. One piece may have several findings.
const rankOf = (f: TextFinding): number => {
	if (f.rule === "invariant") return 0;
	return f.rule === "codeRoles" ? 1 : 2;
};

const byPiece = (a: TextFinding, b: TextFinding): number =>
	String(a.what ?? "").localeCompare(String(b.what ?? "")) || a.file.localeCompare(b.file) || rankOf(a) - rankOf(b) || a.line - b.line;

const findingLines = (f: TextFinding): string[] => {
	const shown = renderFinding(f);
	const lines = ["", `#### ${f.what ? `\`${f.what}\`` : `\`${f.file}\``} — \`${f.file}:${f.line}\``, "", shown.message];
	if (shown.fixes.length) {
		lines.push("", `**Fix** — ${shown.fixes.length} option${shown.fixes.length === 1 ? "" : "s"}:`, "");
		for (const option of shown.fixes) lines.push(`- ${option.text}`);
	}
	lines.push("", "---");
	return lines;
};

const groupLines = (key: string, list: TextFinding[]): string[] => {
	const lines = ["", `### ${groupHeading(key)}`];
	for (const f of [...list].sort(byPiece)) lines.push(...findingLines(f));
	return lines;
};

const orphanLines = (orphans: readonly string[]): string[] => {
	if (!orphans.length) return [];
	const lines = ["## Orphan files", "", "Files the architecture says nothing about (no node prefix, no invariant `where`):"];
	for (const o of orphans) lines.push(`- \`${o}\``);
	lines.push("");
	return lines;
};

const invariantLines = (findings: readonly TextFinding[]): string[] => {
	const invariants = findings.filter((f) => f.rule === "invariant");
	if (!invariants.length) return [];
	const lines = ["## Invariants", ""];
	for (const f of [...invariants].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
		lines.push(`- \`${f.file}\` (line ${f.line}) — ${f.message}`);
		if (f.fix) lines.push(`  fix: ${f.fix}`);
	}
	lines.push("");
	return lines;
};

const renderReport = (findings: readonly Finding[], repoRoot: string, opts: { orphans?: readonly string[] } = {}): string => {
	const text = findings.map(textFinding);
	const lines = ["# follow-architecture report", "", `Generated against \`${repoRoot}\`.`, ""];
	lines.push(...orphanLines(opts.orphans ?? []));
	lines.push(...invariantLines(text));
	lines.push("## Findings");
	// GROUPED BY WHAT THE FINDING IS ABOUT — the code role first, then the piece.
	const groups = groupBy(text, groupKeyOf).sort((a, b) => groupOrder(a[0]) - groupOrder(b[0]) || a[0].localeCompare(b[0]));
	for (const [key, list] of groups) lines.push(...groupLines(key, list));
	lines.push("");
	return lines.join("\n");
};

// The notices a run collected: what the tool could NOT read, so the reader knows
// an answer is partial. They print AFTER the findings.
const renderNotices = (notices: readonly string[] | null | undefined): string => {
	if (!notices?.length) return "";
	const lines = ["", `## Not read (${notices.length})`, ""];
	for (const line of notices) lines.push(`- ${line}`);
	lines.push("");
	return lines.join("\n");
};

// A config the engine cannot use is a SENTENCE for the reader — they fix it by
// editing a file — so the message is the whole output.
const renderConfigError = (error: { message?: string } | null | undefined): string => (error && error.message ? error.message : String(error));

// Anything else is the engine failing at its own job: it keeps its stack.
const renderCrashError = (error: { stack?: string } | null | undefined): string => {
	const detail = error && error.stack ? error.stack : String(error);
	return `follow-architecture: the run failed for a reason that is not in the architecture\n${detail}`;
};

export { renderReport, renderNotices, renderConfigError, renderCrashError };

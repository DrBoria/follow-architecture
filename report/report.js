"use strict";

// Report primitives shared by every output path: variable substitution and
// the finding factory. Every entity (nodes, invariants, codeRoles) emits
// findings through this one shape, so the CLI and the ESLint plugin render
// identical messages.

// Normalize a raw YAML `report` field into { level?, message?, fix? } | null.
// A bare string becomes { message }. A function passes through untouched
// (it will be called later by renderSpec). Null/undefined → null.
const asReport = (r) => {
	if (r == null) return null;
	if (typeof r === "string") return { message: r };
	if (typeof r === "function") return r;
	if (typeof r === "object") {
		const out = {};
		if (r.level != null) out.level = String(r.level);
		if (r.message != null) out.message = String(r.message);
		if (r.fix != null) out.fix = String(r.fix);
		return Object.keys(out).length ? out : null;
	}
	return null;
};

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
		message,
		fix,
		pos,
	};
};

module.exports = { asReport, substitute, subText, renderSpec, findingFrom };

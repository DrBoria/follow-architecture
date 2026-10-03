"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { minimatch } = require("minimatch");
const { pipe, map, filter, flatMap, first, uniqueBy, join, sort } = require("remeda");
const { parseSource, getImports, enclosingFunctionName } = require("./ast");
const { globToRegex } = require("./glob");

const norm = (p) => String(p).replace(/\\/g, "/");

const toRel = (repoRoot, filePath) => norm(path.relative(repoRoot, filePath));

const compilePattern = (pattern) => {
	const names = [];
	const body = pattern.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, n) => {
		names.push(n);
		return "([^/]+)";
	});
	return { re: new RegExp(`^${globToRegex(body)}$`), names };
};

const substitute = (pattern, vars) =>
	pattern.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, n) => (vars && vars[n] != null ? String(vars[n]) : `{${n}}`));

const subText = (text, vars) => (text ? substitute(text, vars) : text);

const oneLine = (text) => text.replace(/\s*\n\s*/g, " ").trim();

const fileVars = (relPath, caps) => ({
	...caps,
	file: relPath,
	basename: path.posix.basename(relPath),
	dir: path.posix.dirname(relPath),
});

const finding = (key, rule, node, message, fix, pos) => ({
	node,
	rule,
	key,
	message,
	oneLine: oneLine(message),
	fix,
	pos,
});

const capturesOf = (node, relPath) =>
	pipe(relPath.match(node.compiled.re), (m) => (m ? node.compiled.names.reduce((acc, n, i) => ({ ...acc, [n]: m[i + 1] }), {}) : null));

const nodeMatches = (node, relPath) =>
	!node.exclude.some((g) => minimatch(relPath, g)) && node.compiled.re.test(relPath);

const findNode = (relPath, nodes) =>
	pipe(nodes, filter((n) => nodeMatches(n, relPath)), sort((a, b) => b.pattern.length - a.pattern.length), first);

const resolveImportRel = (filePath, source, repoRoot, aliases) => {
	if (source.startsWith(".")) {
		return toRel(repoRoot, path.resolve(path.dirname(filePath), source));
	}
	const alias = pipe(Object.entries(aliases), filter(([a]) => source === a || source.startsWith(`${a}/`)), first);
	if (!alias) return null;
	const [a, target] = alias;
	return `${target}/${source.slice(a.length).replace(/^\//, "")}`;
};

const checkConsume = (filePath, relPath, node, repoRoot, nodes, aliases) => {
	if (node.consume.length === 0) return [];
	const sf = parseSource(filePath, fs.readFileSync(filePath, "utf8"));
	const resolved = pipe(
		getImports(sf),
		map((i) => resolveImportRel(filePath, i.source, repoRoot, aliases)),
		filter(Boolean),
		flatMap((rel) => [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`, `${rel}/index.tsx`]),
	);
	const caps = fileVars(relPath, capturesOf(node, relPath) || {});
	return pipe(
		node.consume,
		map((spec) => {
			const dep = pipe(nodes, filter((n) => n.id === spec.id), first);
			if (!dep) return null;
			const ok = pipe(
				resolved,
				map((rel) => ({ rel, caps: capturesOf(dep, rel) })),
				filter((r) => r.caps),
				filter((r) => !spec.same || r.caps[spec.same] === caps[spec.same]),
				(r) => r.length > 0,
			);
			if (ok) return null;
			const expected = substitute(dep.pattern, caps);
			const sameNote = spec.same ? ` (the \`${spec.same}\` must match this file)` : "";
			const message = subText(spec.message, caps) || `this file must import something matching \`${expected}\`${sameNote} — it never does`;
			return finding(`consume-missing:${node.id}:${spec.id}`, "consume-missing", node.id, message, subText(spec.fix, caps) || null, { line: 1, column: 1 });
		}),
		filter(Boolean),
	);
};

const checkNameMust = (relPath, node) => {
	if (node.nameMust.length === 0) return [];
	const caps = fileVars(relPath, capturesOf(node, relPath) || {});
	const sub = (s) => s.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, n) => caps[n] ?? n);
	const base = path.posix.basename(relPath);
	if (node.nameMust.some((n) => minimatch(base, sub(n)))) return [];
	const list = pipe(node.nameMust, map((n) => `\`${sub(n)}\``), join(", "));
	const message = subText(node.nameMessage, caps) || `only these file names are allowed here: ${list} — found \`${base}\``;
	return [finding(`name-must:${node.id}`, "name-must", node.id, message, subText(node.nameFix, caps) || null, { line: 1, column: 1 })];
};

const checkNameForbid = (relPath, node) => {
	const hit = pipe(node.nameForbid, filter((f) => minimatch(path.posix.basename(relPath), f.glob)), first);
	if (!hit) return [];
	const caps = fileVars(relPath, capturesOf(node, relPath) || {});
	const message = subText(hit.message, caps) || `\`${path.posix.basename(relPath)}\` is not an allowed file name here — it matches the forbidden pattern \`${hit.glob}\``;
	return [finding(`name-forbid:${hit.glob}`, "name-forbid", node.id, message, subText(hit.fix, caps) || null, { line: 1, column: 1 })];
};

const checkNamePattern = (relPath, node) => {
	if (!node.namePattern) return [];
	const base = path.posix.basename(relPath);
	if (node.namePattern.except.some((g) => minimatch(base, g)) || node.namePattern.re.test(base)) return [];
	const caps = fileVars(relPath, capturesOf(node, relPath) || {});
	const message = subText(node.namePattern.message, caps) || `\`${base}\` does not match the required name pattern \`${node.namePattern.regexp}\``;
	return [finding(`name-pattern:${node.namePattern.regexp}`, "name-pattern", node.id, message, subText(node.namePattern.fix, caps) || null, { line: 1, column: 1 })];
};

const checkCaptureMust = (relPath, node) =>
	pipe(
		node.captureMust,
		flatMap((cm) => {
			const value = (capturesOf(node, relPath) || {})[cm.capture];
			if (value === undefined || cm.values.includes(value)) return [];
			const vars = fileVars(relPath, capturesOf(node, relPath) || {});
			const list = pipe(cm.values, map((v) => `\`${v}\``), join(", "));
			const message = subText(cm.message, vars) || `the \`${cm.capture}\` part here is \`${value}\` — only these are allowed: ${list}`;
			return [finding(`capture-must:${node.id}:${cm.capture}`, "capture-must", node.id, message, subText(cm.fix, vars) || null, { line: 1, column: 1 })];
		}),
	);

const checkCaptureEquals = (relPath, node) =>
	pipe(
		node.captureEquals,
		flatMap((ce) => {
			const caps = capturesOf(node, relPath) || {};
			const value = caps[ce.capture];
			let target =
				ce.target === "basename"
					? path.posix.basename(relPath)
					: ce.target === "dir"
						? path.posix.dirname(relPath)
						: ce.target === "folder"
							? path.posix.basename(path.posix.dirname(relPath))
							: caps[ce.target];
			if (typeof target === "string" && ce.suffix && target.endsWith(ce.suffix)) target = target.slice(0, -ce.suffix.length);
			if (value === undefined || target === value) return [];
			const vars = fileVars(relPath, caps);
			const message = subText(ce.message, vars) || `the \`${ce.capture}\` part is \`${value}\` but it must equal \`${target}\``;
			return [finding(`capture-equals:${node.id}:${ce.capture}`, "capture-equals", node.id, message, subText(ce.fix, vars) || null, { line: 1, column: 1 })];
		}),
	);

const checkInvariants = (filePath, relPath, invariants) => {
	const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
	const sf = parseSource(filePath, lines.join("\n"));
	const whereAt = (line) => {
		const name = enclosingFunctionName(sf, line);
		return name ? ` in \`${name}\`` : "";
	};
	const capsOf = (compiled) =>
		compiled.names.reduce((acc, n, i) => ({ ...acc, [n]: relPath.match(compiled.re)[i + 1] }), {});
	return pipe(
		invariants,
		flatMap((inv) => {
			if (inv.absentCompiled?.re.test(relPath)) {
				const caps = fileVars(relPath, capsOf(inv.absentCompiled));
				const message = subText(inv.message, caps) || `files matching \`${inv.absent}\` must not exist — ${inv.reason}`;
				return [finding(`invariant-absent:${inv.id}`, "invariant-absent", null, message, subText(inv.fix, caps) || null, { line: 1, column: 1 })];
			}
			if (!inv.whenCompiled.re.test(relPath)) return [];
			const caps = fileVars(relPath, capsOf(inv.whenCompiled));
			const mustFindings = pipe(
				inv.must,
				flatMap((m) => {
					const re = new RegExp(m.pattern);
					if (lines.some((l) => re.test(l))) return [];
					const message = subText(m.message, caps) || `this file must contain \`${m.pattern}\` — ${m.reason}`;
					return [finding(`invariant-must:${inv.id}:${m.pattern}`, "invariant-must", null, message, subText(m.fix, caps) || null, { line: 1, column: 1 })];
				}),
			);
			const forbidFindings = pipe(
				inv.forbid,
				flatMap((f) => {
					if (f.except.some((g) => minimatch(relPath, g))) return [];
					const hits = pipe(
						lines,
						map((line, idx) => ({ line: idx + 1, snippet: line.trim(), match: line.match(new RegExp(f.pattern))?.[0] })),
						filter((h) => h.match),
					);
					if (hits.length === 0) return [];
					const vars = {
						...caps,
						line: hits[0].line,
						lines: pipe(hits, map((h) => h.line), join(", ")),
						count: hits.length,
						plural: hits.length === 1 ? "" : "s",
						snippet: hits[0].snippet,
						match: hits[0].match,
						where: whereAt(hits[0].line),
					};
					const message = subText(f.message, vars) || `\`${f.pattern}\` is not allowed here — ${f.reason}`;
					return [finding(`invariant-forbid:${inv.id}:${f.pattern}`, "invariant-forbid", null, message, subText(f.fix, vars) || null, { line: hits[0].line, column: 1 })];
				}),
			);
			return [...mustFindings, ...forbidFindings];
		}),
	);
};

const checkFile = (filePath, repoRoot, arch) => {
	const relPath = toRel(repoRoot, filePath);
	const nodeFindings = pipe(
		arch.nodes,
		filter((n) => nodeMatches(n, relPath)),
		flatMap((node) => [
			...checkNameMust(relPath, node),
			...checkNameForbid(relPath, node),
			...checkNamePattern(relPath, node),
			...checkCaptureMust(relPath, node),
			...checkCaptureEquals(relPath, node),
			...checkConsume(filePath, relPath, node, repoRoot, arch.nodes, arch.aliases),
		]),
	);
	return pipe(
		[...nodeFindings, ...checkInvariants(filePath, relPath, arch.invariants)],
		uniqueBy((f) => f.key || `${f.rule}:${f.node}`),
		map((f) => ({ ...f, file: relPath })),
	);
};

module.exports = { checkFile, findNode, nodeMatches, norm, toRel };
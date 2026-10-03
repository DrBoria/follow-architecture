"use strict";

const { pipe, map, filter, unique } = require("remeda");
const { minimatch } = require("minimatch");
const { asReport, compilePattern, compileWhen, checkRegex } = require("../utils");

const FORBID_TYPES = ["fileContent", "imports", "syntax"];

const normalizeInvariant = (i, slugs) => {
	if (!i || typeof i !== "object") throw new Error("architecture.invariants: entry is not an object");
	if (!i.id) throw new Error("architecture.invariants: entry without id");
	if (i.node && i.node !== "*" && !slugs.includes(i.node)) throw new Error(`invariant ${i.id}: unknown node \`${i.node}\``);
	const contentSpec = (p) => {
		checkRegex(p.pattern, `invariant ${i.id}: forbid`);
		return { type: "fileContent", key: p.key ?? null, pattern: p.pattern, except: p.except ?? [], report: asReport(p.report) };
	};
	const syntaxSpec = (p) => {
		if (!p.kind) throw new Error(`invariant ${i.id}: forbid syntax entry requires \`kind\``);
		if (p.pattern != null) checkRegex(p.pattern, `invariant ${i.id}: forbid syntax`);
		return { type: "syntax", key: p.key ?? null, kind: p.kind, pattern: p.pattern ?? null, except: p.except ?? [], report: asReport(p.report) };
	};
	const importsSpec = (p) => {
		const { re, names } = compilePattern(p.pattern);
		return { type: "imports", key: p.key ?? null, pattern: p.pattern, re, names, except: p.except ?? [], report: asReport(p.report) };
	};
	return {
		id: i.id,
		key: i.key ?? null,
		node: i.node ?? "*",
		where: i.where == null ? null : (() => {
			const { re, names } = compilePattern(i.where);
			return { re, names, pattern: i.where };
		})(),
		when: compileWhen(i.when),
		except: i.except ?? [],
		report: asReport(i.report),
		forbid: [
			...pipe(i.forbid ?? [], map((f) => {
				const type = f.type ?? "fileContent";
				if (!FORBID_TYPES.includes(type)) throw new Error(`invariant ${i.id}: forbid entry has unknown type \`${type}\` (expected ${FORBID_TYPES.join(" | ")})`);
				return type === "imports" ? importsSpec(f) : type === "syntax" ? syntaxSpec(f) : contentSpec(f);
			})), 
			...pipe(i.must ?? [], map(importsSpec)),
		],
		children: pipe(i.children ?? [], map((c) => normalizeInvariant(c, slugs))),
	};
};

const matchNode = (inv, ctx) => inv.node === "*" || !!ctx.captures[inv.node];

const matchWhere = (inv, ctx) => !inv.where || inv.where.re.test(ctx.path);

const fileVars = (ctx) => ({ slice: ctx.slice, path: ctx.path, dir: ctx.dir, basename: ctx.basename, ...ctx.captures });

const runWhen = (inv, ctx, baseCaps, out, findingFrom) => {
	if (!inv.when) return true;
	const res = inv.when(ctx);
	if (res == null || res === false) return false;
	if (res === true) return true;
	if (Array.isArray(res)) {
		for (const f of res) out.push(findingFrom(f, inv.key ?? inv.id, inv.node, `when:${inv.id}`, { ...baseCaps }));
		return true;
	}
	out.push(findingFrom(res, inv.key ?? inv.id, inv.node, `when:${inv.id}`, { ...baseCaps }));
	return true;
};

const checkForbidImports = (f, ctx, baseCaps, inv, out, findingFrom) => {
	const hits = pipe(ctx.imports, filter((imp) => {
		const target = imp.resolved ?? imp.source;
		return target != null && f.re.test(target);
	}), map((imp) => ({ imp, caps: f.re.exec(imp.resolved ?? imp.source) })));
	for (const { imp, caps } of hits) {
		out.push(findingFrom({ key: f.key ?? "forbid", message: `import \`${imp.source}\` is not allowed here`, fix: null, pattern: imp.source, report: f.report }, inv.key ?? inv.id, inv.node, `forbid:${inv.id}`, { ...baseCaps, ...Object.fromEntries((caps ?? []).map((v, idx) => [idx, v])) }));
	}
};

const checkForbidContent = (f, ctx, baseCaps, inv, out, findingFrom) => {
	const lines = ctx.file.getFullText().split("\n");
	const hits = [];
	lines.forEach((line, i) => {
		const m = new RegExp(f.pattern).exec(line);
		if (m) hits.push({ line: i + 1, snippet: line.trim(), match: m[0] });
	});
	for (const h of hits) {
		const where = ctx.enclosingFunctionName(h.line) ? ` in \`${ctx.enclosingFunctionName(h.line)}\`` : "";
		const vars = { ...baseCaps, line: h.line, lines: pipe(hits, map((x) => String(x.line)), unique(), (ls) => ls.join(", ")), count: hits.length, plural: hits.length > 1 ? "s" : "", snippet: h.snippet, match: h.match, where };
		out.push(findingFrom({ key: f.key ?? "forbid", ...vars, report: f.report }, inv.key ?? inv.id, inv.node, `forbid:${inv.id}`, vars));
	}
};

const checkForbidSyntax = (f, ctx, baseCaps, inv, out, findingFrom) => {
	const re = f.pattern == null ? null : new RegExp(f.pattern);
	const hits = [];
	const visit = (node) => {
		if (node.getKindName() === f.kind) {
			const text = node.getText();
			const m = re == null ? text : re.exec(text);
			if (m) {
				const line = node.getStartLineNumber();
				hits.push({ line, snippet: text.split("\n")[0].trim().slice(0, 120), match: m[0] });
			}
		}
		node.forEachChild(visit);
	};
	visit(ctx.file);
	for (const h of hits) {
		const where = ctx.enclosingFunctionName(h.line) ? ` in \`${ctx.enclosingFunctionName(h.line)}\`` : "";
		const vars = { ...baseCaps, line: h.line, lines: pipe(hits, map((x) => String(x.line)), unique(), (ls) => ls.join(", ")), count: hits.length, plural: hits.length > 1 ? "s" : "", snippet: h.snippet, match: h.match, where };
		out.push(findingFrom({ key: f.key ?? "forbid", ...vars, report: f.report }, inv.key ?? inv.id, inv.node, `forbid:${inv.id}`, vars));
	}
};

const checkForbid = (inv, ctx, baseCaps, out, findingFrom) => {
	for (const f of inv.forbid) {
		if (f.except.some((g) => minimatch(ctx.path, g))) continue;
		if (f.type === "imports") checkForbidImports(f, ctx, baseCaps, inv, out, findingFrom);
		else if (f.type === "syntax") checkForbidSyntax(f, ctx, baseCaps, inv, out, findingFrom);
		else checkForbidContent(f, ctx, baseCaps, inv, out, findingFrom);
	}
};

const checkInvariant = (inv, ctx, caps, out, findingFrom) => {
	if (inv.except.some((g) => minimatch(ctx.path, g))) return;
	if (!matchNode(inv, ctx)) return;
	if (!matchWhere(inv, ctx)) return;
	const baseCaps = { ...caps, ...fileVars(ctx) };
	if (inv.report) out.push(findingFrom({ key: null, report: inv.report }, inv.key ?? inv.id, inv.node, `root:${inv.id}`, baseCaps));
	const gated = runWhen(inv, ctx, baseCaps, out, findingFrom);
	if (gated) checkForbid(inv, ctx, baseCaps, out, findingFrom);
	for (const child of inv.children) checkInvariant(child, ctx, { ...caps, ...baseCaps }, out, findingFrom);
};

module.exports = { normalizeInvariant, checkInvariant };

"use strict";

const { pipe, map, filter, sort, flatMap, unique } = require("remeda");
const { asReport, nodePrefixRe, compileChild } = require("../utils");

const isFolderName = (name) => !/[^/]+\.[A-Za-z0-9]+$/.test(String(name).split("/").pop());

const normalizeChild = (c) => {
	if (typeof c === "string") {
		const { re, captures } = compileChild(c);
		return { name: c, re, captures, folder: isFolderName(c), forbidden: false, report: null, description: null };
	}
	const { re, captures } = compileChild(c.name);
	return { name: c.name, re, captures, folder: isFolderName(c.name), forbidden: !!c.forbidden, report: asReport(c.report), description: c.description == null ? null : String(c.description) };
};

const buildTree = (rawNodes) => {
	const list = Array.isArray(rawNodes) ? rawNodes : Object.values(rawNodes);
	const bySlugRaw = Object.fromEntries(list.map((n) => [n.slug, n]));
	const slugs = Object.keys(bySlugRaw);
	if (new Set(slugs).size !== slugs.length) throw new Error("duplicate node slug in architecture.nodes");
	const computePath = (slug, depth = 0) => {
		const n = bySlugRaw[slug];
		if (!n) throw new Error(`node ${slug}: unknown parent`);
		if (depth > 10) throw new Error(`node ${slug}: parent chain too deep (cycle?)`);
		if (!n.parent) return n.name;
		const parent = computePath(n.parent, depth + 1);
		return `${parent}/${n.name}`;
	};
	const make = (slug) => {
		const n = bySlugRaw[slug];
		const path = computePath(slug);
		const { re, names } = nodePrefixRe(path);
		return {
			slug,
			name: n.name,
			parent: n.parent ?? null,
			path,
			prefixRe: re,
			prefixNames: names,
			closed: !!n.closed,
			description: n.description == null ? null : String(n.description),
			report: asReport(n.report),
			children: pipe(n.children ?? [], map((c) => normalizeChild(c))),
		};
	};
	const all = pipe(slugs, map(make));
	const bySlug = Object.fromEntries(all.map((n) => [n.slug, n]));
	for (const n of all) {
		if (n.parent && !bySlug[n.parent]) throw new Error(`node ${n.slug}: unknown parent \`${n.parent}\``);
	}
	const roots = all.filter((n) => !n.parent);
	return { roots, all, bySlug, slugs };
};

const matchNode = (relPath, node) => {
	const m = node.prefixRe.exec(relPath);
	if (!m) return null;
	const segIdx = node.prefixNames.length;
	const caps = Object.fromEntries(node.prefixNames.map((n, i) => [n, m[i + 1]]));
	return { node, seg: m[segIdx + 1], isFile: m[segIdx + 2] == null, caps };
};

const deepestMatch = (relPath, arch) => {
	const matches = pipe(
		arch.nodes.all,
		map((node) => matchNode(relPath, node)),
		filter(Boolean),
		sort((x) => x.node.path.length),
	);
	return matches.length ? matches[matches.length - 1] : null;
};

const findChild = (children, seg, isFile) => pipe(children, filter((c) => c.folder === !isFile && c.re.test(seg)), (r) => (r.length ? r[0] : null));

const checkEntry = (match, child, out, findingFrom) => {
	const vars = { basename: match.seg, ...match.caps };
	if (child && child.forbidden) {
		out.push(findingFrom({ key: "forbidden", report: child.report }, "nodes", match.node.slug, `nodes:${match.node.slug}:forbidden`, vars));
		return;
	}
	if (!child && match.node.closed) {
		out.push(findingFrom({ key: "closed", report: match.node.report }, "nodes", match.node.slug, `nodes:${match.node.slug}:closed`, vars));
	}
};

const checkTree = (relPath, arch, out, finding) => {
	const match = deepestMatch(relPath, arch);
	if (!match) return;
	if (match.isFile) {
		checkEntry(match, findChild(match.node.children, match.seg, true), out, finding);
		return;
	}
	const m = match.node.prefixRe.exec(relPath);
	const parts = m[match.node.prefixNames.length + 2].split("/");
	let node = match.node;
	for (const part of parts) {
		const child = findChild(node.children, part, false);
		checkEntry({ node, seg: part, isFile: false }, child, out, finding);
		node = child ? arch.nodes.bySlug[child.name] ?? null : null;
		if (!node) break;
	}
};

const matchers = (arch) => {
	const nodeRes = arch.nodes.all.map((n) => n.prefixRe);
	const invRes = arch.invariants.map((i) => i.where?.re).filter(Boolean);
	const all = [...nodeRes, ...invRes];
	return (rel) => all.some((re) => re.test(rel));
};

module.exports = { buildTree, checkTree, matchers };

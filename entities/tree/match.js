"use strict";

// A path → the node it is, and whether that node is really an instance there.

const fs = require("node:fs");
const path = require("node:path");
const { pipe, filter, map, sort } = require("remeda");
const { nodePathRe } = require("../../nodes/children");

const matchNode = (node, relPath) => {
	for (const v of node.variants) {
		const m = v.re.exec(relPath);
		if (!m) continue;
		const claim = v.claims?.find((c) => (v.names[c.index] != null) && m[c.index + 1] === c.value);
		if (claim) continue;
		const seg = v.isFile ? relPath.split("/").pop() : m[v.names.length + 1];
		return { node: { ...node, path: v.path, prefixRe: v.re, prefixNames: v.names, literalLen: v.literalLen, isFile: v.isFile }, seg, caps: Object.fromEntries(v.names.map((nm, i) => [nm, m[i + 1]])) };
	}
	return null;
};

const instanceCache = new WeakMap();
const isRealInstance = (node, folder, arch) => {
	const required = (node.children ?? []).filter((c) => c.required);
	if (!required.length) return true;
	const root = arch?.repoRoot;
	if (!root || !folder) return true;
	let byFolder = instanceCache.get(arch);
	if (!byFolder) {
		byFolder = new Map();
		instanceCache.set(arch, byFolder);
	}
	const key = `${node.slug}::${folder}`;
	if (byFolder.has(key)) return byFolder.get(key);
	const present = (child) => {
		try {
			const abs = path.join(root, folder, child.folder ? child.name : child.name);
			const st = fs.statSync(abs);
			return child.folder ? st.isDirectory() : st.isFile();
		} catch {
			return false;
		}
	};
	const ok = required.every(present);
	byFolder.set(key, ok);
	return ok;
};

const ancestorsAreReal = (node, relPath, arch) => {
	const segs = String(relPath).split("/");
	const seen = new Set();
	const walk = (n) => {
		for (const slug of n.parents ?? []) {
			const parent = arch.nodes?.bySlug?.[slug];
			if (!parent || seen.has(slug)) continue;
			seen.add(slug);
			const variant = parent.variants.find((v) => v.re.test(relPath));
			if (variant && (parent.children ?? []).some((c) => c.required)) {
				const folder = segs.slice(0, variant.path.split("/").length).join("/");
				if (!isRealInstance(parent, folder, arch)) return false;
			}
			if (!walk(parent)) return false;
		}
		return true;
	};

	return walk(node);
};

const allMatches = (relPath, arch) =>
	pipe(
		arch.nodes.all,
		filter((n) => n.variants.some((v) => v.re.test(relPath))),
		filter((n) => ancestorsAreReal(n, relPath, arch)),
		map((n) => matchNode(n, relPath)),
		filter(Boolean),
		sort((a, b) => a.node.literalLen - b.node.literalLen || a.node.path.length - b.node.path.length),
	);

const folderOwner = (arch, folder) => {
	if (!folder) return null;
	const hits = arch.nodes.all
		.filter((n) => n.variants.some((v) => nodePathRe(v.path).test(folder)))
		.sort((a, b) => a.literalLen - b.literalLen || a.path.length - b.path.length);

	return hits.length ? hits[hits.length - 1] : null;
};

const instanceAt = (arch, slug, folder) => {
	if (!folder) return false;
	const owner = folderOwner(arch, folder);
	if (owner?.slug !== slug) return false;

	return isRealInstance(owner, folder, arch);
};

const deepestMatch = (relPath, arch) => {
	const r = allMatches(relPath, arch);
	return r.length ? r[r.length - 1] : null;
};

const placeholderPositions = (arch) => {
	const pos = {};
	const globs = [];
	for (const role of Object.values(arch.codeRoles ?? {})) {
		for (const entry of [...(role.where ?? []), ...Object.values(role.actions ?? {}).flatMap((a) => a.where ?? [])]) {
			if (entry.type === "glob") globs.push(entry.glob);
		}
	}
	for (const glob of globs) {
		glob.split("/").forEach((seg, i) => {
			const m = seg.match(/^\{([\w-]+)\}$/);
			if (!m) return;
			if (pos[m[1]] == null) pos[m[1]] = i;
			else if (pos[m[1]] !== i) pos[m[1]] = -1; // not positional
		});
	}
	return pos;
};

const targetCapsFor = (relPath, arch) => {
	const caps = allMatches(relPath, arch).reduce((acc, m) => ({ ...acc, ...m.caps }), {});
	const segs = relPath.split("/");
	for (const [nm, idx] of Object.entries(placeholderPositions(arch))) {
		if (idx > 0 && !(nm in caps)) {
			const seg = segs[idx];
			if (seg != null && !seg.includes("{")) caps[nm] = seg;
		}
	}
	return caps;
};

module.exports = { matchNode, deepestMatch, folderOwner, instanceAt, ancestorsAreReal, placeholderPositions, targetCapsFor, allMatches };

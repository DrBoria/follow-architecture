"use strict";

// A path → the node it is, and whether that node is really an instance there.

import * as fs from "node:fs";
import * as path from "node:path";
import { nodePathRe } from "../../nodes/children";
import type { Arch, ArchChild, ArchNode } from "../architecture";

// One variant's captures: the placeholder name → the segment it matched.
type Caps = Record<string, string | undefined>;
type NodeMatch = { node: ArchNode; seg: string | undefined; caps: Caps };

const matchNode = (node: ArchNode, relPath: string): NodeMatch | null => {
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

const instanceCache = new WeakMap<Arch, Map<string, boolean>>();
const isRealInstance = (node: ArchNode, folder: string | null | undefined, arch: Arch | null | undefined): boolean => {
	const required = (node.children ?? []).filter((c) => c.required);
	if (!required.length) return true;
	const root = arch?.repoRoot;
	if (!arch || !root || !folder) return true;
	let byFolder = instanceCache.get(arch);
	if (!byFolder) {
		byFolder = new Map<string, boolean>();
		instanceCache.set(arch, byFolder);
	}
	const key = `${node.slug}::${folder}`;
	const cached = byFolder.get(key);
	if (cached !== undefined) return cached;
	const present = (child: ArchChild): boolean => {
		try {
			if (!child.name) return false;
			const abs = path.join(root, folder, child.name);
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

const ancestorsAreReal = (node: ArchNode, relPath: string, arch: Arch): boolean => {
	const segs = String(relPath).split("/");
	const seen = new Set<string>();
	const walk = (n: ArchNode): boolean => {
		for (const slug of n.parents) {
			if (slug == null) continue;
			const parent = arch.nodes.bySlug[slug];
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

const allMatches = (relPath: string, arch: Arch): NodeMatch[] => {
	const found: NodeMatch[] = [];
	for (const n of arch.nodes.all) {
		if (!n.variants.some((v) => v.re.test(relPath))) continue;
		if (!ancestorsAreReal(n, relPath, arch)) continue;
		const m = matchNode(n, relPath);
		if (m) found.push(m);
	}
	found.sort((a, b) => a.node.literalLen - b.node.literalLen || a.node.path.length - b.node.path.length);
	return found;
};

const folderOwner = (arch: Arch, folder: string | null | undefined): ArchNode | null => {
	if (!folder) return null;
	const hits = arch.nodes.all
		.filter((n) => n.variants.some((v) => nodePathRe(v.path).test(folder)))
		.sort((a, b) => a.literalLen - b.literalLen || a.path.length - b.path.length);

	return hits.length ? hits[hits.length - 1] : null;
};

const instanceAt = (arch: Arch, slug: string, folder: string | null | undefined): boolean => {
	if (!folder) return false;
	const owner = folderOwner(arch, folder);
	if (owner?.slug !== slug) return false;

	return isRealInstance(owner, folder, arch);
};

const deepestMatch = (relPath: string, arch: Arch): NodeMatch | null => {
	const r = allMatches(relPath, arch);
	return r.length ? r[r.length - 1] : null;
};

const placeholderPositions = (arch: Arch): Record<string, number> => {
	const pos: Record<string, number> = {};
	const globs: string[] = [];
	for (const role of Object.values(arch.codeRoles)) {
		for (const entry of Object.values(role.actions).flatMap((a) => a.where ?? [])) {
			if (entry.type === "glob" && entry.glob != null) globs.push(entry.glob);
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

const targetCapsFor = (relPath: string, arch: Arch): Caps => {
	const caps: Caps = allMatches(relPath, arch).reduce<Caps>((acc, m) => ({ ...acc, ...m.caps }), {});
	const segs = relPath.split("/");
	for (const [nm, idx] of Object.entries(placeholderPositions(arch))) {
		if (idx > 0 && !(nm in caps)) {
			const seg = segs[idx];
			if (seg != null && !seg.includes("{")) caps[nm] = seg;
		}
	}
	return caps;
};

export { matchNode, deepestMatch, folderOwner, instanceAt, ancestorsAreReal, placeholderPositions, targetCapsFor, allMatches };
export type { NodeMatch, Caps };

"use strict";

// Walk a path and report entries the folder does not declare.

const { pipe, filter } = require("remeda");
const { fillTemplate, placeFor, dirOf, boxOfPlace } = require("../../entities/location");
const { missingRequiredChild } = require("../../nodes/children");
const { folderOwner, deepestMatch } = require("./match");
const { choose: chooseStructure, render: renderStructure } = require("../../report/errorTypes/codes/structure");

const findChild = (children, seg, isFile) => pipe(children, filter((c) => c.folder === !isFile && c.re.test(seg)), (r) => (r.length ? r[0] : null));

const templateNode = (arch, parentSlug, child, relPath) =>
	pipe(
		arch.nodes.all,
		filter((n) => n.parents.includes(parentSlug) && n.name === child.name && n.variants.some((v) => v.re.test(relPath))),
		(r) => (r.length ? r[r.length - 1] : null),
	);

const checkEntry = (match, child, out, findingFrom, arch, facts, repoFiles) => {
	const vars = { path: match.rel, basename: match.seg, ...match.caps };
	if (child && child.forbidden) {
		out.push(findingFrom({ key: "forbidden", report: child.report }, "nodes", match.node.slug, `nodes:${match.node.slug}:forbidden`, vars));
		return;
	}
	if (!child) {
		if ((match.node.variants ?? []).some((v) => v.isFile)) return;
		const hasRequired = (match.node.children ?? []).some((c) => c.required);
		if (repoFiles && hasRequired && match.node.required !== true && missingRequiredChild(match.node, arch, match.rel, repoFiles, fillTemplate)) return;
		const allowed = (match.node.children ?? []).map((c) => (c.folder ? `${c.name}/` : c.name));
		// What the folder is FOR, in the reader's words: "a feature holds: …".
		const seen = allowed.length ? ` A \`${match.node.slug}\` folder holds: ${allowed.map((n) => `\`${n}\``).join(", ")}.` : "";
		const spots = [];
		const ownDir = dirOf(match.rel);
		const homeHere = [];
		for (const role of facts?.roles ?? []) {
			const def = arch?.codeRoles?.[role];
			if (!def) continue;
			const place = placeFor(arch, role, match.rel);
			if (!place) continue;
			if (place.path === ownDir || place.path === match.rel) homeHere.push(role);
			else spots.push({ role, path: place.path, folder: place.folder, file: place.folder ? null : place.path });
		}
		const roles = facts?.roles ?? [];
			// The folder was already asked for above (`ownDir`): the same path minus
			// its last segment is not a second question.
			const folder = ownDir;
		const declared = folderOwner(arch, folder);
		const parent = declared ? null : match.node.parents?.[0] ? arch.nodes?.bySlug?.[match.node.parents[0]] : null;
		const homeFiles = new Map(
			spots
				.filter((sp) => !sp.folder && sp.file === sp.path)
				.map((sp) => [sp.role, sp.path]),
		);
		const mergeInto = [...homeFiles.entries()];
		const held = [...new Set(spots.map((sp) => sp.role))];
		const heldAll = [...new Set(roles)];
		const dest = spots[0]?.path ?? null;
		const mergeTarget = mergeInto[0]?.[1] ?? null;
		const named = (match.node.children ?? []).find((c) => !c.folder)?.name ?? "the declared pattern";
		const verdict = renderStructure(
			chooseStructure({
				asDir: match.isFile === false,
				dest,
				duplicate: mergeTarget,
				homeHere,
				roles: heldAll,
				held,
				named,
				seen,
			}),
			{ asDir: match.isFile === false, dest, duplicate: mergeTarget, homeHere, roles: heldAll, held, named, seen },
		);
		const { ask, message, fix } = verdict;
		// The destination the SENTENCE names, as the box it is. `dest` is a path
		// (a folder, or the file a role lives in) — the picture needs the node, and
		// the picture and the sentence must come from this one place.
		const destNode = boxOfPlace(arch, dest);
		// `to` is not decoration: `fix` says "Move … to X" and this is X. When the
		// place is a TEMPLATE (`apps/backend/{kebab-case}/store.ts`) there is no box
		// to land on, and the repair says what it means another way: the code LEAVES
		// what it is in now (`from`), so the picture marks that box instead of
		// drawing an arrow into a placeholder.
		const stated = {
			ask,
			message,
			fix,
			to: destNode ? [destNode] : [],
			path: dest,
			from: destNode ? null : boxOfPlace(arch, match.rel) ?? match.node?.slug ?? null,
		};
		out.push(
			findingFrom(
				{
					key: "closed",
					report: match.node.report ?? stated,
				},
				"nodes",
				match.node.slug,
				`nodes:${match.node.slug}:closed`,
				vars,
			),
		);
	}
};

const checkTree = (relPath, arch, out, finding, facts, repoFiles) => {
	const match = deepestMatch(relPath, arch);
	if (!match) return;
	if (match.isFile) {
		checkEntry({ node: match.node, seg: match.seg, isFile: true, caps: match.caps, rel: relPath }, findChild(match.node.children, match.seg, true), out, finding, arch, facts, repoFiles);
		return;
	}
	const m = match.node.prefixRe.exec(relPath);
	const rest = m[match.node.prefixNames.length + 2];
	const parts = rest == null ? [match.seg] : [match.seg, ...rest.split("/")];
	let node = match.node;
	for (let idx = 0; idx < parts.length; idx += 1) {
		const last = idx === parts.length - 1;
		const child = findChild(node.children, parts[idx], last);
		checkEntry({ node, seg: parts[idx], isFile: last, caps: match.caps, rel: relPath }, child, out, finding, arch, facts, repoFiles);
		if (!child) {
			node = null;
			break;
		}
		node = child.slug ? arch.nodes.bySlug[child.slug] ?? null : templateNode(arch, node.slug, child, relPath);
		if (!node) break;
	}
};

module.exports = { checkTree, findChild, templateNode };

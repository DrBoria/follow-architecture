"use strict";

// Required children: is this folder an instance of its node, and is anything
// the node requires missing.

import { fillTemplate, placeFor } from "../../entities/location";
import { folderContents, ancestorChain } from "../children";
import type { Arch, ArchChild, ArchNode } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { Finding, FindingFrom } from "../../entities/findings";

// Where the run remembers which folders it has already spoken for.
const foldersOf = (ctx: FileContext): Set<string> => ctx.dedupe?.get("required") ?? new Set<string>();

const remember = (ctx: FileContext, folders: Set<string>, key: string): void => {
	folders.add(key);
	ctx.dedupe?.set("required", folders);
};

// A home outside the folder: a place the code could move to. A home inside
// (or the folder itself) is not an offer.
const outsideHome = (path: string | null, folder: string): path is string => Boolean(path) && path !== folder && !path.startsWith(`${folder}/`);

// The homes the file's own roles would put its code in, outside this folder —
// the destinations a "this folder is not described" finding can offer.
const homesOutside = (ctx: FileContext, arch: Arch, folder: string): Map<string, string> => {
	const byPath = new Map<string, string>();
	for (const c of ctx.facts?.candidates ?? []) {
		if (!c.role) continue;
		const path = placeFor(arch, c.role, ctx.rel)?.path ?? null;
		if (outsideHome(path, folder) && !byPath.has(path)) byPath.set(path, c.role);
	}

	return byPath;
};

// A folder none of the node's declared children are in: not a folder this
// architecture describes. Said once per folder.
const foreignFolder = (...args: [ctx: FileContext, owner: ArchNode, folder: string, declared: ArchChild[], out: Finding[], findingFrom: FindingFrom]): void => {
	const [ctx, owner, folder, declared, out, findingFrom] = args;
	const arch = ctx.arch;
	const key = `nodes:${owner.slug}:foreign:${folder}`;
	const folders = foldersOf(ctx);
	if (folders.has(key)) return;
	remember(ctx, folders, key);
	const byPath = homesOutside(ctx, arch, folder);
	const where = byPath.size ? [...byPath.entries()].map(([path, role]) => `\`${path}\` (${role})`).join(" and ") : null;
	out.push(
		findingFrom(
			{
				key,
				report: {
					ask: "move",
					message: `\`${folder}\` is not a folder this architecture describes: none of the files node \`${owner.slug}\` declares are here (${declared.map((c) => `\`${c.name}${c.folder ? "/" : ""}\``).join(", ")}).`,
					fix: where ? `Move each part of \`${folder}\` to its own home: ${where}.` : null,
				},
			},
			"nodes",
			owner.slug,
			`nodes:${owner.slug}:foreign`,
			{ path: ctx.rel, folder, node: owner.slug },
		),
	);
};

// One required child missing from the folder: the node's own report, or the
// default "create it" demand. Said once per (folder, child).
const missingChild = (...args: [ctx: FileContext, owner: ArchNode, folder: string, child: ArchChild, out: Finding[], findingFrom: FindingFrom]): void => {
	const [ctx, owner, folder, child, out, findingFrom] = args;
	const key = `nodes:${owner.slug}:required:${folder}:${child.name}`;
	const folders = foldersOf(ctx);
	if (folders.has(key)) return;
	remember(ctx, folders, key);
	out.push(
		findingFrom(
			{
				key,
				report: child.report ?? {
					ask: "add",
					message: `\`{folder}\` is not a \`{node}\`: \`{child}\` is required here and is missing.`,
					fix: `Create \`{child}\` in \`{folder}\`.`,
				},
				data: { node: owner.slug, folder, missing: child.name },
			},
			"nodes",
			owner.slug,
			`nodes:${owner.slug}:required`,
			{ path: ctx.rel, folder, node: owner.slug, child: child.name, missing: child.name },
		),
	);
};

// The required children the folder does not hold.
const missingOf = (required: ArchChild[], present: ReadonlySet<string>): ArchChild[] => required.filter((child) => ![...present].some((name) => child.re.test(name)));

// One owner's required children, checked against what the folder holds.
const checkOwner = (ctx: FileContext, owner: ArchNode, out: Finding[], findingFrom: FindingFrom): void => {
	const required = (owner.children ?? []).filter((c) => c.required);
	const folder = required.length ? fillTemplate(owner.path, ctx.rel) : null;
	if (!folder) return;
	const { present, declared, anyDeclared } = folderContents(owner, folder, ctx.repoFiles);
	if (!anyDeclared) {
		foreignFolder(ctx, owner, folder, declared, out, findingFrom);

		return;
	}
	for (const child of missingOf(required, present)) missingChild(ctx, owner, folder, child, out, findingFrom);
};

const checkRequiredChildren = (ctx: FileContext, node: ArchNode, out: Finding[], findingFrom: FindingFrom): void => {
	for (const owner of ancestorChain(node, ctx.arch)) checkOwner(ctx, owner, out, findingFrom);
};

export { checkRequiredChildren };

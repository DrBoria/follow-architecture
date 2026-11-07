"use strict";

// Required children: is this folder an instance of its node, and is anything
// the node requires missing.

const { fillTemplate } = require("../../entities/location");
const { folderContents, ancestorChain } = require("../children");
const { placeFor } = require("../../entities/location");

const checkRequiredChildren = (ctx, arch, node, out, findingFrom) => {
	const folders = (ctx.dedupe ?? new Map()).get("required") ?? new Set();
	for (const owner of ancestorChain(node, arch)) {
		const required = (owner.children ?? []).filter((c) => c.required);
		if (!required.length) continue;
		const folder = fillTemplate(owner.path, ctx.rel);
		if (!folder) continue;
		const { present, declared, anyDeclared } = folderContents(owner, folder, ctx.repoFiles);
		if (!anyDeclared) {
			const key = `nodes:${owner.slug}:foreign:${folder}`;
			if (!folders.has(key)) {
				folders.add(key);
				if (ctx.dedupe) ctx.dedupe.set("required", folders);
				const homes = (ctx.facts.candidates ?? [])
					.map((c) => c.role)
					.filter(Boolean)
					.map((role) => ({ role, path: placeFor(arch, role, ctx.rel)?.path ?? null }))
					.filter((r) => r.path && r.path !== folder && !r.path.startsWith(`${folder}/`));
				const byPath = new Map();
				for (const h of homes) if (!byPath.has(h.path)) byPath.set(h.path, h.role);
				const dest = homes[0]?.path ?? null;
				const where = byPath.size
					? [...byPath.entries()].map(([path, role]) => `\`${path}\` (${role})`).join(" and ")
					: null;
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
			}
			continue;
		}
		for (const child of required) {
			if ([...present].some((name) => child.re.test(name))) continue;
			const key = `nodes:${owner.slug}:required:${folder}:${child.name}`;
			if (folders.has(key)) {
					continue;
			}
			folders.add(key);
			if (ctx.dedupe) ctx.dedupe.set("required", folders);
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
		}
	}

};

module.exports = { checkRequiredChildren };

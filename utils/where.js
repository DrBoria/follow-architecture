"use strict";

// THE `where` mechanism — one implementation, used by everything that needs to
// say "here" or "by this code":
//
//   node children `role:`             — where code of that role may live
//   codeRole.actions.<name>.where     — where/by whom THAT action may be done
//                                       (import, export, call, mutate, read,
//                                       export, or any custom name mapped to a
//                                       fact class with `of:`)
//   invariant.where / invariant.except — which files the rule applies to
//
// The same entry syntax means the same thing in all three places: a `where`
// in an invariant can name roles and use filters exactly like one in an
// action, because it is literally the same matcher.
//
// An entry is one of:
//
//   { role: "action" }          code that IS that role (its file declares it)
//   { role: "action", same: true }  …and in the SAME node instance as the target
//   { node: "backend-test" }    any file under that declared node
//   { template: "apps/{app}/actions/**" }  a path built from the tree (role homes)
//   "apps/backend/**/*.ts"      a path pattern (the tree already owns paths —
//                               prefer `{ node }`)
//   { <filter> }                any filter over the file's facts
//
// A bare string that names a declared codeRole is read as a role reference, so
// `where: [storeModel]` and `where: [{ role: storeModel }]` mean the same.

const { matches } = require("../entities/queries");
const { compilePattern } = require("../utils/pattern");

const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Normalize one entry. `roles` (a Set of declared slugs) lets a bare string
// that names a role become a role reference; without it every string is a glob.
const parseWhereEntry = (entry, roles = null) => {
	if (typeof entry === "string") {
		if (roles?.has(entry) && !entry.includes("/") && !entry.includes("*")) return { type: "role", role: entry, same: false };
		return { type: "glob", glob: entry };
	}
	// `via: import` — this actor reaches the target by importing it (a controller
	// holds the root store), not through the object tree. It says nothing about
	// WHO may do it; it only stops the picture from claiming the tree chains.
	if (entry.role != null) return { type: "role", role: String(entry.role), same: Boolean(entry.same), via: entry.via === "import" ? "import" : null };
	if (entry.node != null) return { type: "node", node: String(entry.node) };
	// A template comes from the NODE tree (a child's `role:`), so it carries the
	// node's `{placeholders}` and resolves them against the file being checked.
	if (entry.template != null) return { type: "template", template: String(entry.template) };
	return { type: "query", query: entry };
};

const parseWhere = (value, roles = null) => toList(value).map((e) => parseWhereEntry(e, roles));

// Does this entry designate `rel` for a file with these facts?
//   targetCaps — placeholder captures of the TARGET path; an entry using the
//   same placeholder must agree with it (`{kebab-case}` = the same feature).
const matchesWhere = (entry, rel, arch, facts, targetCaps) => {
	if (!entry) return false;
	const pattern = entry.type === "glob" ? entry.glob : entry.type === "template" ? entry.template : null;
	if (pattern) {
		const { re, names } = compilePattern(pattern);
		const m = re.exec(rel);
		if (!m) return false;
		if (targetCaps) {
			for (let i = 0; i < names.length; i += 1) {
				if (names[i] in targetCaps && m[i + 1] !== targetCaps[names[i]]) return false;
			}
		}
		return true;
	}
	if (entry.type === "role") {
		if (!(facts?.roles ?? []).includes(entry.role)) return false;
		if (!entry.same) return true;
		// `same: true` — the source must be an instance of the SAME node
		// template as the target, with every shared placeholder equal.
		const { deepestMatch, matchNode } = require("../nodes/tree");
		const sourceCaps = matchNode(deepestMatch(rel, arch)?.node, rel)?.caps ?? {};
		for (const [name, value] of Object.entries(targetCaps ?? {})) {
			if (!(name in sourceCaps) || sourceCaps[name] !== value) return false;
		}
		return true;
	}
	if (entry.type === "node") {
		const node = arch?.nodes?.bySlug?.[entry.node];
		if (!node) return false;
		return node.variants.some((v) => v.re.test(rel));
	}
	return matches(facts, entry.query, { arch, fileRel: rel });
};

// `true` when NO entry allows it. A boolean, not a reason: a reason with a fixed
// prefix ("allowed from: …") is a sentence nobody asked for — a finding builds
// its own text from `labelOf`.
const checkWhere = (entries, rel, arch, facts, targetCaps) => {
	for (const entry of entries ?? []) if (matchesWhere(entry, rel, arch, facts, targetCaps)) return false;

	return true;
};

// How code is reached through a declared accessor without an import:
// `{ scope: function, segments: [getRoot] }` → `getRoot(…)`.
const accessorLabel = (e) => (e?.scope === "function" || e?.scope === "method" ? `${e.segments.join(".")}(…)` : (e?.segments ?? []).join("."));

// How one `where` entry reads inside a sentence — the ONE place that knows the
// entry vocabulary (`role` / `node` / `glob` / `template` / filter).
const labelOf = (entry) => {
	if (!entry) return "—";
	if (entry.type === "role") return `role:${entry.role}`;
	if (entry.type === "node") return `node:${entry.node}`;
	if (entry.type === "glob") return entry.glob;
	if (entry.type === "template") return entry.template;

	return "filter";
};

// A declared template resolved to a concrete path. ONE implementation, used by
// every caller that needs "where does this template point for THIS file":
//   • `{placeholder}` segments take the file's own segment at the same index;
//   • `caps` (a capture map) wins when a placeholder sits somewhere else —
//     `{kebab-case}` declared at index 2 for a path that carries it at index 1;
//   • a trailing `**` disappears, a fixed tail (`{kebab-case}.ts`) and a glob
//     segment (`*.d.ts`) keep the file's own name.
const fillTemplate = (template, rel = null, caps = null) => {
	if (template == null) return null;
	const segs = String(template).split("/");
	const relSegs = String(rel ?? "").split("/").filter(Boolean);
	const nameOf = (seg) => /^\{([^}]+)\}$/.exec(seg)?.[1] ?? null;
	const out = [];
	for (let i = 0; i < segs.length; i += 1) {
		const seg = segs[i];
		if (seg === "**") break;
		const whole = nameOf(seg);
		if (whole != null) {
			out.push(caps?.[whole] ?? relSegs[i] ?? seg);
			continue;
		}
		// A segment that is a placeholder PLUS a fixed tail (`{kebab-case}.ts`)
		// keeps the file's own name: the file moves, its name does not.
		const tail = /\{[^}]+\}([^{]*)$/.exec(seg)?.[1];
		if (tail != null) {
			const own = relSegs[relSegs.length - 1];
			out.push(own && own !== seg && own.endsWith(tail) ? own : seg);
			continue;
		}
		// A glob segment (`*.d.ts`) names a FAMILY of files; the destination is
		// this file's own name in that family.
		if (seg.includes("*")) {
			const own = relSegs[relSegs.length - 1];
			const suffix = seg.slice(seg.indexOf("*") + 1);
			const stem = own ? own.replace(/\.[^.]*$/, "") : null;
			out.push(stem ? `${stem}${suffix}` : seg);
			continue;
		}
		out.push(seg);
	}
	return out.join("/") || String(rel ?? "").split("/").slice(0, -1).join("/");
};

// The concrete PLACE an entry designates for this file — the same `where`
// grammar, resolved to one string by the one filler. A `{ node }` entry gives
// that node's instance folder, a template or glob gives the path it names, and a
// filter names no place at all and falls back to the file's own directory. This
// is what "one finding per ..." groups by: the entry says WHICH place, the engine
// only counts.
const entryKey = (entry, rel, arch, facts) => {
	if (!matchesWhere(entry, rel, arch, facts ?? {}, null)) return null;
	const fileDir = String(rel ?? "").split("/").slice(0, -1).join("/");
	const template = entry?.type === "node" ? arch?.nodes?.bySlug?.[entry.node]?.path : entry?.template ?? entry?.glob;
	const filled = fillTemplate(template, rel);
	if (filled == null) return fileDir;
	// A template that names a FAMILY (`…/actions/*.ts`) designates the folder the
	// family lives in, so one report covers all of its members.
	const star = String(template).split("/").findIndex((s) => s.includes("*"));
	if (star === -1) return filled;

	return filled.split("/").slice(0, star).join("/") || fileDir;
};

module.exports = {parseWhere, matchesWhere, checkWhere, labelOf, accessorLabel, entryKey, fillTemplate, toList};

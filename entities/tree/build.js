"use strict";

// Nodes → path variants (one per parent) + the role homes they imply.

const { nodePrefixRe, compileChild, rolesOf } = require("../../nodes/children");

const variantsOf = (n, parentPaths) => {
	const parents = Array.isArray(n.parent) ? n.parent : n.parent ? [n.parent] : [null];
	return parents.map((p) => {
		const base = p == null ? null : parentPaths[p];
		const path = base == null || base === "." ? n.name : `${base}/${n.name}`;
		const { re, names, literalLen, isFile } = nodePrefixRe(path);
		return { path, re, names, literalLen, isFile };
	});
};

const NODE_KEYS = new Set(["slug", "name", "parent", "children", "report", "role"]);

const make = (n) => {
	for (const key of Object.keys(n)) {
		if (NODE_KEYS.has(key)) continue;
		throw new Error(`node ${n.slug}: unknown key \`${key}\` — a node is structure only (${[...NODE_KEYS].join(", ")}); roles, actions and \`where\` live on the codeRole`);
	}
	const parents = Array.isArray(n.parent) ? n.parent : n.parent ? [n.parent] : [null];
	return {
		slug: n.slug,
		name: n.name,
		parent: n.parent,
		parents,
		children: (n.children ?? []).map(compileChild),
		// `role:` on the node itself = the whole folder is that code (its `**`).
		roles: rolesOf(n),
		report: n.report,

	};
};

const buildTree = (nodes) => {
	const list = Array.isArray(nodes) ? nodes : nodes ? Object.entries(nodes).map(([k, v]) => (v.slug ? v : { ...v, slug: k })) : [];
	const all = list.map(make);
	const bySlug = Object.fromEntries(all.map((n) => [n.slug, n]));
	for (const n of all) {
		for (const p of n.parents) {
			if (p != null && !bySlug[p]) throw new Error(`node ${n.slug}: unknown parent ${p}`);
		}
	}
	const resolvedPath = {};
	const resolvePath = (n) => {
		if (resolvedPath[n.slug] != null) return resolvedPath[n.slug];
		const parentPaths = {};
		for (const p of n.parents) if (p != null) parentPaths[p] = resolvePath(bySlug[p]);
		n.variants = variantsOf(n, parentPaths);
		resolvedPath[n.slug] = n.variants[0].path;
		return resolvedPath[n.slug];
	};
	for (const n of all) resolvePath(n);
	// `{ node: slug }` children borrow the referenced node's own name template.
	for (const n of all) {
		for (const child of n.children) {
			if (!child.nodeSlug) continue;
			const target = bySlug[child.nodeSlug];
			if (!target) throw new Error(`node ${n.slug}: child references unknown node ${child.nodeSlug}`);
			const compiled = compileChild(target.name);
			child.re = compiled.re;
			child.captures = compiled.captures;
			child.name = target.name;
			child.folder = compiled.folder;
			if (!child.roles?.length) child.roles = target.roles ?? [];
		}
	}
	for (const n of all) {
		if (!n.roles?.length) continue;
		for (const c of n.children) {
			if (c.nodeSlug || c.roles?.length) continue;
			c.roles = n.roles;
		}
	}
	for (const n of all) {
		const v0 = n.variants[0];
		n.path = v0.path;
		n.re = v0.re;
		n.prefixRe = v0.re;
		n.prefixNames = v0.names;
		n.literalLen = v0.literalLen;
		n.isFile = v0.isFile;
	}
	const roleHomes = {};
	const addHome = (role, template, nodeSlug) => {
		const list = (roleHomes[role] ??= []);
		if (!list.some((h) => h.template === template)) list.push({ template, node: nodeSlug });
	};
	// A node that declares `role:` IS that code: its folder (or the file itself).
	for (const n of all) {
		if (!n.roles?.length) continue;
		for (const v of n.variants) for (const role of n.roles) addHome(role, v.isFile ? v.path : `${v.path === "." ? "" : `${v.path}/`}**`, n.slug);
	}
	for (const n of all) {
		for (const child of n.children) {
			if (!child.roles?.length) continue;
			const bases = child.nodeSlug
				? (bySlug[child.nodeSlug]?.variants ?? []).map((v) => ({ path: v.path, node: child.nodeSlug }))
				: n.variants.map((v) => ({ path: v.path === "." ? child.name : `${v.path}/${child.name}`, node: n.slug }));
			for (const base of bases) {
				// A folder child owns everything below it; a file child only itself.
				const template = child.folder ? `${base.path}/**` : base.path;
				for (const role of child.roles) addHome(role, template, base.node);
			}
		}
	}

	const literalClaims = (parent) => {
		const names = new Map();
		for (const c of parent.children ?? []) {
			if (c.nodeSlug || !c.name || /\{[^}]+\}/.test(c.name)) continue;
			// a file child claims nothing from a folder pattern
			if (!c.folder) continue;
			names.set(c.name, true);
		}
		return [...names.keys()];
	};

	for (const n of all) {
		let cur = n;
		let fuzzyRoot = null;
		const seen = new Set();
		while (cur && !seen.has(cur.slug)) {
			seen.add(cur.slug);
			const parent = cur.parents?.[0] ? bySlug[cur.parents[0]] ?? null : null;
			if (/\{[^}]+\}/.test(cur.name) && parent && !/\{[^}]+\}/.test(parent.name)) {
				fuzzyRoot = cur;
				break;
			}
			cur = parent;
		}
		if (!fuzzyRoot) continue;
		const parent = bySlug[fuzzyRoot.parents[0]];
		const values = literalClaims(parent);
		if (!values.length) continue;
		const index = fuzzyRoot.name.split("/").findIndex((seg) => /^\{[^}]+\}$/.test(seg));
		if (index < 0) continue;
		const claims = values.map((value) => ({ index, value }));
		for (const n2 of all) {
			const shares = n2.variants.some((v) => v.path === fuzzyRoot.path || v.path.startsWith(`${fuzzyRoot.path}/`));
			if (!shares) continue;
			for (const v of n2.variants) {
				if (!v.names[index]) continue;
				v.claims = [...(v.claims ?? []), ...claims];
			}
		}
	}

	const roots = all.filter((n) => !n.parents[0]);
	return { all, bySlug, roots, roleHomes };
};

module.exports = { buildTree, variantsOf };

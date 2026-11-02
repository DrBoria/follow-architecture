"use strict";

// The ACCESS GRAPH: which DECLARED FOLDER may touch which, and how. This is
// the picture the architecture actually makes, in the only vocabulary that is
// stable across projects — node paths, and the action names the config chose.
//
// It is derived, never declared: for every role and every action on it,
//   codeRole.<target>.actions.<kind>.where: [ <who may do it> ]
// where each entry names a role (→ the folders that role may live in) or a
// node. Nothing is inferred beyond that, so the graph cannot claim an edge the
// rules do not enforce.
//
// `same: true` means "the same instance of a repeating node": feature A's
// action may import feature A's store, never feature B's. At template level
// that is an edge only when both sides live under the same placeholders.

// Two node templates address the same instance when their DIRECTORY segments
// agree position by position: literals must be equal, a placeholder on both
// sides lines up (it will resolve to the same value), and a placeholder on one
// side against a literal on the other cannot ever be the same folder.
const sameInstance = (a, b) => {
	// "The same instance" only constrains a node that CAN repeat. The root store
	// is declared once, so every action and controller may import it — the exact
	// rule the engine applies (utils/where.js), otherwise the picture would show
	// fewer edges than the linter enforces.
	const isVar = (s) => /^\{[^}]+\}$/.test(s);
	const dirs = (node) => node.paths[0].split("/").slice(0, -1);
	if (isVar(b.paths[0].split("/").pop())) return false;
	if (!dirs(b).some(isVar)) return true;
	const da = dirs(a);
	const db = dirs(b);
	if (da.length !== db.length) return false;
	return da.every((seg, i) => (isVar(seg) && isVar(db[i]) ? true : seg === db[i]));
};

const buildAccessGraph = ({ arch, nodes, findings }) => {
	const roles = arch.codeRoles ?? {};
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));

	// Folders a role may live in: the node children that declare `role:`. A role
	// with no such child (it lives anywhere, or nowhere) cannot appear on this
	// graph — and is listed as such instead of being drawn somewhere invented.
	const homesOf = (slug) => {
		const out = [];
		for (const h of arch.nodes?.roleHomes?.[slug] ?? []) {
			const node = bySlug.get(h.node);
			if (node && !out.includes(node)) out.push(node);
		}
		return out;
	};

	// The action names the config actually uses, in declaration order. These
	// ARE the filter buttons: no list of known kinds anywhere.
	// The buttons are the RELATION VOCABULARY first — every action the engine can
	// see — and then any name the config invented (`emit: { of: call }`). A kind no
	// role mentions is still listed: a rule nobody wrote is a rule nobody may use,
	// so "0 edges" is a fact about the architecture, not a missing button.
	const { accessorLabel, labelOf } = require("../../../utils/where");
const { FACT_KINDS } = require("../../../entities/kinds");
	const kinds = [...FACT_KINDS];
	const seenKind = new Set(kinds);
	for (const def of Object.values(roles)) {
		for (const kind of Object.keys(def.actions ?? {})) {
			if (seenKind.has(kind)) continue;
			seenKind.add(kind);
			kinds.push(kind);
		}
	}

	const edges = [];
	const seen = new Set();
	const unplaceable = [];
	// A role with no `where` has no folder to draw, but other roles may still
	// name it as an actor ("a pure function may import the store"). Those are
	// collected per role so its screen can answer instead of being empty.
	const mentions = {};

	// Which roles live in a folder — so an arrow can be attributed to the role
	// that OWNS the source side, not only to the role it points at.
	const rolesAtNode = new Map(nodes.map((n) => [n.slug, []]));
	for (const slug of Object.keys(roles)) {
		for (const node of homesOf(slug)) rolesAtNode.get(node.slug)?.push(slug);
	}

	// One direction for every action: B ──kind──▶ A where the rule says "A may
	// <kind> B" — the arrow leaves the imported/used code and lands on the code
	// that does it.

	for (const [targetSlug, def] of Object.entries(roles)) {
		const targets = homesOf(targetSlug);
		for (const [kind, action] of Object.entries(def.actions ?? {})) {
			for (const entry of action.where ?? []) {
				const sources = entry.type === "role" ? homesOf(entry.role) : entry.type === "node" ? [bySlug.get(entry.node)].filter(Boolean) : [];
				if (!sources.length) {
					// A glob or a filter names no folder — the edge exists, but it
					// cannot be drawn as a folder→folder arrow. Say so instead.
					unplaceable.push({ kind, targetRole: targetSlug, who: labelOf(entry) });
					if (entry.type === "role") {
						mentions[entry.role] ??= [];
						mentions[entry.role].push({ kind, targetRole: targetSlug, targetPaths: targets.map((t) => t.paths[0]) });
					}
					continue;
				}
				for (const actor of sources) {
					for (const subject of targets) {
						if (entry.same && !sameInstance(actor, subject)) continue;
						// The arrow follows the DEPENDENCY: it points from the code that
						// is imported / used INTO the code that imports / uses it. So
						// `store ──import──▶ controller` reads "the store is imported in
						// the controller", and `action ──import──▶ store` reads "the
						// action is imported in the store".
						const a = subject;
						const b = actor;
						const key = `${kind}:${a.slug}->${b.slug}`;
						if (seen.has(key)) continue;
						seen.add(key);
						// How the same code may be reached WITHOUT an import —
						// `getRoot(…)`, `self.root`, `parent.get(…)`. Carried on the
						// edge so the picture and the lint report speak the same words.
						// Only where the code is actually reached through the tree: a
						// controller imports the store, so the tree chains are not its way in.
						const scope = (entry.via === "import" ? [] : action.scopeAccess ?? []).map(accessorLabel);
						edges.push({
							kind,
							scope,
							from: a.slug,
							to: b.slug,
							fromPath: a.paths[0],
							toPath: b.paths[0],
							// The declared direction, for the tooltip/legend.
							actor: actor.slug,
							actorPath: actor.paths[0],
							actorRoles: rolesAtNode.get(actor.slug) ?? [],
							// The role NAMED by the rule that produced this edge — for
							// a self-relation that is the only answer to "who may do it".
							actorRole: entry.type === "role" ? entry.role : null,
							subject: subject.slug,
							subjectPath: subject.paths[0],
							fromRoles: rolesAtNode.get(a.slug) ?? [],
							same: Boolean(entry.same),
							via: entry.type === "role" ? `role ${entry.role}` : `node ${entry.node}`,
							target: targetSlug,
						});
					}
				}
			}
		}
	}

	// A rule that names a role which may live in BOTH a container and its
	// children declares the same pair twice: "a store model may import a store
	// model" holds for `feature/store.ts → store.ts` and for the way back. Drawn
	// as two arrows it claims the main store reaches into its children, which is
	// exactly backwards. The pair is drawn ONCE, pointing into the container:
	// every child goes into the main store, never out of it.
	const depthOf = (slug) => (bySlug.get(slug)?.paths?.[0] ?? "").split("/").length;
	const pairs = new Map();
	for (const e of edges) {
		if (e.same || e.from === e.to) continue;
		const key = `${e.via}|${e.kind}|${[e.from, e.to].sort().join("|")}`;
		pairs.set(key, [...(pairs.get(key) ?? []), e]);
	}
	const mirrored = new Set();
	for (const list of pairs.values()) {
		if (list.length < 2) continue;
		const into = list.slice().sort((a, b) => depthOf(b.from) - depthOf(a.from))[0];
		for (const e of list) if (e !== into) mirrored.add(e);
	}
	const drawn = edges.filter((e) => !mirrored.has(e));

	// What is actually broken: a finding that names both the folder the file
	// sits in and the folder it reached. Same colour language as the edges.
	const violations = (findings ?? [])
		.filter((f) => f.violation && f.ownerNode && f.violation.targetNode)
		.map((f) => ({ kind: f.violation.kind, from: f.ownerNode, to: f.violation.targetNode, file: f.file, line: f.line, title: f.title }));

	// Per-folder adjacency, keyed by slug. A plain object, not a Map: the
	// payload is JSON inlined into the HTML, where a Map would serialize to
	// nothing and the UI would have no adjacency at all.
	// One line per ACTION, never a merged one: `import` and `call` between the
	// same folders are different facts — one says the store may be imported
	// here, the other that it may be read here, and only the second carries the
	// `scopeAccess` chains. Drawn as one line with two labels they read as a
	// single rule, so each action keeps its own arrow, its own label and its own
	// lane.
	const merged = drawn.map((e) => ({ ...e, kinds: [e.kind], scope: [...(e.scope ?? [])] }));

	const byNode = Object.fromEntries(nodes.map((n) => [n.slug, { in: [], out: [] }]));
	for (const e of merged) {
		byNode[e.from]?.out.push(e);
		byNode[e.to]?.in.push(e);
	}

	// The roles that actually produce an arrow — the chooser on the Graph screen.
	const roleKinds = [];
	const seenRole = new Set();
	for (const e of merged) {
		if (seenRole.has(e.target)) continue;
		seenRole.add(e.target);
		roleKinds.push(e.target);
	}

	// ── The same architecture, drawn as ROLES ────────────────────────────────
	// A codeRole is one thing that exists once (`action`), even when it lives in
	// many places (`…/actions/x.ts`, `commands/y.ts`). The folder graph above is
	// a projection of that onto paths, which makes one role look like several
	// unrelated boxes. This graph is the rule itself: one box per role, with the
	// paths it may be met at listed INSIDE the box, and one arrow per declared
	// permission (role → role).
	const roleNodes = Object.entries(roles).map(([slug, def]) => {
		const places = [...new Set((arch.nodes?.roleHomes?.[slug] ?? []).map((h) => h.template))];
		return {
			slug,
			name: def.name ?? slug,
			paths: places.length ? places : ["(no declared place)"],
			places,
			// No file count: a role is not a folder, and a number here would be
			// read as "files in this box" — which is exactly the confusion this
			// view exists to remove.
			fileCount: 0,
		};
	});

	const roleGraphEdges = [];
	const seenRoleEdge = new Set();
	for (const [targetSlug, def] of Object.entries(roles)) {
		for (const [kind, action] of Object.entries(def.actions ?? {})) {
			for (const entry of action.where ?? []) {
				if (entry.type !== "role") continue;
				// The arrow follows the dependency: the actor USES the target.
				const key = `${kind}:${entry.role}->${targetSlug}`;
				if (seenRoleEdge.has(key)) continue;
				seenRoleEdge.add(key);
				const scope = (entry.via === "import" ? [] : action.scopeAccess ?? []).map(accessorLabel);
				roleGraphEdges.push({
					kind,
					kinds: [kind],
					scope,
					from: entry.role,
					to: targetSlug,
					fromPath: entry.role,
					toPath: targetSlug,
					actor: entry.role,
					actorRole: entry.role,
					subject: targetSlug,
					same: Boolean(entry.same),
					via: `role ${entry.role}`,
					target: targetSlug,
				});
			}
		}
	}

	return { kinds, roles: roleKinds, edges: merged, violations, unplaceable, mentions, byNode, roleNodes, roleEdges: roleGraphEdges };
};

module.exports = {buildAccessGraph};

"use strict";

// `finally-follow-architecture` — the single built-in structure rule.
//
// It owns the questions a folder can answer, and nothing else:
//
//   1. required children — a child marked `required: true` is what makes a
//      folder an instance of its node. A folder matching the template without
//      it is NOT that node (reported once per folder; the checks below are
//      skipped, since any destination inside it would be invented).
//   2. role homes — a candidate whose role declares a home (`where`) elsewhere
//      is misplaced, and the finding names the place it belongs.
//   3. child queries — a file matching a declared child's `query` but sitting
//      outside that child belongs in the child.
//   4. actions — for each action a role declares (`import`, `call`, `mutate`,
//      `assign`, `read`, `export`, `declare`, or any name mapped with `of:`),
//      the fact layer says
//      which file→file relations exist; the target's role decides whether the
//      source was allowed. The engine never enumerates action names.
//
// Every finding carries its line, the rule it broke and the destination, so a
// fix agent needs nothing but the text.

const { matches, hitOf } = require("../entities/queries");
const { accessorLabel, fillTemplate } = require("../utils/where");
const { deepestMatch, targetCapsFor, instanceAt } = require("./tree");
const { folderContents, missingRequiredChild, ancestorChain } = require("./children");
const { checkWhere, matchesWhere } = require("../utils/where");
const { homesOf, placeFor, roleFitsAt: homeCovers, rolesAtPath } = require("./homes");

const { FACT_KINDS, EDGE_FACTS, declaredActions } = require("../entities/kinds");
const { article } = require("../utils/article");

// How a role's code relates to a path — ONE implementation of each question, in
// nodes/homes.js, shared with the tree check so every finding that names a
// destination names the SAME one: `fitsRole` says "this file is an allowed home
// for the role", `placeFor` says "where it should go" (and only when that
// place EXISTS — a home template filled from the file's own segments can name a
// folder the tree does not declare, and pointing a reader at it would be advice
// about a folder that must not exist).
const fitsRole = (roleSlug, arch, rel) => {
	if (!arch.codeRoles?.[roleSlug]) return true;
	if (!homesOf(arch, roleSlug).length) return true;
	return homeCovers(arch, roleSlug, rel);
};

// The concrete places an action's `where` allows, resolved FOR THIS target: a
// role entry becomes the folders that role may live in (placeholders filled
// from the target's own captures), a node entry its instance, a glob itself.
// A reader needs this: "who may do it" is useless until it names a path.
const allowedPlaces = (entries, arch, targetCaps) => {
	const out = [];
	for (const entry of entries ?? []) {
		if (entry.type === "role") {
			const homes = homesOf(arch, entry.role);
			const paths = homes.map((h) => fillTemplate(h.template, null, targetCaps)).filter(Boolean);
			out.push({ role: entry.role, paths, anywhere: !homes.length });
		} else if (entry.type === "node") {
			out.push({ role: null, paths: [fillTemplate(arch.nodes?.bySlug?.[entry.node]?.path, null, targetCaps)].filter(Boolean) });
		} else if (entry.type === "glob") {
			out.push({ role: null, paths: [entry.glob] });
		} else {
			out.push({ role: null, paths: [], filter: true });
		}
	}
	return out;
};

// `getRoot(…)`, `self.root`, `parent.get(…)` — how the same code may be
// reached WITHOUT an import. Written the way the config writes it, so the
// report and the architecture speak the same words.
// The verb a message needs for a relation is the relation's own EDGE TEXT — the
// one the fact layer writes (`kinds.js`: "calls `x` of `y`", "imports `x`").
// There is no second vocabulary here: a message never invents a word for what a
// role called its action.

const checkFinally = (ctx, arch, out, findingFrom) => {
	const match = deepestMatch(ctx.rel, arch);
	if (!match) return;
	const node = match.node;
	const candidates = ctx.facts.candidates ?? [];

	const violations = [];

	// 1. Required children: a child marked `required: true` is what makes the
	//    node real, so a folder matched by the node's template but lacking it
	//    is NOT that node (a folder that merely looks like a feature). Checked
	//    up the declared parent chain, because the folder that declares the
	//    requirement is often an ancestor of the deepest match. Reported once
	//    per folder, not once per file inside it. When this fires, the folder is
	//    not a node of the architecture at all, so the checks below would only
	//    invent destinations inside it — they are skipped.
	let missing = false;
	const folders = (ctx.dedupe ?? new Map()).get("required") ?? new Set();
	for (const owner of ancestorChain(node, arch)) {
		const required = (owner.children ?? []).filter((c) => c.required);
		if (!required.length) continue;
		const folder = fillTemplate(owner.path, ctx.rel);
		if (!folder) continue;
		// A folder carrying NONE of the node's declared children is not a node that
		// lost a file — it is not that node at all. Telling it to "create a store"
		// would invent a feature nobody asked for, so it gets a different answer:
		// where the code it actually holds belongs.
		const { present, declared, anyDeclared } = folderContents(owner, folder, ctx.repoFiles);
		if (!anyDeclared) {
			const key = `nodes:${owner.slug}:foreign:${folder}`;
			if (!folders.has(key)) {
				folders.add(key);
				if (ctx.dedupe) ctx.dedupe.set("required", folders);
				// A destination INSIDE the folder is not a destination: "move
				// `utils/` to `utils/type.ts`" is not something a reader can do. Only a
				// place outside it answers.
				const homes = (ctx.facts.candidates ?? [])
					.map((c) => c.role)
					.filter(Boolean)
					.map((role) => ({ role, path: placeFor(arch, role, ctx.rel)?.path ?? null }))
					.filter((r) => r.path && r.path !== folder && !r.path.startsWith(`${folder}/`));
				// One destination per ROLE, said out loud: a folder of mixed code
				// (types + helpers) has two homes, and "move everything to X" would be
				// wrong for half of it.
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
								// Only a certain destination is worth naming: when the code
								// here has a role with a home, that home IS the answer. When it
								// has none, the message alone is the answer — this folder is
								// not part of the architecture.
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
			missing = true;
			continue;
		}
		for (const child of required) {
			if ([...present].some((name) => child.re.test(name))) continue;
			const key = `nodes:${owner.slug}:required:${folder}:${child.name}`;
			// Already reported for this folder by an earlier file: nothing new to
			// say, but this file is just as far outside the architecture.
			if (folders.has(key)) {
				missing = true;
				continue;
			}
			folders.add(key);
			if (ctx.dedupe) ctx.dedupe.set("required", folders);
			missing = true;
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

	// NOTE: no early return. A folder that is not an instance of its node still
	// holds code with roles, and the role rules are the ones that say where that
	// code belongs — skipping them left `apps/backend/utils` with a single
	// "this folder is not described" line and no instruction for its helpers.

	// 3. Query children: a child node may declare a `query` (the invariant
	//    filter language, code-roles included). A file whose OWN node declares
	//    such a child, that matches the child's query, but is not under the
	//    child's instance holds content that belongs in the child. Scoped to
	//    the deepest node so a feature's children never fire for files in an
	//    unrelated subtree. This is the generic replacement for per-case
	//    "X must live in Y" invariants.
	for (const child of node.children) {
		if (!child.query) continue;
		if (!matches(ctx.facts, child.query)) continue;
		const childPath = node.path === "." ? child.name : `${node.path}/${child.name}`;
		const { re } = nodePrefixRe(childPath);
		if (re.test(ctx.rel)) continue; // already in the right place
		const where = fillTemplate(node.path === "." ? child.name : `${node.path}/${child.name}`, ctx.rel);
		violations.push({ line: 1, text: `this file matches the query of node \`${child.slug ?? child.name}\` and belong in \`${where}\`` });
	}

	// 4. Actions declared per ROLE: `import: { from: [...] }` on a codeRole
	//    means "code of this role may only be imported by those roles". The
	//    action names are the architecture's own; this rule does not enumerate
	//    them — for each kind it asks the FACT LAYER which source→target edges
	//    exist, finds the TARGET's role, and applies that role's `from` list.
	const facts = ctx.facts;
	// The roles of the FILE — used only for what is not a piece of code: an
	// import/export statement sits at module scope, where the file's roles are the
	// only answer there is.
	const fileRoles = facts.roles ?? [];

	// One entry per (action, target role), not per line: a file that reaches the
	// same store from nine places gets ONE finding that names the store, the
	// allowed places, the mechanisms, and then the lines — not nine copies of the
	// same paragraph.
	const groups = new Map();
	const declared = declaredActions(arch);
	// EVERY relation the fact layer can see is checked, declared or not: a
	// relation nobody wrote a rule for is not "unchecked", it is forbidden —
	// otherwise adding a new relation to the engine silently opened a hole for
	// every project that never mentioned it.
	for (const kind of FACT_KINDS) {
		const actionDecls = declared.get(kind) ?? new Map();
		const factsOfKind = EDGE_FACTS[kind];
		// The same write is a fact of the class AND of the method it lives in;
		// it is still one edge.
		const seen = new Set();
		for (const edge of factsOfKind(facts)) {
			const key = `${kind}:${edge.path}:${edge.line}:${edge.what}`;
			if (seen.has(key)) continue;
			seen.add(key);
			// WHO made this edge: the piece of code that makes it, and ITS role. A
			// role is a property of a function or a variable — `getHost` in a file is
			// a view while `storeSettings` next to it is an action, and judging the
			// file as a whole made the strictest role speak for both.
			const sourceRoles = edge.role ? [edge.role] : edge.piece ? [] : fileRoles;
			// An edge that points at THIS file is a statement about its own code, and the
			// piece's own role answers for it. That is the fact — not a list of the
			// relations somebody happened to write down.
			const selfStatement = edge.path === ctx.rel;
			if (edge.piece && !edge.role) continue;
			// A file no role describes makes every relation it has "not allowed" by a
			// rule nobody wrote — one sentence per import, per call, per read. The file
			// itself is reported once; the doors it used add nothing to that.
			if (!edge.piece && !fileRoles.length) continue;
			// A file may carry several roles, and so may the file it reaches. The edge
			// is allowed when ANY (source role, target role) pair allows it — one
			// permitted pairing is enough, because the code is legitimately described
			// by that pair. Reporting the pairs that would not allow it is how one
			// import became two findings with two different "fixes".
			const pairs = [];
			// A declaration or an export OF THIS FILE's own code is judged by the role of
			// that code: "an orchestrator exports an orchestrator", "a store exports a
			// store and the shapes it is described by". The file may be a home for
			// several roles, and only the piece's own rule is the right question.
			// A self relation is between THIS file's code and THIS file's roles: what it
			// declares or exports IS its own code, so the roles whose home merely
			// covers the path (a `pureFunction` home is a folder, not a file) have
			// nothing to say about it. A file that got no role at all falls back to
			// the roles declared for its path.
			const targetRoles = selfStatement ? (edge.role ? [edge.role] : (fileRoles.length ? fileRoles : rolesAtPath(arch, edge.path))) : rolesAtPath(arch, edge.path);
			for (const targetSlug of targetRoles) {
				const action = actionDecls.get(targetSlug);
				// A role that does not declare this relation allows NOBODY to make
				// it: the list of relations is closed by default. Skipping undeclared
				// kinds is how an adapter quietly imported whatever it liked — the
				// absence of a rule read as permission instead of as a prohibition.
				if (!action) {
					pairs.push({ targetSlug, action: { where: [], missing: true }, caps: targetCapsFor(edge.path, arch), violation: true });
					continue;
				}
				const caps = targetCapsFor(edge.path, arch);
				// Asked ROLE BY ROLE: a file may be several things at once (a helper
				// AND a store accessor), and the edge is legal if the code of ANY of
				// its roles may make it. Judging the whole set at once made the
				// strictest role speak for the file.
				// With NO source role nothing is allowed either: the file is not
				// described by the architecture at all, so every rule it might have
				// had is missing. Skipping such files is how `config/settings.ts`
				// wrote into the root store without a single finding.
				// ONE `where` question: the rule is asked against the roles the edge's
				// code actually has, and "any of them allows it" is the query's own
				// reading of `{ role: … }` — not a loop that re-asks it per role.
				const violation = sourceRoles.length ? checkWhere(action.where, ctx.rel, arch, { ...facts, roles: sourceRoles }, caps) : true;
				pairs.push({ targetSlug, action, caps, violation });
			}
			// CLOSED ACCESSORS. A role whose code lives in ONE declared file and
			// declares `call.scopeAccess` says: "my code is handed out through THESE
			// names". Anything else that takes it out of that file is a violation —
			// not "unknown", not "not configured": forbidden. Without this the list
			// only recognised the names it already knew, and every other name (a second
			// accessor somebody added) was simply invisible.
			for (const roleSlug of Object.keys(arch.codeRoles ?? {})) {
				// The role's action for the `call` RELATION — found by what the action does
				// (`of:`), never by the key it happens to be written under.
				const accessors = (declared.get("call")?.get(roleSlug)?.scopeAccess ?? []).filter((x) => x.scope === "function").map((x) => x.segments[0]);
				if (!accessors.length) continue;
				// A home that names ONE concrete path: anything with a placeholder or a
				// glob can only ever name a folder, and a folder never equals an import.
				const ownFile = homesOf(arch, roleSlug)
					.map((h) => h.template)
					.filter((t) => !/[*{]/.test(t));
				// Only the imports of THIS file matter, so the role's own file is the
				// one this file imports from.
				// The question is a FILTER, not a loop: an import from the role's own
				// file that names something the role does not hand out. The engine
				// picks those imports and the names; only the message is built here.
				const importFilter = { resolved: { in: ownFile }, typeOnly: { equals: false }, named: { any: { not: { in: accessors } } } };
				for (const imp of hitOf(facts.imports ?? [], { any: importFilter }, { arch, fileRel: ctx.rel })) {
					const bad = hitOf(imp.named ?? [], { any: { not: { in: accessors } } }, { arch, fileRel: ctx.rel });
					if (!bad.length) continue;
					violations.push({
						line: imp.line ?? 1,
						text: `\`${bad.join("`, `")}\` is taken out of \`${imp.resolved}\`, but \`${roleSlug}\` is handed out only as ${accessors.map((a) => `\`${a}(…)\``).join(", ")}`,
						fix: `Import one of the declared accessors (${accessors.join(", ")}) instead of \`${bad[0]}\`.`,
					});
				}
			}

			// The finding names the pair that has something to SAY: a role that
			// declares this relation (its text can quote the rule), and among those the
			// nearest one. A role with no rule is a real violation too, but it is the
			// weaker explanation — it only knows that nobody allowed it.
			pairs.sort(
				(a, b) =>
					// A role that NAMES who may do it explains the rule best …
					Number(Boolean(b.action.where?.length)) - Number(Boolean(a.action.where?.length)) ||
					// … then a role that states the rule and forbids everybody (that is
					// a deliberate `where: []`, and it is the true reason) …
					Number(!b.action.missing) - Number(!a.action.missing) ||
					// … then the STRICTEST rule: a file may be several roles at once
					// (`store.ts` is a store, a helper and a type home), and the one that
					// allows the fewest readers is the one whose rule the writer broke.
					(a.action.where ?? []).length - (b.action.where ?? []).length,
			);

			// Every pair refused: one finding is enough — the import is the problem, and
			// the first declared role names it.
			if (pairs.length && pairs.every((p) => p.violation)) {
			for (const { targetSlug, action, caps } of pairs.slice(0, 1)) {

				const all = allowedPlaces(action.where, arch, caps);
				// The way this code is reached WITHOUT an import, if its role declares
				// one: an import that is not allowed is not fixed by deleting the line —
				// it is fixed by taking the declared route.
				// …and only when this file's own role is allowed to USE that code at all:
				// offering `registerCommand(…)` to a helper that may not reach a command
				// is advice that leads nowhere.
				const callDecl = declared.get("call")?.get(targetSlug) ?? null;
				const callOk = callDecl?.where ? !checkWhere(callDecl.where, ctx.rel, arch, facts, caps) : false;
				const route = callOk ? ((callDecl?.scopeAccess ?? [])[0] ?? null) : null;
				// "a store may import a store" is a legal pair, but it never tells a
				// reader where THIS file's code should go — the self entry only adds
				// noise, so it is left out of the advice.
				const others = all.filter((p) => p.role !== targetSlug);
				const places = others.length ? others : all;
				const spots = places
					.filter((pl) => !pl.filter)
					.flatMap((pl) => pl.paths.map((path) => ({ role: pl.role, path })))
					// A destination the file ALREADY is in is not a destination: the
					// finding is about the file's name or its content, not its folder.
					.filter((sp) => sp.path !== ctx.rel && sp.path !== String(ctx.rel).split("/").slice(0, -1).join("/") && sp.role !== targetSlug);
				// The first place the config names wins: it is the one the author of
				// the architecture had in mind, and a concrete path invented from the
				// target's captures can be misleading (a root store has no feature).
				const dest = spots[0]?.path ?? null;

				// Keyed by the edge itself, not only by its kind: "call to `a`" and
				// "call to `b`" are two things to fix, and gluing them into one sentence
				// with a semicolon is what made the old report unreadable.
				const gkey = `${kind}|${targetSlug}|${edge.what}`;
				// ONE flag for "nobody may do this": either the role states no rule for
				// the relation at all, or it states one that names nobody. Both mean the
				// same thing and both are read the same way below.
				const g = groups.get(gkey) ?? { kind, targetNode: targetSlug, allowedRoles: [...new Set(places.map((pl) => pl.role).filter(Boolean))], via: (action.scopeAccess ?? []).map(accessorLabel), route: route ? accessorLabel(route) : null, dest, lines: [], what: new Set(), path: edge.path, pieces: new Map(), piece: edge.piece ?? null, pieceRole: edge.role ?? null, silent: Boolean(action.missing) || !(action.where ?? []).length, self: edge.path === ctx.rel };
				g.lines.push(edge.line ?? 1);
				g.what.add(edge.what);
				// EVERY piece that makes this relation, not only the first one: two
				// functions doing the same forbidden thing are one decision to make, and
				// dropping the second name left the reader with half the work.
				if (edge.piece) g.pieces.set(edge.piece, edge.role ?? null);
				groups.set(gkey, g);
			}
			}
		}
	}

	const lineList = (lines) => [...new Set(lines)].sort((a, b) => a - b);
	for (const g of groups.values()) {
		const rawWhat = [...g.what][0] ?? "";
		const names = [...(g.pieces ?? new Map()).keys()];
		const roles = [...new Set([...(g.pieces ?? new Map()).values()].filter(Boolean))];
		const multi = names.length > 1;
		// "changes" is written for ONE subject; several names take the plural.
		const what = multi ? rawWhat.replace(/^changes /, "change ").replace(/^writes into /, "write into ") : rawWhat;
		// WHO is judged: the piece of code that makes the relation, named with its
		// role. One file holds a view and an action, and each answers for itself.
		const subject = names.length
			? `${names.map((n) => `\`${n}\``).join(", ")}${roles.length === 1 ? ` (${multi ? "each an" : article(roles[0])} \`${roles[0]}\`)` : roles.length ? ` (${roles.map((r) => `\`${r}\``).join(" / ")})` : " (which no role describes)"}`
			: fileRoles.length
				? `the module scope of \`${ctx.rel}\` (${fileRoles.map((r) => `\`${r}\``).join(" / ")})`
				: `the module scope of \`${ctx.rel}\``;
		// The rule, in the words an agent can act on — no config keys, no
		// `where: []`: WHAT is refused, WHO may do it, and why nobody can.
		const allowedRoles = (g.allowedRoles ?? []).map((r) => `\`${r}\``);
		// The sentence already carries the relation in its own words (`what`), so
		// nothing here has to name a verb: it says what is refused and who may do
		// it. A self relation has no second end to name — the code answers for itself.
		const why = g.silent
			? "nothing in the architecture allows it"
			: allowedRoles.length
				? g.self
					? `only ${allowedRoles.join(", ")} may do it`
					: `only ${allowedRoles.join(", ")} may do it with \`${g.targetNode}\` code`
				: "no code may do it";
		// WHAT IS BEING CHANGED, named by what the file IS: a write into the root
		// store is a write into the root store, not into "some file". The owner's
		// first declared role is its name in the architecture (`backend-root-store`
		// declares `rootStore` first, and that is the role that owns the state).
		const owner = g.kind === "mutate" || g.kind === "assign" ? deepestMatch(String(g.path ?? ""), arch)?.node ?? null : null;
		const ownerRole = (owner?.roles ?? []).filter(Boolean)[0] ?? null;
		const named = ownerRole ? what.replace(/ of `([^`]+)`$/, (_m, file) => ` of the \`${ownerRole}\` (\`${file}\`)`) : what;
		const text = `${subject} ${named}, but ${why}`;
		// The declared way to reach this code without the refused relation, if the
		// target names one: following the rule is not bending it.
		const via = g.via[0] ?? g.route ?? null;
		// Every repair is an action on the CODE, and the only repair a prohibition has
		// is removal. A declared route is the one exception — reaching the code the
		// allowed way is not bending the rules, it is following them. Nothing here
		// names a role of its own or suggests editing the architecture: where code
		// BELONGS is the role-home check's answer, not this one's.
		// A WRITE is not repaired by deleting the code: the code has a place of its
		// own, and so does the state it changes. Deleting was the only answer a
		// prohibition had, and it told a reader to throw away working behaviour.
		const isWrite = g.kind === "mutate" || g.kind === "assign";
		const home = isWrite && g.pieceRole ? placeFor(arch, g.pieceRole, ctx.rel) : null;
		const fix = isWrite
			? home
				? `Move ${multi ? "them" : "it"} to \`${home.path}\`, and let the state ${multi ? "they change" : "it changes"} live in the store that declares it for that code.`
				: `Move ${multi ? "them" : "it"} out of this file: the state they change is not theirs to change.`
			: via ? `Replace ${multi ? "them" : "it"} with \`${via}\`.` : `Delete ${multi ? "them" : "it"}.`;
		for (const line of lineList(g.lines)) {
			violations.push({ kind: g.kind, targetNode: g.targetNode, targetPath: g.path, line, text, fix, destination: g.dest ?? null });
		}
	}

	// One relation, one finding. A wrapper (`const f = () => g()`) is a `call` AND
	// a `declare` edge to the same function, so a rule that forbids both said the
	// same thing twice on one line. The CALL is the relation the code actually
	// makes — the declaration only names its shape — so the duplicate goes.
	// Keyed by the LINE and the TARGET FILE. The same function is reached through a
	// `call` edge and a `declare` edge, and the two may name the target through
	// DIFFERENT roles of one file (`store.ts` is a store, a view and a type home),
	// so neither the role nor the wording is part of the key.
	const called = new Set(violations.filter((v) => v.kind === "call").map((v) => `${v.line}|${v.targetPath}`));
	const kept = violations.filter((v) => v.kind !== "declare" || !called.has(`${v.line}|${v.targetPath}`));
	violations.length = 0;
	violations.push(...kept);

	if (violations.length === 0) return;

	// The same sentence twice in one file is one thing to fix: a helper that calls
	// the root store from four places still needs ONE decision, not four copies of
	// the same paragraph.
	const byText = new Map();
	for (const v of violations) {
		// Same role, several functions: one sentence naming all of them.
		const key = v.role ? `role:${v.role}` : v.text;
		const names = (v.names ?? []).filter(Boolean);
		if (v.role && names.length > 1 && !byText.has(key)) {
			const shown = names.slice(0, 4).map((n) => `\`${n}\``).join(", ");
			const rest = names.length > 4 ? ` and ${names.length - 4} more` : "";
			const tail = v.where ? `they belong in ${v.where}` : `${v.owning ?? "this folder"} declares no home for a \`${v.role}\``;
			const move = v.where ? `Move ${shown}${rest} to ${v.where}.` : null;
			byText.set(key, { ...v, fix: move, text: `This file declares \`${v.role}\` functions (${shown}${rest}): ${tail}.` });
			continue;
		}
		if (!byText.has(key)) byText.set(key, v);
	}
	const unique = [...byText.values()];
	unique.sort((a, b) => a.line - b.line);
	// One finding per violation. A paragraph that glues ten complaints together
	// with semicolons cannot be acted on: the reader has to re-parse it before
	// knowing what to do, and the location of the fix is lost.
	for (const v of unique) {
		out.push(
			findingFrom(
				{
					report: { message: v.text, fix: v.fix ?? null },
					line: v.line,
					// Only the violations that name a target are structured; the rest are
					// free-text role/child complaints.
					// The destination the architecture names for this code, so a consumer
					// reads it instead of recomputing where a role lives.
					data: v.kind && v.targetNode ? { violations: [{ kind: v.kind, targetNode: v.targetNode, line: v.line, destination: v.destination ?? null }] } : {},
				},
				"finally-follow-architecture",
				node.slug,
				`finally:${node.slug}:${ctx.rel}:${v.kind ?? "misc"}:${v.targetNode ?? "-"}:${v.line}`,
				{ path: ctx.rel, node: node.slug, what: ctx.rel },
			),
		);
	}
};

module.exports = {checkFinally, fitsRole, missingRequiredChild: (node, arch, rel, files) => missingRequiredChild(node, arch, rel, files, fillTemplate), EDGE_FACTS};

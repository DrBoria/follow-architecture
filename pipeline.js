"use strict";

// The per-file pipeline. One entry point the CLI and the ESLint rule both call:
// load the source file, collect candidates once, classify their roles, assert
// those roles, collect the file's raw facts, then run the three check layers —
// node tree, node role expectations, and invariants. Every layer receives the
// same context and appends findings to the same list.

const path = require("node:path");
const fs = require("node:fs");
const { toRel } = require("./utils/imports");
const { createTsProject, loadSourceFile, collectCandidates, collectFileFacts, importNameModules } = require("./entities/ast");
const { attachCallDepth } = require("./entities/ast/depth");

const { classifyRoles } = require("./code-roles/classify");
const { checkTree, deepestMatch, folderOwner } = require("./entities/tree");
const { checkFinally, fitsRole, missingRequiredChild } = require("./nodes/finally");
const { homesOf, placeFor, boxOfPlace, placeholdersOf, dirOf } = require("./entities/location");
const { similarNodes } = require("./nodes/similar");
const { asks } = require("./report/asks");
const { checkInvariants } = require("./invariants");
const { findingFrom } = require("./report/cli-report");
const { article } = require("./utils/article");

const buildFileContext = (abs, repoRoot, arch, sf) => {
	const rel = toRel(repoRoot, abs);
	const dir = path.posix.dirname(rel);
	const basename = path.posix.basename(rel);
	return {
		abs,
		rel,
		dir,
		basename,
		sf,
		repoRoot,
		aliases: arch.aliases ?? {},
		// The built architecture — scope entries (`{ node: slug }`) resolve
		// against the tree, and filters may reference it too.
		arch,
		roles: [],
		roleCtx: null,
		facts: null,
	};
};

const checkFile = (abs, arch, project, repoFiles, dedupe) => {
	const text = fs.readFileSync(abs, "utf8");
	const sf = loadSourceFile(project, abs, text);
	const ctx = buildFileContext(abs, arch.repoRoot, arch, sf);
	ctx.repoFiles = repoFiles;
	// Shared across the run: lets node-level checks report once per folder
	// instead of once per file inside it.
	ctx.dedupe = dedupe;

	// Collect candidates once; classification and file facts both consume them.
	const importMap = importNameModules(sf, arch.repoRoot, ctx.aliases, repoFiles);
	// `repoRoot` lets the type-resolved facts (`assignments[].type`,
	// `parameters[].typeFile`) be repo-relative, which is what
	// `location: { node: … }` matches against.
	const candidates = collectCandidates(sf, importMap, ctx.rel, ctx.repoRoot ?? arch.repoRoot);
	// How deep the call chain goes from each piece: a FACT, so a rule can refuse a
	// chain nobody can follow (`toggleLineAction → applyDecorations → …`).
	attachCallDepth(candidates, {
		rel: ctx.rel,
		project,
		repoRoot: arch.repoRoot ?? ctx.repoRoot,
		aliases: ctx.aliases,
		repoFiles,
		cache: (arch.depthCache ??= { memo: new Map(), files: new Map() }),
	});

	// The file's facts are needed BEFORE classification — a role may be
	// recognised by what the file depends on (`file.imports`), not only by the
	// candidate's own shape. The only fields that need the classification are
	// `candidates` and `roles`, so they are filled in afterwards; every
	// candidate holds the same facts object, so `infer` sees everything the file
	// facts offer, not a hand-picked subset.
	const fileFacts = collectFileFacts(sf, { rel: ctx.rel, repoFiles, aliases: ctx.aliases, repoRoot: arch.repoRoot, candidates: [] });
	for (const c of candidates) c.file = fileFacts;

	const { present, roleCtx, candidates: withRoles } = classifyRoles(candidates, arch.codeRoles ?? {}, arch);
	ctx.roles = present;
	ctx.roleCtx = roleCtx;
	// `c.file` is the snapshot every candidate carries, and roles are known only
	// now: filling them here keeps "the file this piece sits in" complete instead
	// of a copy that silently lacks the one field a rule asks about.
	fileFacts.roles = [...new Set(present)];

	// A role's top-level `report` fires only for a MISFIT candidate — one
	// declared outside every place the role's `in` names. A candidate in its
	// home is correct code and stays silent. `{destination}` is the place the
	// architecture names for that role, so a fixer can act on the text alone.
	const out = [];

	// 2. Every candidate must fit its ROLE's declared home. A role says where its
	// code may be declared; code of that role anywhere else is reported with the
	// place it belongs. ONE finding per role per file — four helpers in one file
	// are one decision, not four copies of the same sentence.
	const misfits = new Map();
	for (const c of withRoles) {
		const role = c.role;
		// A role's report is about a NAME: an anonymous function is the argument or
		// the body of something else, and naming it would produce a sentence with a
		// hole in it.
		if (!role || !arch.codeRoles?.[role] || !c.name) continue;
		if (!homesOf(arch, role).length) continue;
		if (fitsRole(role, arch, ctx.rel)) continue;
		misfits.set(role, [...(misfits.get(role) ?? []), { name: c.name, line: c.lines?.[0] ?? 1 }]);
	}
	for (const [role, found] of misfits) {
		const names = found.map((x) => x.name);
		const list = names.map((n) => `\`${n}\``).join(", ");
		// WHERE this code belongs — asked of the ONE implementation in homes.js, so
		// this message and the folder-level one can never name different places.
		const place = placeFor(arch, role, ctx.rel);
		const where = place ? `\`${place.path}\`` : null;
		// The demand and its sentence come from the ONE vocabulary in report/asks.js:
		// "this code belongs elsewhere" is a `move`, said the same way here and in
		// the folder check. No word is baked in for a role's kind, so `constants`
		// is not called "functions".
		// The role's own wording, when the config has one, becomes the REASON in that
		// sentence instead of a sentence of its own: five roles used to word "this
		// code belongs elsewhere" five ways, and a reader had to learn them all. It
		// is a clause ("It writes into a store, so it is an action"), not a sentence
		// with its own subject — the subject and the place are the frame's job.
		const own = arch.codeRoles[role].report?.message;
		// The BOX the sentence names — resolved here, once, so the picture and the
		// sentence cannot disagree about it.
		const destNode = boxOfPlace(arch, place?.path);
		const report = asks.move({
			what: list,
			to: where,
			plural: names.length > 1,
			node: destNode,
			// The path WITHOUT backticks: the text decorates, the data does not.
			path: place?.path ?? null,
			// `findingFrom` substitutes `{what}` / `{destination}` from the vars below.
			why:
				own ??
				// A role with NO place for this file must not reach `place.path`: widening the
				// rules to `packages` put such a file in front of this line and it crashed.
				`${names.length > 1 ? "They are" : "It is"} \`${role}\` code${
					!place || place.concrete ? "" : `; fill ${placeholdersOf(place.path)} for the instance this code belongs to`
				}.`,
		});
		out.push(
			findingFrom({ report, line: found[0].line }, "codeRoles", role, `role:${role}:report`, {
				path: ctx.rel,
				what: names.join(", "),
				destination: place?.path ?? null,
			}),
		);
	}

	// File facts (candidates attached) — the invariants' filter target.
	ctx.facts = { ...fileFacts, candidates: withRoles, roles: [...new Set(present)] };

	// A piece of code no role describes has NO permissions — not "unknown", not
	// "skipped": every rule in the config is a permission granted to a ROLE, and a
	// piece outside every role is granted nothing. Reported per PIECE (`setHost` is
	// an action, `getHost` next to it is a view — a file is not the unit), and once
	// for the module scope when the file has no piece at all.
	const match = deepestMatch(ctx.rel, arch);
	const owner = match?.node?.slug ?? null;
	const kids = owner ? (arch.nodes.bySlug?.[owner]?.children ?? []) : [];
	// The child whose PATTERN this file matches — `store.ts` literally, `{kebab-case}.ts`
	// by the convention it is written in. One rule, the same one the tree uses.
	const own = kids.find((k) => !k.folder && k.re.test(ctx.basename)) ?? null;
	// The child that declares this file, else the PATTERN this folder uses for
	// files it does not name (`**/*.ts`) — never an unrelated concrete sibling.
	const named = own?.name ?? kids.find((k) => !k.folder && /[{*]/.test(k.name))?.name ?? kids.find((k) => !k.folder)?.name ?? "the declared pattern";
	// The folder may already SAY what lives here (`role: orchestrator` on the
	// node). Then the folder is right and the CODE is what matches no shape — a
	// different sentence, and a different fix.
	// A file NODE (`apps/backend/{kebab-case}/controller.ts` is a node of its own)
	// IS the declaration: nothing lists it as a child, so its own roles are what
	// applies here. Without this every piece of a feature's controller read "nothing
	// declares which kind of code this holds".
	const isFileNode = (match?.node?.variants ?? []).some((v) => v.isFile);
	const declaredHere = own?.roles ?? (isFileNode ? (match.node.roles ?? []) : []);
	// A finding is about a PIECE OF CODE, and its text is built from what the
	// architecture actually says about it — never from a fixed word. When the place
	// declares kinds of code, the finding names them; when nothing is declared, it
	// says exactly that, and where.
	const listOf = (roles) => roles.map((r) => `\`${r}\``).join(" / ");
	// "Nothing describes this code" — one of the four demands in report/asks.js, so
	// the sentence and the repair read the same here as anywhere else. Only the
	// REASON differs: which role this place does declare, or that the place is not
	// in the tree at all.
	// What this folder LOOKS LIKE, if anything: every declared entity whose shape
	// the folder already satisfies for 60% or more. No single fallback place — a
	// folder may be 80% a feature and 66% a type home, and both are offered.
	const lookalikes = () =>
		similarNodes(arch, dirOf(ctx.rel), {
			project,
			repoRoot: arch.repoRoot ?? ctx.repoRoot,
			aliases: ctx.aliases,
			repoFiles,
			cache: (arch.similarCache ??= { files: new Map() }),
		});
	// WHAT the piece IS, in its own words: a local alias, a wrapper, a plain
	// variable. "this is something else" told the reader nothing; the piece's own
	// facts say what it is and where it came from.
	const shapeOf = (c) => {
		if (!c) return null;
		const read = (c.reads ?? [])[0];
		if (read) return `a local alias of \`${read.what}${read.what ? " " : ""}\`${read.module ? `read from \`${read.module}\`` : ""}`;
		const call = (c.calls ?? []).find((x) => x.module && !x.receiverOnly);
		if (call) return `a wrapper around \`${call.action ?? "a call"}\`${call.module ? ` of \`${call.module}\`` : ""}`;
		const write = (c.assignments ?? [])[0];
		if (write) return `a write into \`${write.target}\``;
		// The declaration itself, when the AST kept the node: `const commands =
		// root.commands` says more than "a plain variable" ever could.
		const text = typeof c.node?.getText === "function" ? c.node.getText() : null;
		if (text && text.length <= 90) return `the declaration \`${text.replace(/\s+/g, " ")}\``;
		return (c.kind?.own?.is ?? "") === "VariableDeclaration" ? "a plain variable" : "a plain function";
	};

	const noRole = (what, piece) => {
		const like = lookalikes();
		const offered = like.length
			? ` It looks like ${like.map((n) => `\`${n.path ?? n.slug}\` (${n.hit}/${n.total})`).join(" or ")}.`
			: "";
		const shape = shapeOf(piece);
		const what2 = shape ? `this is ${shape} — not code a role describes` : "this is something else";
		const why = declaredHere.length
			? `only ${listOf(declaredHere)} is declared here, and ${what2}.${offered}`
			: owner
				? `nothing declares which kind of code \`${ctx.rel}\` holds.${offered}`
				: `\`${ctx.rel}\` is outside the node tree.${offered}`;
		const ask = asks.role({ what: `\`${what}\``, why });
		if (!like.length) return ask;
		// Moving is offered only where the folder really resembles something — the
		// destination is the entity's own words, and there may be several.
		ask.fix = `Move \`${what}\` into ${like.map((n) => `\`${n.path ?? n.slug}\``).join(" or ")} — this folder already has ${like[0].hit} of the ${like[0].total} things that entity declares.`;

		return ask;
	};

	// One piece may be described by two candidates — a `const` holding an arrow is
	// the same code seen twice (the variable and the function). When one of them
	// got a role, the piece is described; only a piece NO candidate could name is a
	// hole.
	const roledLines = new Set(withRoles.filter((x) => x.role).map((x) => x.lines?.[0] ?? 1));
	// A PIECE is a candidate that can carry a role. Every candidate the AST layer
	// collects is one, except two structural cases: a variable declared INSIDE a
	// function (the function answers for it) and an anonymous function handed
	// straight to a call — that is the call's ARGUMENT (`.map(x => …)`), not code
	// with a life of its own. No list of kinds to keep in sync.
	// A `const` is a piece only at MODULE scope: inside any function — named or
	// anonymous — it is a local alias, and the function answers for it. Reading
	// `piece: null` as module scope asked readers to give a role to `const x = y.z`.
	const isPiece = (c) => (ownKind(c) === "VariableDeclaration" ? !c.location?.nested : c.name != null || c.kind?.parent?.is !== "CallExpression");
	const ownKind = (c) => c.kind?.own?.is ?? null;
	// A piece that touches nothing needs no role: "nothing is allowed from it" is
	// not a statement about code that does not reach anything. Silence for those is
	// not permission — it is the absence of a question.
	const { EDGE_FACTS } = require("./entities/kinds");
	const piecesWithEdges = new Set([
		...new Set(
			[...Object.values(EDGE_FACTS)]
				.flatMap((produce) => produce(ctx.facts))
				.map((e) => e.piece)
				.filter(Boolean),
		),
	]);
	const seenPieces = new Set();
	let unroled = 0;
	for (const c of withRoles) {
		if (c.role || roledLines.has(c.lines?.[0] ?? 1) || !isPiece(c)) continue;
		if (!piecesWithEdges.has(c.name)) continue;
		const what = c.name ?? `the anonymous function at line ${c.lines?.[0] ?? 1}`;
		// One piece, several candidates (`const f = () => …` is the variable AND the
		// function): one finding.
		if (seenPieces.has(what)) continue;
		seenPieces.add(what);
		unroled += 1;
		out.push(findingFrom({ ...noRole(what, c), line: c.lines?.[0] ?? 1 }, "nodes", owner ?? ctx.rel, `unroled:${owner ?? "tree"}:${what}`, { path: ctx.rel, what }));
	}
	// A file NOTHING describes: no role present and no piece to say it about (a
	// file of re-exports, a file of imports). Said once, for the file — otherwise
	// every relation it makes becomes its own "not allowed" sentence.
	if (!present.length && !unroled) {
		// Only when the file actually does something: a file with no declarations and
		// no relation to another module (`constants.ts` holding `export {}`) holds no
		// code for a role to describe, and "it has no role" would be a sentence about
		// an empty page.
		const touches = [...Object.values(EDGE_FACTS)].flatMap((produce) => produce(ctx.facts)).some((e) => e.path !== ctx.rel);
		if (touches) out.push(findingFrom({ ...noRole(ctx.rel, null) }, "nodes", owner ?? ctx.rel, `unroled:${owner ?? "tree"}:file`, { path: ctx.rel, what: ctx.rel }));
	}
	checkTree(ctx.rel, arch, out, findingFrom, ctx.facts, ctx.repoFiles);
	// finally-follow-architecture: the built-in structure rule (kind + declaration).
	// Replaces the old per-node required/forbidden and role-declaration checks.
	checkFinally(ctx, arch, out, findingFrom);
	checkInvariants(arch.invariants, ctx, out, findingFrom, dedupe);
	return out;
};

module.exports = {checkFile, createTsProject};

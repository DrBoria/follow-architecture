"use strict";

// The UNROLED phase: a piece of code no role describes has NO permissions —
// not "unknown", not "skipped": every rule in the config is a permission
// granted to a ROLE, and a piece outside every role is granted nothing.
// Reported per PIECE (`setHost` is an action, `getHost` next to it is a view —
// a file is not the unit), and once for the module scope when the file has no
// piece at all.

import type { Project } from "ts-morph";
import { deepestMatch } from "./entities/tree";
import { dirOf, placeOf } from "./entities/location";
import { similarNodes, type Lookalike } from "./nodes/similar";
import { EDGE_FACTS, type Edge, type Facts } from "./entities/kinds";
import { asks } from "./report/asks";
import { findingFrom } from "./report/cli-report";
import { speakOnce } from "./utils/speak";
import { fieldOf, isList, isObj } from "./utils/field";
import { rolesOfChild } from "./nodes/child-roles";
import type { Arch, ArchChild } from "./entities/architecture";
import type { FileContext } from "./entities/context";
import type { Candidate } from "./entities/facts";
import type { Finding } from "./entities/findings";

// What the place declares: the owner node and the roles declared here.
type Declaration = { owner: string | null; declaredHere: string[] };

// The child whose PATTERN this file matches — `store.ts` literally,
// `{kebab-case}.ts` by the convention it is written in. One rule, the same one
// the tree uses.
const ownChildOf = (kids: readonly ArchChild[], basename: string): ArchChild | null => kids.find((k) => !k.folder && k.re.test(basename)) ?? null;

// The roles this place declares: the child whose pattern the file matches,
// else — for a file NODE (`apps/backend/{kebab-case}/controller.ts` is a node
// of its own) — the node's own roles. Nothing lists a file node as a child, so
// its own roles are what applies here. The child's roles are the shared
// `rolesOfChild` reading.
const declaredRolesOf = (match: ReturnType<typeof deepestMatch>, own: ArchChild | null, arch: Arch): string[] => {
	const childRoles = rolesOfChild(arch, own);
	if (childRoles.length) return childRoles;
	const isFileNode = (match?.node?.variants ?? []).some((v) => v.isFile);

	return isFileNode ? (match?.node?.roles ?? []) : [];
};

const declarationOf = (ctx: FileContext, arch: Arch): Declaration => {
	const match = deepestMatch(ctx.rel, arch);
	const owner = match?.node?.slug ?? null;
	const kids = owner ? (arch.nodes.bySlug[owner]?.children ?? []) : [];
	const own = ownChildOf(kids, ctx.basename ?? "");

	return { owner, declaredHere: declaredRolesOf(match, own, arch) };
};

// The roles a place declares, in the reader's words.
const listOf = (roles: readonly string[]): string => roles.map((r) => `\`${r}\``).join(" / ");

// The piece's own words for what it IS: a local alias, a wrapper, a write, the
// declaration's text — each fact answers before the generic fallback.
const aliasShape = (c: Candidate): string | null => {
	const reads = fieldOf(c, "reads");
	const read = isList(reads) && isObj(reads[0]) ? reads[0] : null;
	if (!read) return null;

	return `a local alias of \`${read.what}${read.what ? " " : ""}\`${read.module ? `read from \`${read.module}\`` : ""}`;
};

const wrapperShape = (c: Candidate): string | null => {
	const call = (c.calls ?? []).find((x) => x.module && !x.receiverOnly);
	if (!call) return null;

	return `a wrapper around \`${call.action ?? "a call"}\`${call.module ? ` of \`${call.module}\`` : ""}`;
};

const declarationShape = (c: Candidate): string | null => {
	const write = (c.assignments ?? [])[0];
	if (write) return `a write into \`${write.target}\``;
	// The declaration itself: `const commands = root.commands` says more than
	// "a plain variable" ever could.
	const text = c.text ?? null;
	if (text && text.length <= 90) return `the declaration \`${text.replace(/\s+/g, " ")}\``;

	return null;
};

// WHAT the piece IS, in its own words. "this is something else" told the
// reader nothing; the piece's own facts say what it is and where it came from.
const shapeOf = (c: Candidate | null): string | null => {
	if (!c) return null;
	const specific = aliasShape(c) ?? wrapperShape(c) ?? declarationShape(c);
	if (specific) return specific;

	return (c.kind?.own?.is ?? "") === "VariableDeclaration" ? "a plain variable" : "a plain function";
};

// The reason a piece has no role: what the place declares (and what the piece
// is), or that nothing declares this file, or that it is outside the tree.
const whyUnroled = (ctx: FileContext, decl: Declaration, piece: Candidate | null, offered: string): string => {
	const shape = shapeOf(piece);
	const what2 = shape ? `this is ${shape} — not code a role describes` : "this is something else";
	if (decl.declaredHere.length) return `only ${listOf(decl.declaredHere)} is declared here, and ${what2}.${offered}`;
	if (decl.owner) return `nothing declares which kind of code \`${ctx.rel}\` holds.${offered}`;

	return `\`${ctx.rel}\` is outside the node tree.${offered}`;
};

// What the folder looks like, in the reader's words: the entities it resembles
// and how much of each it holds.
const lookalikeText = (like: readonly Lookalike[]): string => (like.length ? ` It looks like ${like.map((n) => `\`${n.path ?? n.slug}\` (${n.hit}/${n.total})`).join(" or ")}.` : "");

// "Nothing describes this code" — one of the four demands in report/asks, so
// the sentence and the repair read the same here as anywhere else. Moving is
// offered only where the folder really resembles something — the destination
// is the entity's own words, and there may be several.
const noRole = (what: string, piece: Candidate | null, view: { ctx: FileContext; decl: Declaration; like: Lookalike[] }): ReturnType<typeof asks.role> => {
	const demand = asks.role({ what: `\`${what}\``, why: whyUnroled(view.ctx, view.decl, piece, lookalikeText(view.like)) });
	if (!view.like.length) return demand;
	demand.fix = `Move \`${what}\` into ${view.like.map((n) => `\`${n.path ?? n.slug}\``).join(" or ")} — this folder already has ${view.like[0].hit} of the ${view.like[0].total} things that entity declares.`;

	return demand;
};

// A PIECE is a candidate that can carry a role. Every candidate the AST layer
// collects is one, except two structural cases: a variable declared INSIDE a
// function (the function answers for it) and an anonymous function handed
// straight to a call — that is the call's ARGUMENT (`.map(x => …)`), not code
// with a life of its own. A `const` is a piece only at MODULE scope.
const isPiece = (c: Candidate): boolean => {
	if ((c.kind?.own?.is ?? null) === "VariableDeclaration") return !c.location?.nested;

	return c.name != null || c.kind?.parent?.is !== "CallExpression";
};

// The edges the file's facts produce — every relation, once.
const edgesOf = (facts: Facts): Edge[] => Object.values(EDGE_FACTS).flatMap((produce) => produce(facts));

// The pieces that touch something: a piece that touches nothing needs no role
// — "nothing is allowed from it" is not a statement about code that does not
// reach anything. Silence for those is not permission — it is the absence of a
// question.
const piecesWithEdges = (edges: readonly Edge[]): Set<string> => new Set(edges.map((e) => e.piece).filter((p): p is string => Boolean(p)));

// A piece whose VALUE is judged by the css-fact invariants, not by a role: a
// styled/createGlobalStyle/css fragment (a tagged template), or a DATA literal
// (a token group, a breakpoint table, a rhythm origin). These are values, not
// behaviour — the settled model leaves them unroled on purpose and checks their
// contents instead (`proper-values`, `proper-naming`, `proper-documentation`).
const VALUE_INITIALIZERS = new Set(["TaggedTemplateExpression", "ObjectLiteralExpression", "SatisfiesExpression", "AsExpression", "ArrayLiteralExpression", "NoSubstitutionTemplateLiteral"]);
const governedByValues = (c: Candidate): boolean => VALUE_INITIALIZERS.has(c.kind?.initializer?.is ?? "");

// Is this candidate an unroled PIECE that touches something? One piece may be
// described by two candidates — a `const` holding an arrow is the same code
// seen twice; when one of them got a role, the piece is described. A piece
// carrying css TEMPLATES, or whose whole value is DATA, is governed by the
// css-fact invariants, not by a role.
const isRoled = (c: Candidate, roledLines: ReadonlySet<number>): boolean => Boolean(c.role) || roledLines.has(c.lines?.[0] ?? 1);
const governedByValuesOrCss = (c: Candidate): boolean => Boolean(c.css?.templates?.length) || governedByValues(c);
const unroledPiece = (c: Candidate, roledLines: ReadonlySet<number>, touching: ReadonlySet<string>): boolean =>
	!isRoled(c, roledLines) && isPiece(c) && Boolean(c.name) && touching.has(c.name ?? "") && !governedByValuesOrCss(c);

// One unroled piece's finding, once per piece.
const unroledFindings = (withRoles: readonly Candidate[], scene: { ctx: FileContext; decl: Declaration; like: Lookalike[]; edges: Edge[] }, out: Finding[]): number => {
	const roledLines = new Set(withRoles.filter((x) => x.role).map((x) => x.lines?.[0] ?? 1));
	const touching = piecesWithEdges(scene.edges);
	const seenPieces = new Set<string>();
	const pieces = withRoles.filter((c) => unroledPiece(c, roledLines, touching));
	for (const c of pieces) {
		const what = c.name ?? `the anonymous function at line ${c.lines?.[0] ?? 1}`;
		if (!speakOnce(seenPieces, what)) continue;
		out.push(findingFrom({ ...noRole(what, c, scene), line: c.lines?.[0] ?? 1 }, "nodes", scene.decl.owner ?? scene.ctx.rel, `unroled:${scene.decl.owner ?? "tree"}:${what}`, { path: scene.ctx.rel, what }));
	}

	return seenPieces.size;
};

// A file NOTHING describes: no role present and no piece to say it about (a
// file of re-exports, a file of imports). Said once, for the file — and only
// when the file actually does something. A BARREL (every export re-exports
// another module) holds no code of its own, so it is not a thing to role: its
// re-exports are governed by `no-re-exports`'s place list, not by a role.
const reexportOnly = (scene: { ctx: FileContext }): boolean => {
	const exports = scene.ctx.facts?.exports ?? [];

	return exports.length > 0 && exports.every((entry) => Boolean(entry.from));
};

// A file whose every piece is DATA or a style fragment holds no behaviour to
// role: its values are judged by the css-fact invariants.
const isValuePiece = (c: Candidate): boolean => governedByValues(c) || Boolean(c.role) || Boolean(c.css?.templates?.length);
const onlyValuePieces = (candidates: readonly Candidate[]): boolean => candidates.length > 0 && candidates.every(isValuePiece);

const fileFinding = (scene: { ctx: FileContext; decl: Declaration; like: Lookalike[]; edges: Edge[] }, out: Finding[]): void => {
	if (!scene.edges.some((e) => e.path !== scene.ctx.rel)) return;
	if (reexportOnly(scene) || onlyValuePieces(scene.ctx.facts?.candidates ?? [])) return;
	out.push(findingFrom({ ...noRole(scene.ctx.rel, null, scene) }, "nodes", scene.decl.owner ?? scene.ctx.rel, `unroled:${scene.decl.owner ?? "tree"}:file`, { path: scene.ctx.rel, what: scene.ctx.rel }));
};

// The scan view the lookalike question needs: the project, the repo anchor,
// the aliases, the file list, and the run's similarity cache.
const similarScanOf = (ctx: FileContext, arch: Arch, project: Project, repoFiles: string[]): Parameters<typeof similarNodes>[2] => ({
	project,
	repoRoot: arch.repoRoot ?? ctx.repoRoot ?? ".",
	aliases: ctx.aliases,
	repoFiles,
	cache: (arch.similarCache ??= { files: new Map() }),
});

// The file's facts with the repo list attached — the edge producers' target.
// The pipeline fills `ctx.facts` before this phase runs; the fallback keeps
// the producers total for a context that carries none.
const factsOf = (ctx: FileContext, repoFiles: string[]): Facts => {
	const empty: Facts = { lines: [], imports: [], exports: [], location: placeOf(ctx.rel), reads: [], kind: { own: { is: "SourceFile" }, descendants: [] }, candidates: [], roles: [] };

	return { ...(ctx.facts ?? empty), repoFiles };
};

const checkUnroled = (withRoles: readonly Candidate[], run: { present: readonly string[]; ctx: FileContext; arch: Arch; project: Project; repoFiles: string[]; out: Finding[] }): void => {
	const { present, ctx, arch, project, repoFiles, out } = run;
	const decl = declarationOf(ctx, arch);
	// What this folder LOOKS LIKE, if anything: every declared entity whose shape
	// the folder already satisfies for the threshold or more. No single fallback
	// place — a folder may be 80% a feature and 66% a type home, and both are offered.
	const like = similarNodes(arch, dirOf(ctx.rel), similarScanOf(ctx, arch, project, repoFiles));
	const edges = edgesOf(factsOf(ctx, repoFiles));
	const unroled = unroledFindings(withRoles, { ctx, decl, like, edges }, out);
	if (!present.length && !unroled) fileFinding({ ctx, decl, like, edges }, out);
};

export { checkUnroled };

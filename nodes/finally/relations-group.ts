"use strict";

// One verdict per group of refused relations, built from facts and nothing
// else: the sentence (`relationMessage`), the repair, and one violation per
// line the group covers.

import { deepestMatch } from "../../entities/tree";
import { changesState } from "../../entities/kinds";
import { relationMessage } from "../../report/errorTypes/vocabulary/phrases";
import type { Arch, QueryFilter } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { Violation } from "./violation";
import type { RelationToken as SharedToken } from "../../entities/token";

// A group of refusals that share one decision: same kind, same target role,
// same what-was-done. The lines and pieces accumulate as edges join.
type RelationGroup = {
	kind: string;
	targetNode: string;
	allowedRoles: string[];
	sameRoles: string[];
	via: string[];
	route: string | null;
	dest: string | null;
	lines: number[];
	what: Set<string>;
	path: string | null;
	pieces: Map<string, string | null>;
	piece: string | null;
	pieceRole: string | null;
	silent: boolean;
	filtered: boolean;
	self: boolean;
	fact: QueryFilter | null;
};

// The token the report renders: the fact, the subject, the route, the reason.
// The shape is the ONE contract in `entities/token` — the producer states the
// fields it builds, the report reads them as optional (a token may arrive
// partial). `scope` is a reader-side flag the producer never sets.
type RelationToken = Required<Pick<SharedToken, "code" | "via">> & {
	fact: QueryFilter | null;
	subject: Pick<Required<NonNullable<SharedToken["subject"]>>, "pieces" | "roles" | "plural">;
	why: Required<NonNullable<SharedToken["why"]>>;
};

// The owner role of a state-changing relation's target — the report names it.
const ownerRoleOf = (g: RelationGroup, arch: Arch): string | null => {
	if (!changesState(g.kind)) return null;
	const owner = deepestMatch(String(g.path ?? ""), arch)?.node ?? null;

	return (owner?.roles ?? []).filter(Boolean)[0] ?? null;
};

// The fact with the owner role attached — the report names it. A fact that is
// not a record carries nothing to attach to.
const factWithOwner = (g: RelationGroup, ownerRole: string | null): QueryFilter | null => {
	if (!g.fact || typeof g.fact !== "object" || Array.isArray(g.fact)) return null;

	return { ...g.fact, ownerRole };
};

// Why the relation is refused: nothing allows it, some roles do, or nobody may.
const whyCodeOf = (g: RelationGroup): string => {
	if (g.silent) return "silent";

	return g.allowedRoles.length ? "allowed" : "nobody";
};

const tokenOf = (g: RelationGroup, arch: Arch, fileRoles: readonly string[]): RelationToken => {
	const names = [...g.pieces.keys()];
	const roles = [...new Set([...g.pieces.values()].filter((r): r is string => Boolean(r)))];
	const ownerRole = ownerRoleOf(g, arch);

	return {
		code: "relation.forbidden",
		fact: factWithOwner(g, ownerRole),
		subject: { pieces: names, roles: names.length ? roles : [...fileRoles], plural: names.length > 1 },
		// The route the architecture DOES allow to the same code, if it names one.
		via: g.via?.[0] ?? g.route ?? null,
		why: {
			code: whyCodeOf(g),
			roles: g.allowedRoles,
			// The ones the rule limits to the SAME feature instance.
			sameRoles: g.sameRoles,
			self: Boolean(g.self),
			outward: Boolean(g.filtered),
			targetNode: g.targetNode ?? null,
		},
	};
};

// THE REPAIR for a relation the architecture refuses — always about the CODE,
// never about editing the rule: what to delete, or which of the code that MAY do
// it should own the line. A finding with no repair was a card with nothing to do
// (48 of them in one run).
const relationFix = (g: RelationGroup, token: RelationToken): { code: string; fix: string } => {
	const target = `\`${g.path ?? g.targetNode}\``;
	const kind = g.kind;
	const roles = token.why.roles;
	// The call itself is fine; the VALUE it was given is what the `except` refused.
	if (token.why.outward) {
		return { code: "rewrite", fix: `Keep this \`${kind}\` of ${target} and change what it is given: the rule's \`except\` refuses that value.` };
	}
	if (!roles.length) {
		// Nothing declares who may do it — or nobody may: either way the line is the
		// thing that goes, and saying so is the whole advice.
		return {
			code: "remove",
			fix: `Delete this \`${kind}\` of ${target}: no code in this architecture is allowed to reach \`${g.targetNode}\` that way, so the line cannot be made legal where it stands.`,
		};
	}
	const who = roles.map((r) => `\`${r}\``).join(", ");

	return {
		code: "remove",
		fix: `Delete this \`${kind}\` of ${target}, or do it from ${who} — that is the only code that may ${kind} it${token.why.sameRoles.length ? ", and only in the same feature instance" : ""}.`,
	};
};

// One group → one verdict, carried on every line it covers.
const describeGroup = (g: RelationGroup, ctx: FileContext, arch: Arch, violations: Violation[]): void => {
	const token = tokenOf(g, arch, ctx.facts?.roles ?? []);
	const text = relationMessage(token, { file: ctx.rel });
	const lines = [...new Set(g.lines)].sort((a, b) => a - b);
	// ONE repair per group, carried on every line it covers: a finding without
	// a fix is a card with nothing to do.
	const repair = relationFix(g, token);
	for (const line of lines) {
		violations.push({
			kind: g.kind,
			targetNode: g.targetNode,
			targetPath: g.path,
			line,
			text,
			fix: repair.fix,
			ask: repair.code,
			destination: g.dest ?? null,
			token,
		});
	}
};

const describeGroups = (groups: ReadonlyMap<string, RelationGroup>, ctx: FileContext, arch: Arch, violations: Violation[]): void => {
	for (const g of groups.values()) describeGroup(g, ctx, arch, violations);
};

export { describeGroups };
export type { RelationGroup, RelationToken };
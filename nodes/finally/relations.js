"use strict";

// Relations: every file→file edge, judged by the role that owns the target.
// Collect (group the refusals), then describe (one token per group).

const { hitOf } = require("../../entities/queries");
const { accessorLabel, checkWhere } = require("../../entities/location");
const { deepestMatch, targetCapsFor } = require("../../entities/tree");
const { homesOf, rolesAtPath, dirOf } = require("../../entities/location");
const { FACT_KINDS, EDGE_FACTS, declaredActions } = require("../../entities/kinds");
const { relationMessage } = require("../../report/errorTypes/vocabulary/phrases");
const { allowedPlaces } = require("./roles");

// THE REPAIR for a relation the architecture refuses — the same three cases the
// sentence has, so a finding is never a dead end: declare who may do it, remove
// the line, or do it from the one place that may. A finding without a `fix` was
// printed as a card with nothing to do (48 of them in one run).
// THE REPAIR for a relation the architecture refuses — always about the CODE,
// never about editing the rule: what to delete, or which of the code that MAY do
// it should own the line. A finding with no repair was a card with nothing to do
// (48 of them in one run).
const relationFix = (g, token) => {
	const target = `\`${g.path ?? g.targetNode}\``;
	const kind = g.kind;
	const roles = token.why.roles ?? [];
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
		fix: `Delete this \`${kind}\` of ${target}, or do it from ${who} — that is the only code that may ${kind} it${token.why.sameRoles?.length ? ", and only in the same feature instance" : ""}.`,
	};
};

const checkRelations = (ctx, arch, violations) => {
	const facts = ctx.facts;
	const fileRoles = facts.roles ?? [];

	const groups = new Map();
	const declared = declaredActions(arch);
	for (const kind of FACT_KINDS) {
		const actionDecls = declared.get(kind) ?? new Map();
		const factsOfKind = EDGE_FACTS[kind];
		const seen = new Set();
		for (const edge of factsOfKind(facts)) {
			const key = `${kind}:${edge.path}:${edge.line}:${edge.what}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const sourceRoles = edge.role ? [edge.role] : edge.piece ? [] : fileRoles;
			const selfStatement = edge.path === ctx.rel;
			if (edge.piece && !edge.role) continue;
			if (!edge.piece && !fileRoles.length) continue;
			const pairs = [];
			const targetRoles = selfStatement ? (edge.role ? [edge.role] : (fileRoles.length ? fileRoles : rolesAtPath(arch, edge.path))) : rolesAtPath(arch, edge.path);
			for (const targetSlug of targetRoles) {
				const action = actionDecls.get(targetSlug);
				if (!action) {
					pairs.push({ targetSlug, action: { where: [], missing: true }, caps: targetCapsFor(edge.path, arch), violation: true });
					continue;
				}
				const caps = targetCapsFor(edge.path, arch);
				// `edge` travels with the facts: the call may need WHAT was passed.
				const scope = { ...facts, roles: sourceRoles, edge: edge.fact ?? null };
				const allowed = sourceRoles.length ? !checkWhere(action.where, ctx.rel, arch, scope, caps) : false;
				// `except` — the action allows it, and one condition still refuses it.
				const denied = (action.except ?? []).length ? !checkWhere(action.except, ctx.rel, arch, scope, caps) : false;
				const violation = sourceRoles.length ? !allowed || denied : true;
				pairs.push({ targetSlug, action, caps, violation, outward: denied });
			}
			for (const roleSlug of Object.keys(arch.codeRoles ?? {})) {
				const accessors = (declared.get("call")?.get(roleSlug)?.scopeAccess ?? []).filter((x) => x.scope === "function").map((x) => x.segments[0]);
				if (!accessors.length) continue;
				const ownFile = homesOf(arch, roleSlug)
					.map((h) => h.template)
					.filter((t) => !/[*{]/.test(t));
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

			pairs.sort(
				(a, b) =>
					// A role that NAMES who may do it explains the rule best …
					Number(Boolean(b.action.where?.length)) - Number(Boolean(a.action.where?.length)) ||
					Number(!b.action.missing) - Number(!a.action.missing) ||
					(a.action.where ?? []).length - (b.action.where ?? []).length,
			);

			if (pairs.length && pairs.every((p) => p.violation)) {
			for (const { targetSlug, action, caps, outward } of pairs.slice(0, 1)) {

				const all = allowedPlaces(action.where, arch, caps);
				const callDecl = declared.get("call")?.get(targetSlug) ?? null;
				const callOk = callDecl?.where ? !checkWhere(callDecl.where, ctx.rel, arch, facts, caps) : false;
				const route = callOk ? ((callDecl?.scopeAccess ?? [])[0] ?? null) : null;
				const others = all.filter((p) => p.role !== targetSlug);
				const places = others.length ? others : all;
				const spots = places
					.filter((pl) => !pl.filter)
					.flatMap((pl) => pl.paths.map((path) => ({ role: pl.role, path })))
					.filter((sp) => sp.path !== ctx.rel && sp.path !== dirOf(ctx.rel) && sp.role !== targetSlug);
				const dest = spots[0]?.path ?? null;

				const gkey = `${kind}|${targetSlug}|${edge.what}`;
				const g = groups.get(gkey) ?? { kind, targetNode: targetSlug, allowedRoles: [...new Set(places.map((pl) => pl.role).filter(Boolean))], sameRoles: [...new Set(places.filter((pl) => pl.same).map((pl) => pl.role).filter(Boolean))], via: (action.scopeAccess ?? []).map(accessorLabel), route: route ? accessorLabel(route) : null, dest, lines: [], what: new Set(), path: edge.path, pieces: new Map(), piece: edge.piece ?? null, pieceRole: edge.role ?? null, silent: Boolean(action.missing) || !(action.where ?? []).length, filtered: Boolean(outward), self: edge.path === ctx.rel, fact: edge.fact ?? null };
				g.lines.push(edge.line ?? 1);
				g.what.add(edge.what);
				if (edge.piece) g.pieces.set(edge.piece, edge.role ?? null);
				groups.set(gkey, g);
			}
			}
		}
	}

	// 2. DESCRIBE — one verdict per group, built from facts and nothing else.
	for (const g of groups.values()) {
		const names = [...(g.pieces ?? new Map()).keys()];
		const roles = [...new Set([...(g.pieces ?? new Map()).values()].filter(Boolean))];
		const owner = g.kind === "mutate" || g.kind === "assign" ? deepestMatch(String(g.path ?? ""), arch)?.node ?? null : null;
		const ownerRole = (owner?.roles ?? []).filter(Boolean)[0] ?? null;
		const token = {
			code: "relation.forbidden",
			// The owner role travels WITH the fact: the report names it.
			fact: g.fact ? { ...g.fact, ownerRole } : null,
			subject: { pieces: names, roles: names.length ? roles : fileRoles, plural: names.length > 1 },
			// The route the architecture DOES allow to the same code, if it names one.
			via: g.via?.[0] ?? g.route ?? null,
			why: {
				code: g.silent ? "silent" : g.allowedRoles?.length ? "allowed" : "nobody",
				roles: g.allowedRoles ?? [],
				// The ones the rule limits to the SAME feature instance.
				sameRoles: g.sameRoles ?? [],
				self: Boolean(g.self),
				outward: Boolean(g.filtered),
				targetNode: g.targetNode ?? null,
			},
		};
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
	}
};

module.exports = { checkRelations };

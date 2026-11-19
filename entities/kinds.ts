"use strict";

import * as configError from "../report/configErrors";

// The closed vocabulary of file→file relations: one producer per relation,
// turning raw AST facts into `{ path, line, piece, role, what }` edges.
// Whether an edge is allowed is the owning role's business (nodes/finally).
//
// The list is a CONTRACT: ast/ produces the facts, this file turns them into
// edges, code-roles/roles validates `of:`, nodes/finally enforces.
// A `call` also carries `with` — the arguments whose type a repo file declares.

import type { Arch, ActionDef, QueryFilter } from "./architecture";
import type { AssignmentFact, CallFact, Candidate, ExportFact, FileFacts } from "./facts";

// THE VOCABULARY, as an enum: one name per relation, one spelling everywhere.
const RELATION = Object.freeze({
	IMPORT: "import",
	EXPORT: "export",
	DECLARE: "declare",
	CALL: "call",
	MUTATE: "mutate",
	ASSIGN: "assign",
	READ: "read",
	TYPE_IMPORT: "typeImport",
});

const FACT_KINDS: string[] = Object.values(RELATION);

// How a WRITE is spelled in the code — the `via` of a write fact.
const VIA = Object.freeze({ ASSIGN: "assign", CALL: "call", DELETE: "delete", FREEZE: "freeze", SEAL: "seal" });

// The relations that CHANGE state — the only ones that name an OWNER.
const CHANGES_STATE = new Set<string>([RELATION.MUTATE, RELATION.ASSIGN]);

const changesState = (relation: string): boolean => CHANGES_STATE.has(relation);

// The facts the producers read: a file's facts plus the repo file list (used to
// tell a repo path from a library specifier).
type Facts = FileFacts & { repoFiles?: readonly string[] | null };

// The shape EVERY edge has.
type Edge = {
	path: string | null;
	line: number;
	piece: string | null;
	external: boolean;
	fact: QueryFilter;
	what: string;
	role: string | null;
	action?: string | null;
};
type EdgeInput = Omit<Edge, "role">;
type EdgeProducer = (facts: Facts) => Edge[];

// The role of the piece of code a fact belongs to, by the piece's name.
const roleOfPiece = (facts: Facts, piece: string | null): string | null => (piece ? ((facts.candidates ?? []).find((c) => c.name === piece && c.role)?.role ?? null) : null);

// Is a module path a FILE of this repo?
const isRepoModule = (facts: Facts, module: string | null | undefined): boolean => Boolean(module) && (facts.repoFiles ?? []).includes(module ?? "");

// The line a candidate starts on.
const lineOf = (c: Candidate): number => c.lines?.[0] ?? 1;

// The shape EVERY edge has: the target, the piece it belongs to and whether the
// target is a library, plus the structured `fact` and its sentence.
const edgeOf = (facts: Facts, edge: EdgeInput): Edge => ({ ...edge, role: roleOfPiece(facts, edge.piece) });

const callsOf = (facts: Facts): Edge[] =>
	(facts.candidates ?? []).flatMap((c) =>
		(c.calls ?? [])
			.filter((call) => call.module && !call.receiverOnly)
			.map((call): EdgeInput => ({
				path: call.module,
				line: lineOf(c),
				action: call.action,
				piece: c.name ?? null,
				external: !isRepoModule(facts, call.module),
				fact: { kind: "call", action: call.action ?? null, module: call.module, with: call.arguments ?? [] },
				what: `calls \`${call.action}\` of \`${call.module}\``,
			}))
			.map((edge) => edgeOf(facts, edge)),
	);

const readsOf = (facts: Facts): Edge[] =>
	(facts.reads ?? []).map((r) =>
		edgeOf(facts, {
			path: r.module,
			line: r.line ?? 1,
			piece: r.piece ?? null,
			external: !isRepoModule(facts, r.module),
			fact: { kind: "read", what: r.what ?? null, module: r.module },
			what: `reads \`${r.what}\` of \`${r.module}\``,
		}),
	);

// EVERY write, split by the RELATION it forms — the split itself lives on the
// fact (`assignments[].relation`).
// How a write reads: mutate vs. own-value, on `this` vs. another module.
type WriteInfo = { target: string; module: string | null | undefined; method: string | null | undefined; onThis: boolean; mutate: boolean };
const writeWhat = ({ target, module, method, onThis, mutate }: WriteInfo): string => {
	if (!mutate) return `writes into \`${target}\`${method ? ` through \`${method}()\`` : ""}`;
	return onThis ? `changes \`${target}\` of its own file` : `changes \`${target}\` of \`${module}\``;
};

const writePath = (facts: Facts, a: AssignmentFact, mutate: boolean): string | null => {
	if (!mutate) return facts.location.path;
	return a.onThis ? facts.location.path : a.module ?? null;
};

const writeExternal = (facts: Facts, a: AssignmentFact, mutate: boolean): boolean => (mutate && !a.onThis ? !isRepoModule(facts, a.module) : false);

const assignmentEdge = (facts: Facts, c: Candidate, a: AssignmentFact, mutate: boolean): Edge =>
	edgeOf(facts, {
		path: writePath(facts, a, mutate),
		line: a.line ?? lineOf(c),
		piece: c.name ?? null,
		external: writeExternal(facts, a, mutate),
		// THE FACT — what the code did, as data.
		fact: { kind: mutate ? RELATION.MUTATE : RELATION.ASSIGN, target: a.target ?? null, module: a.module ?? null, method: a.method ?? null, onThis: Boolean(a.onThis) },
		what: writeWhat({ target: a.target, module: a.module, method: a.method, onThis: Boolean(a.onThis), mutate }),
	});

const assignmentsOf = (facts: Facts, { mutate }: { mutate: boolean }): Edge[] =>
	(facts.candidates ?? []).flatMap((c) =>
		(c.assignments ?? [])
			.filter((a) => a.relation === (mutate ? RELATION.MUTATE : RELATION.ASSIGN))
			.map((a) => assignmentEdge(facts, c, a, mutate)),
	);

// How an export reads — the ONE place the export vocabulary is spelled.
const exportWhat = (exp: ExportFact, names: string[]): string => {
	if (exp.form === "named" && !exp.from) return names.length ? `exports \`${names.join("`, `")}\`` : "is exported";
	if (exp.form === "namespace") return `re-exports \`${exp.source}\` as \`${names[0]}\``;
	if (exp.form === "star") return `re-exports \`${exp.source}\``;
	if (exp.form === "default") return "is exported as its default";
	if (exp.form === "equals") return "is exported with `export =`";
	if (exp.name) return `exports \`${exp.name}\` through CommonJS`;
	return "is exported through CommonJS";
};

// The piece an export is about: the published binding, or null for a re-export.
const exportPiece = (facts: Facts, exp: ExportFact, names: string[]): string | null => {
	if (exp.piece) return exp.piece;
	if (exp.from || names.length !== 1) return null;
	return (facts.candidates ?? []).some((c) => c.name === names[0]) ? names[0] : null;
};

const exportFromEdges = (facts: Facts): Edge[] =>
	(facts.exports ?? []).map((exp) => {
		const names = exp.named ?? [];
		const fact = { kind: "export", form: exp.form ?? "named", names, name: exp.name ?? null, source: exp.source ?? null, resolved: exp.from ?? null, reExport: Boolean(exp.from) };

		return edgeOf(facts, { path: exp.from ?? facts.location.path, line: exp.line ?? 1, piece: exportPiece(facts, exp, names), external: exp.from ? !isRepoModule(facts, exp.from) : false, fact, what: exportWhat(exp, names) });
	});

const declaredExportEdges = (facts: Facts): Edge[] =>
	(facts.candidates ?? [])
		.filter((c) => c.exported)
		.map((c) =>
			edgeOf(facts, {
				path: facts.location.path,
				line: lineOf(c),
				piece: c.name ?? null,
				external: false,
				fact: { kind: "export", form: "declared", names: c.name ? [c.name] : [], name: c.name ?? null, source: null, reExport: false },
				what: "is exported",
			}),
		);

// A declaration that only RENAMES another module's value (`const a = b.c`).
const renamedCall = (c: Candidate): CallFact | null => {
	const calls = (c.calls ?? []).filter((x) => x.module && !x.receiverOnly);
	const returned = (c.returns ?? [])[0]?.exprKind ?? null;
	const renames = returned === "CallExpression" || returned === "PropertyAccessExpression";
	return calls.length === 1 && renames ? calls[0] : null;
};

const declareEdge = (facts: Facts, c: Candidate): Edge => {
	const renames = renamedCall(c);

	return edgeOf(facts, {
		path: renames ? renames.module : facts.location.path,
		line: lineOf(c),
		piece: c.name ?? null,
		external: renames ? !isRepoModule(facts, renames.module) : false,
		fact: { kind: "declare", renames: renames ? { action: renames.action ?? null, module: renames.module } : null },
		what: renames ? `re-declares \`${renames.action}\` of \`${renames.module}\`` : "is declared here",
	});
};

const EDGE_FACTS: Record<string, EdgeProducer> = {
	// `import … from "x"` — a resolved static import.
	[RELATION.IMPORT]: (facts) =>
		(facts.imports ?? [])
			.filter((imp) => imp.resolved && !imp.typeOnly)
			.map((imp) =>
				edgeOf(facts, {
					path: imp.resolved ?? null,
					line: imp.line ?? 1,
					piece: imp.piece ?? null,
					external: !isRepoModule(facts, imp.resolved),
					fact: { kind: "import", form: imp.form ?? null, source: imp.source ?? null, resolved: imp.resolved ?? null },
					what: imp.form === "statement" ? `imports \`${imp.resolved}\`` : `requires \`${imp.source}\``,
				}),
			),
	// `import type … from "x"` — a TYPE dependency.
	[RELATION.TYPE_IMPORT]: (facts) =>
		(facts.imports ?? [])
			.filter((imp) => imp.resolved && imp.typeOnly)
			.map((imp) =>
				edgeOf(facts, {
					path: imp.resolved ?? null,
					line: imp.line ?? 1,
					piece: imp.piece ?? null,
					external: !isRepoModule(facts, imp.resolved),
					fact: { kind: "typeImport", source: imp.source ?? null, resolved: imp.resolved ?? null },
					what: `names a type of \`${imp.resolved}\``,
				}),
			),
	// EVERY way code leaves the module, whatever the spelling.
	[RELATION.EXPORT]: (facts) => [...exportFromEdges(facts), ...declaredExportEdges(facts)],
	// EVERY declaration: `const`/`let`/`var`, `function`, `class`, and a
	// re-declaration that only renames another module's value.
	[RELATION.DECLARE]: (facts) => (facts.candidates ?? []).map((c) => declareEdge(facts, c)),
	// Running another module's code.
	[RELATION.CALL]: callsOf,
	// Writing into a value this file does not own.
	[RELATION.MUTATE]: (facts) => assignmentsOf(facts, { mutate: true }),
	// Writing into the piece's own value.
	[RELATION.ASSIGN]: (facts) => assignmentsOf(facts, { mutate: false }),
	// Reading another module's value.
	[RELATION.READ]: readsOf,
};

// Which roles declare an ACTION for each relation: `Map<factKind, Map<roleSlug,
// action>>`.
const declaredActions = (arch: Arch): Map<string, Map<string, ActionDef>> => {
	const byFact = new Map<string, Map<string, ActionDef>>();
	for (const [slug, def] of Object.entries(arch.codeRoles ?? {})) {
		for (const [key, action] of Object.entries(def.actions ?? {})) {
			const factKind = action.of ?? key;
			if (!byFact.has(factKind)) byFact.set(factKind, new Map());
			byFact.get(factKind)?.set(slug, action);
		}
	}
	return byFact;
};

// A role may only say `of: <kind>` for a relation the engine can see, and every
// declared kind must have a producer. Checked at load, so a typo fails loudly.
for (const kind of FACT_KINDS) {
	if (!EDGE_FACTS[kind]) throw configError.relationWithoutProducer({ relation: kind });
}
for (const kind of Object.keys(EDGE_FACTS)) {
	if (!FACT_KINDS.includes(kind)) throw configError.undeclaredRelation({ relation: kind });
}

export { RELATION, VIA, FACT_KINDS, EDGE_FACTS, CHANGES_STATE, changesState, declaredActions };
export type { Facts, Edge };

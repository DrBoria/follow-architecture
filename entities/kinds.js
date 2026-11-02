"use strict";

// What the engine can SEE: the closed vocabulary of file→file relations, and
// one producer per relation that turns raw AST facts into that relation.
//
// Nothing in here is a verdict. ast/ observes what a piece of code contains
// (imports, calls, assignments, declarations); this file answers one question
// about those observations — "which OTHER file does this piece touch, and how?"
// — as `{ path, line, piece, role, what }` edges. Whether an edge is allowed is
// decided by the role that owns the piece (nodes/finally.js), compared through
// the one filter engine in entities/queries.js.
//
// The eight relations are the whole vocabulary, one per thing code can do to
// code it does not own: bring it in (`import`), hand it out (`export`), put a
// name on it (`declare`), run it (`call`), change it (`mutate`), write into its
// own value (`assign`), look at it (`read`), and name it as a type
// (`typeImport`).
//
// `declare` is EVERY declaration: `const`, `let`, `var`, `function`, `class`, and
// a re-declaration that only renames somebody else's value (`const a = b.c`,
// `const f = () => g()`). `export` is every way code leaves the module.
// `import` is not only the `import` statement: `require(…)` / `import(…)` inside
// a function is a dependency of THAT PIECE of code, so its edge names the piece.
// `assign` and `mutate` are the same fact seen twice: a write that stays inside
// the piece is an `assign`, a write that lands in somebody else's value is a
// `mutate` — the role that owns the written value decides.
//
// The list lives here, outside `utils/`, because it is a CONTRACT between four
// parts of the engine (ast/ produces the facts, this file turns them into
// edges, code-roles/roles.js validates `of:`, nodes/finally.js enforces the
// rule) and because a config points at it directly (`of: call`). A helper may
// change freely; a contract may not.

const FACT_KINDS = ["import", "export", "declare", "call", "mutate", "assign", "read", "typeImport"];

// The role of the piece of code a fact belongs to, by the piece's name.
// The role of a piece is the role of ANY candidate describing it: a `const` holding
// an arrow is the same piece seen twice, and only one of the two carries the role.
const roleOfPiece = (facts, piece) => (piece ? ((facts.candidates ?? []).find((c) => c.name === piece && c.role)?.role ?? null) : null);

// The line a candidate starts on — `lines` is the one place that says it.
const lineOf = (c) => c.lines?.[0] ?? 1;

// One producer per kind declared above, keyed by the name a config writes in
// `of:`. A new relation is added in exactly two places: the list, and here.
// Everything downstream (findings, report, graph) is driven by the config,
// never by a list of known relation names.
const callsOf = (facts) =>
	(facts.candidates ?? []).flatMap((c) =>
		(c.calls ?? [])
			// `requireRootStore().settings` reaches the store through a property
			// access on the call's RESULT: that is a `read`, and the call is only
			// the receiver. Counting it as a call too would report one line twice.
			.filter((call) => call.module && !call.receiverOnly)
			// `action` travels on the edge: "which function of that module is
			// called" is the difference between reaching a store through a declared
			// accessor and reaching it through anything else. `piece`/`role` name the
			// CODE that makes the edge — a role belongs to a function or a variable,
			// never to the file: one file holds an action AND a view, and each is
			// judged by its own role.
			.map((call) => ({ path: call.module, line: lineOf(c), action: call.action, piece: c.name ?? null, role: roleOfPiece(facts, c.name), what: `calls \`${call.action}\` of \`${call.module}\`` })),
	);

// Reading another module's value without invoking it: `requireRootStore().settings`,
// `Settings.debug`, `host.workspace` — a member access whose root belongs to
// somebody else. A call is NOT a read (it has its own relation), and neither is
// a write target (`f().x = …` is a `mutate`), so the three never overlap.
const readsOf = (facts) =>
	(facts.reads ?? []).map((r) => ({ path: r.module, line: r.line ?? 1, piece: r.piece ?? null, role: roleOfPiece(facts, r.piece), what: `reads \`${r.what}\` of \`${r.module}\`` }));

// EVERY write, split by the RELATION it forms — the split itself lives on the
// fact (`assignments[].relation`, ast/assignments.js), so the edge producers and
// a config filter answer the same question the same way.
const assignmentsOf = (facts, { mutate }) =>
	(facts.candidates ?? []).flatMap((c) =>
		(c.assignments ?? [])
			.filter((a) => a.relation === (mutate ? "mutate" : "assign"))
			.map((a) => ({
				path: mutate ? (a.onThis ? facts.location.path : a.module) : facts.location.path,
				line: a.line ?? lineOf(c),
				piece: c.name ?? null,
				role: roleOfPiece(facts, c.name),
				what: mutate
					? a.onThis
						? `changes \`${a.target}\` of its own file`
						: `changes \`${a.target}\` of \`${a.module}\``
					: `writes into \`${a.target}\`${a.method ? ` through \`${a.method}()\`` : ""}`,
			})),
	);

const EDGE_FACTS = {
	// `import … from "x"` — a resolved static import. `import type` is NOT a
	// dependency: nothing runs and nothing is bound at runtime, so an adapter may
	// name a type of the code it must not import (and the reverse).
	import: (facts) =>
		(facts.imports ?? [])
			.filter((imp) => imp.resolved && !imp.typeOnly)
			.map((imp) => ({
				// A statement is not a piece of code with a role of its own: the module
				// scope is the piece, and the file's roles answer for it. A `require`
				// inside a function belongs to THAT function.
				path: imp.resolved,
				line: imp.line ?? 1,
				piece: imp.piece ?? null,
				role: roleOfPiece(facts, imp.piece),
				what: imp.form === "statement" ? `imports \`${imp.resolved}\`` : `requires \`${imp.source}\``,
			})),
	// `import type … from "x"` — a TYPE dependency. Split from `import` because
	// nothing is bound at runtime: an adapter may name a type of the code it
	// must not import, and a store may type a value it holds without depending
	// on the module that produces it.
	typeImport: (facts) =>
		(facts.imports ?? [])
			.filter((imp) => imp.resolved && imp.typeOnly)
			.map((imp) => ({ path: imp.resolved, line: imp.line ?? 1, piece: imp.piece ?? null, role: roleOfPiece(facts, imp.piece), what: `names a type of \`${imp.resolved}\`` })),
	// EVERY way code leaves the module, whatever the spelling.
	// The piece the edge belongs to is the piece that is published; a statement
	// outside any piece (`export * from "x"`) is answered for by the module scope.
	export: (facts) => {
		const pieceFor = (name) => ((facts.candidates ?? []).some((c) => c.name === name) ? name : null);
		const fromFacts = (facts.exports ?? []).map((exp) => {
			const names = exp.named ?? [];
			// A re-export publishes ANOTHER module's binding; a named export
			// publishes a local one.
			const piece = exp.piece ?? (exp.from || names.length !== 1 ? null : pieceFor(names[0]));
			const what =
				exp.form === "named" && !exp.from
					? names.length
						? `exports \`${names.join("`, `")}\``
						: "is exported"
					: exp.form === "namespace"
						? `re-exports \`${exp.source}\` as \`${names[0]}\``
						: exp.form === "star"
							? `re-exports \`${exp.source}\``
							: exp.form === "default"
								? "is exported as its default"
								: exp.form === "equals"
									? "is exported with `export =`"
									: exp.name
										? `exports \`${exp.name}\` through CommonJS`
										: "is exported through CommonJS";

			return { path: exp.from ?? facts.location.path, line: exp.line ?? 1, piece, role: roleOfPiece(facts, piece), what };
		});
		// `export const x = …` / `export function f` — a declaration modifier, with
		// no statement to find it on.
		const declared = (facts.candidates ?? [])
			.filter((c) => c.exported)
			.map((c) => ({ path: facts.location.path, line: lineOf(c), piece: c.name ?? null, role: roleOfPiece(facts, c.name), what: "is exported" }));

		return [...fromFacts, ...declared];
	},
	// EVERY declaration: `const`/`let`/`var`, `function`, `class`, and a
	// re-declaration that only renames another module's value
	// (`const a = b.c`, `const f = () => g()`). The edge points at the module the
	// declared value comes FROM; a declaration of the file's own code points at the
	// file itself, which is where it is declared.
	declare: (facts) =>
		(facts.candidates ?? []).map((c) => {
			const calls = (c.calls ?? []).filter((x) => x.module && !x.receiverOnly);
			const returned = (c.returns ?? [])[0]?.exprKind ?? null;
			const renames = calls.length === 1 && (returned === "CallExpression" || returned === "PropertyAccessExpression") ? calls[0] : null;

			return {
				path: renames ? renames.module : facts.location.path,
				line: lineOf(c),
				piece: c.name ?? null,
				role: roleOfPiece(facts, c.name),
				// A phrase that reads after the subject: "`f` <what>".
				what: renames ? `re-declares \`${renames.action}\` of \`${renames.module}\`` : "is declared here",
			};
		}),
	// Running another module's code.
	call: callsOf,
	// Writing into a value this file does not own.
	mutate: (facts) => assignmentsOf(facts, { mutate: true }),
	// Writing into the piece's own value — no other file is involved, so the edge
	// points at the file itself and the piece's own role decides.
	assign: (facts) => assignmentsOf(facts, { mutate: false }),
	// Reading another module's value: `store.grammars`, `Settings.debug`.
	read: readsOf,
};

// Which roles declare an ACTION for each relation: `Map<factKind, Map<roleSlug,
// action>>`. An action may say `of: call` — its own vocabulary (emit, dispatch,
// invoke …) mapped onto the relation the AST actually has — so anything that
// needs "the role's rule for this relation" asks HERE, never for a key by name.
const declaredActions = (arch) => {
	const byFact = new Map();
	for (const [slug, def] of Object.entries(arch?.codeRoles ?? {})) {
		for (const [key, action] of Object.entries(def.actions ?? {})) {
			const factKind = action.of ?? key;
			if (!byFact.has(factKind)) byFact.set(factKind, new Map());
			byFact.get(factKind).set(slug, action);
		}
	}
	return byFact;
};

// A role may only say `of: <kind>` for a relation the engine can actually see,
// and every declared kind must have a producer. Checked at load, so a typo
// fails loudly instead of silently disabling a rule.
for (const kind of FACT_KINDS) {
	if (!EDGE_FACTS[kind]) throw new Error(`kinds: relation \`${kind}\` is declared but has no producer`);
}
for (const kind of Object.keys(EDGE_FACTS)) {
	if (!FACT_KINDS.includes(kind)) throw new Error(`kinds: \`${kind}\` has a producer but is not declared`);
}

module.exports = { FACT_KINDS, EDGE_FACTS, declaredActions };

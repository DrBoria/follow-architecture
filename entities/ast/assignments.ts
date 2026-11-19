"use strict";

// EVERY write in one piece of code, as ONE fact. `x = 1`, `state.x = …`,
// `getRoot().settings = …`, `delete imported.x`, `Object.freeze(imported)`,
// `state.replace(…)`, `this.x = …` — a write is a write, and where it lands is
// the only thing that differs. That is what `relation` records, once, so the
// edge producers (entities/kinds.js) and a config filter read the same answer.
//
// Three passes see a write from three angles — the raw `=` in the syntax
// (assignments-raw), the binding it lands in, and the TYPE of the value it lands
// in (assignments-tagged) — merged here into one entry per (line, root), then
// given its single `relation` word.
//
//   line   — where it is written
//   target — the expression written to
//   value  — the root identifier written into (`state` in `state.x = 1`)
//   via    — how: assign / call / delete / freeze / seal
//   method — for a method call that writes: the method's name (`set` in `set(…)`)
//   module — the repo module the written value belongs to, when it is not local
//   onThis — the target is `this.something`, i.e. the code that owns this piece
//   type   — the file declaring the written value's type (resolved by the checker)
//   param  — the root is one of this function's parameters
//   local  — the root is a local binding of this function
//   relation — the ONE classification of the write: `mutate` (somebody else's
//            value), `assign` (state handed in or declared by another file), or
//            null (this file's own private state — no role has a say in it)

import { type Node, type SourceFile } from "ts-morph";
import { isFunctionNode, isClassNode } from "./tree";
import { plainAssignments, collectMutations } from "./assignments-raw";
import { taggedWrites } from "./assignments-tagged";
import { RELATION } from "../kinds";
import type { ImportMap } from "./assignments-nodes";
import type { AssignmentFact } from "../facts";

// Is a resolved file the one this code lives in? The checker answers with a path
// relative to the repo root when it knows it, and with the absolute one it read
// otherwise, so both spellings name the same file.
const isSameFile = (file: string | null | undefined, rel: string | null): boolean => file != null && rel != null && (file === rel || file.endsWith(`/${rel}`));

// Which RELATION a write forms. One rule, read by the edge producers and
// available to a filter — so "does this code write into anything that is not
// its own?" is asked the same way everywhere.
//   mutate — the value belongs to another module, or to the code that owns this
//            file (`this.x`): somebody else's state changes.
//   assign — the value was HANDED IN (a parameter) or its type is declared by
//            ANOTHER file: the piece writes into state it does not own.
//   null   — this file's own state: private, and no role has a say in it.
const relationOf = (entry: Partial<AssignmentFact>, rel: string | null): string | null => {
	if (!entry.performed) return null;
	if (entry.param) return RELATION.ASSIGN;
	if (entry.onThis) return RELATION.MUTATE;
	if (entry.module && !isSameFile(entry.module, rel)) return RELATION.MUTATE;
	if (entry.type && !isSameFile(entry.type, rel)) return RELATION.ASSIGN;

	return null;
};

// A defined incoming facet wins over the one an earlier pass wrote; a missing
// one keeps the earlier pass's answer.
const pick = <T>(next: T | undefined | null, prev: T | undefined): T | undefined => (next !== undefined && next !== null ? next : prev);

// Merge one write's facets over a previous entry for the same (line, root): the
// syntax gives `target`/`local`, the binding gives `module`/`onThis`, the checker
// gives `type`/`param`.
const mergeWrite = (prev: AssignmentFact | undefined, entry: AssignmentFact): AssignmentFact => {
	const base: AssignmentFact = prev ?? { line: entry.line, target: entry.target, via: entry.via };

	return {
		line: entry.line,
		target: entry.target,
		via: entry.via,
		value: pick(entry.value, base.value),
		method: pick(entry.method, base.method),
		performed: pick(entry.performed, base.performed),
		module: pick(entry.module, base.module),
		onThis: pick(entry.onThis, base.onThis),
		param: pick(entry.param, base.param),
		local: pick(entry.local, base.local),
		type: pick(entry.type, base.type),
	};
};

// ── The one fact ────────────────────────────────────────────────────────────
// The three passes describe the same line, so they merge into one entry per
// (line, root), then each gets its single `relation` word.
const assignmentsFact = (node: Node, sf: SourceFile, importMap: ImportMap, ctx: { repoRoot: string; rel: string | null }): AssignmentFact[] => {
	const byKey = new Map<string, AssignmentFact>();
	const add = (entry: AssignmentFact): void => {
		// `line:value:method` — two mutating calls of the same value on one line are
		// two writes, and the three passes merge on the same write because they
		// agree on all three. Keyed by the ROOT, not the target spelling: one pass
		// rewrites the target into the alias's initializer, and keying by target
		// split one write into two.
		const key = `${entry.line}:${entry.value ?? entry.target}:${entry.method ?? ""}`;
		byKey.set(key, mergeWrite(byKey.get(key), entry));
	};

	if (isFunctionNode(node)) plainAssignments(node, importMap).forEach(add);
	if (isFunctionNode(node) || isClassNode(node)) collectMutations(node, importMap).forEach(add);
	if (isFunctionNode(node)) taggedWrites(node, sf, importMap, ctx.repoRoot).forEach(add);

	return [...byKey.values()].map((entry) => ({ ...entry, relation: relationOf(entry, ctx.rel) })).sort((a, b) => a.line - b.line);
};

export { assignmentsFact, relationOf };

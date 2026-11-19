"use strict";

// How many calls deep a piece of code goes before somebody else does the work.
//
// A piece that calls an imported function which calls another which calls
// another is not readable at the call site: nobody can see where the state is
// finally changed, and no role rule can point at the place that changed it.
// The chain is what this fact measures — `toggleLineAction → applyDecorations →
// applyActiveEditorDecorations → …` is a depth of 5, and a rule may refuse it.
//
// The walk follows the facts the AST already produces: a bare-identifier call
// carries `target: { path, name }`, so the next piece is found by parsing that
// module and looking for the name. Files are parsed once per run and every
// (file, name) pair is memoised, so a chain is walked once however often it is
// asked about. A cycle stops the walk (a recursive helper is not "deeper").

import * as fs from "node:fs";
import * as path from "node:path";

import { loadSourceFile, importNameModules, collectCandidates } from "./index";
import { notice } from "../../report/notices";
import { readOrFallback } from "../../utils/try-read";
import { reasonOf } from "../../utils/reason";
import type { Candidate, CallFact } from "../facts";
import type { ScanContext } from "../context";

// One measured chain: how deep it goes and the names on the way, outermost
// first. The walk reads and writes this one shape.
type Chain = { depth: number; chain: string[] };

// The per-run cache the walk fills: every (file, name) pair's chain, and every
// file's parsed candidates. DERIVED from the walk's own maps so the cache and
// the walk can never disagree about what they hold.
type DepthCache = { memo: Map<string, Chain>; files: Map<string, Candidate[]> };

// The walk's shared state: the run's scan view plus the file being checked and
// the run's cache. The stack of (file, name) pairs guards cycles.
type DepthWalk = ScanContext & { rel: string; cache?: DepthCache };

// Where the walk currently is: the file, the piece's name, and the names
// declared locally (a bare call to one of them stays in this file).
type WalkAt = { rel: string; name: string; local: ReadonlySet<string> };

// Where a call leads next: an imported symbol names its module (followed only
// when the module is a repo file); a bare call to a local name follows the name
// in the same file. Anything else is a leaf.
const nextOf = (call: CallFact, at: WalkAt, ctx: DepthWalk, stack: Set<string>): Chain | null => {
	if (call.target?.path) {
		return (ctx.repoFiles ?? []).includes(call.target.path) ? depthOf(call.target.path, call.target.name ?? "", ctx, stack) : null;
	}
	if (call.bare && call.action && at.local.has(call.action) && call.action !== at.name) return depthOf(at.rel, call.action, ctx, stack);

	return null;
};

// The longest chain among a piece's calls.
const deepestCall = (piece: Candidate, at: WalkAt, ctx: DepthWalk, stack: Set<string>): Chain => {
	let best: Chain = { depth: 0, chain: [] };
	for (const call of piece.calls ?? []) {
		const next = nextOf(call, at, ctx, stack);
		if (next && next.depth > best.depth) best = next;
	}

	return best;
};

const depthOf = (rel: string, name: string, ctx: DepthWalk, stack: Set<string>): Chain => {
	const key = `${rel}#${name}`;
	const memo = ctx.cache?.memo.get(key);
	if (memo) return memo;
	if (stack.has(key)) return { depth: 0, chain: [] };
	stack.add(key);
	// ONE name may be several candidates — a `const f = () => …` is the variable
	// AND the arrow — and only the arrow carries the calls, so every candidate of
	// that name is walked and the longest chain wins.
	const candidates = candidatesIn(rel, ctx);
	const pieces = candidates.filter((c) => c.name === name);
	const local = new Set(candidates.map((c) => c.name).filter((n): n is string => Boolean(n)));
	let best: Chain = { depth: 0, chain: [] };
	for (const piece of pieces) {
		const next = deepestCall(piece, { rel, name, local }, ctx, stack);
		if (next.depth > best.depth) best = next;
	}
	stack.delete(key);
	const out: Chain = { depth: best.depth + 1, chain: [name, ...best.chain] };
	ctx.cache?.memo.set(key, out);

	return out;
};

// The candidates of one repo file, parsed once per run. An unreadable file
// (generated, outside the project) has no chain: the fact is about code the
// tool can actually read. The reason is reported, so a missing chain never
// passes for a shallow one.
const candidatesIn = (rel: string, ctx: DepthWalk): Candidate[] => {
	const cached = ctx.cache?.files.get(rel);
	if (cached) return cached;
	const read = (): Candidate[] => {
		const abs = path.join(ctx.repoRoot, rel);
		const sf = loadSourceFile(ctx.project, abs, fs.readFileSync(abs, "utf8"));
		const importMap = importNameModules(sf, ctx.repoRoot, ctx.aliases ?? {}, ctx.repoFiles);

		return collectCandidates(sf, importMap, rel, ctx.repoRoot);
	};
	const out = readOrFallback(rel, read, [], (e) => notice(`the import chain of ${rel} could not be read`, reasonOf(e)));
	ctx.cache?.files.set(rel, out);

	return out;
};

// Give every candidate its `kind.chain` — how many pieces the call chain passes
// through (this one included) and their names, outermost first. It lives under
// `kind` because it describes the SHAPE of the code, next to `own` and
// `descendants`; a top-level fact of its own would be a second vocabulary for
// the same question.
const attachCallDepth = (candidates: Candidate[], ctx: DepthWalk): Candidate[] => {
	for (const c of candidates) {
		if (!c.name) continue;
		const { chain } = depthOf(ctx.rel, c.name, ctx, new Set());
		// The chain as ONE string: a finding names it, so a rule can print it
		// without the report layer knowing about arrays.
		// The chain is a LIST of links, and nothing more: how deep it counts, where it
		// stops being interesting, what it may not pass through — that is a FILTER's
		// job, and the filter language already has the operators for it. The engine
		// answers "what is called next", never "is that too deep".
		const flat = chain.filter((n, i) => n !== chain[i - 1]);
		c.kind = { ...(c.kind ?? {}), chain: flat.map((n) => ({ name: n })) };
	}

	return candidates;
};

export { attachCallDepth };
export type { DepthCache, Chain };

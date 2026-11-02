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

const fs = require("node:fs");
const path = require("node:path");

const { loadSourceFile, importNameModules, collectCandidates } = require("./index");

const depthOf = (rel, name, ctx, stack) => {
	const key = `${rel}#${name}`;
	const memo = ctx.memo.get(key);
	if (memo) return memo;
	if (stack.has(key)) return { depth: 0, chain: [] };
	stack.add(key);
	// ONE name may be several candidates — a `const f = () => …` is the variable
	// AND the arrow — and only the arrow carries the calls, so every candidate of
	// that name is walked and the longest chain wins.
	const pieces = (candidatesIn(rel, ctx) ?? []).filter((c) => c.name === name);
	let best = { depth: 0, chain: [] };
	const local = new Set((candidatesIn(rel, ctx) ?? []).map((c) => c.name).filter(Boolean));
	for (const piece of pieces) {
		for (const call of piece.calls ?? []) {
			// A call to an IMPORTED symbol names its module; a call to a function
			// declared in the same file does not, so the chain follows the name
			// locally. Without that, every private helper (`applyDecorationEntry`)
			// looked like a leaf and a ten-deep chain measured as two.
			const next = call.target?.path
				? ctx.repoFiles.includes(call.target.path)
					? depthOf(call.target.path, call.target.name, ctx, stack)
					: null
				: call.bare && local.has(call.action) && call.action !== name
					? depthOf(rel, call.action, ctx, stack)
					: null;
			if (next && next.depth > best.depth) best = next;
		}
	}
	stack.delete(key);
	const out = { depth: best.depth + 1, chain: [name, ...best.chain] };
	ctx.memo.set(key, out);

	return out;
};

// The candidates of one repo file, parsed once per run.
const candidatesIn = (rel, ctx) => {
	if (ctx.files.has(rel)) return ctx.files.get(rel);
	let out = [];
	try {
		const abs = path.join(ctx.repoRoot, rel);
		const sf = loadSourceFile(ctx.project, abs, fs.readFileSync(abs, "utf8"));
		const importMap = importNameModules(sf, ctx.repoRoot, ctx.aliases ?? {}, ctx.repoFiles);
		out = collectCandidates(sf, importMap, rel, ctx.repoRoot);
	} catch {
		// An unreadable file (generated, outside the project) has no chain: the
		// fact is about code the tool can actually read.
		out = [];
	}
	ctx.files.set(rel, out);

	return out;
};

// Give every candidate its `kind.chain` — how many pieces the call chain passes
// through (this one included) and their names, outermost first. It lives under
// `kind` because it describes the SHAPE of the code, next to `own` and
// `descendants`; a top-level fact of its own would be a second vocabulary for
// the same question.
const attachCallDepth = (candidates, ctx) => {
	const shared = { ...ctx, memo: ctx.cache?.memo ?? new Map(), files: ctx.cache?.files ?? new Map() };
	if (ctx.cache) {
		ctx.cache.memo = shared.memo;
		ctx.cache.files = shared.files;
	}
	for (const c of candidates) {
		if (!c.name) continue;
		const { chain } = depthOf(ctx.rel, c.name, shared, new Set());
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

module.exports = { attachCallDepth };

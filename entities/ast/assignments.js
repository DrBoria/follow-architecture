"use strict";

// EVERY write in one piece of code, as ONE fact. `x = 1`, `state.x = …`,
// `getRoot().settings = …`, `delete imported.x`, `Object.freeze(imported)`,
// `state.replace(…)`, `this.x = …` — a write is a write, and where it lands is
// the only thing that differs. That is what `relation` records, once, so the
// edge producers (entities/kinds.js) and a config filter read the same answer.
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

const { SK, isFunctionNode, isClassNode, startLine, inThisPiece } = require("./tree");
const { importModuleOf, isThisChain } = require("./properties");
const { declaredFileOfNode, declaredFileOf, declaredFileOfType, declaredFileOfExpr, inRepo } = require("./file");

// The identifier a written expression is rooted in: `state.a.b = …` → `state`.
// Null when the root is not an identifier at all (`getRoot().x = …`, `this.x`).
// `x!` and `(x)` are the same value with extra syntax: unwrap them before asking
// what the expression is rooted in, or `getRootStore()!.level = …` looks rooted in
// nothing at all.
const bare = (node) => {
	let n = node;
	while (n && ["NonNullExpression", "ParenthesizedExpression"].includes(n.getKindName?.())) n = n.getExpression();

	return n;
};
const rootNodeOf = (expr) => {
	let node = bare(expr);
	while (node && (node.getKind() === SK.PropertyAccessExpression || node.getKind() === SK.ElementAccessExpression)) node = bare(node.getExpression());

	return node && node.getKind() === SK.Identifier ? node : null;
};
const rootNameOf = (expr) => rootNodeOf(expr)?.getText() ?? null;

// Is an assignment's left-hand side a local binding of the enclosing function?
// A property/element access (`state.x = ...`) is local when its BASE object is a
// local binding — writing to a property of a local is still a local mutation.
const isLocalTarget = (lhs, fn) => {
	let base = lhs;
	if (base.getKind() === SK.PropertyAccessExpression) base = base.getExpression();
	else if (base.getKind() === SK.ElementAccessExpression) base = base.getExpression();
	const name = base.getKind() === SK.Identifier ? base.getText() : null;
	if (!name) return false;
	const params = new Set(fn.getParameters().map((p) => p.getName()));
	const locals = new Set(fn.getDescendantsOfKind(SK.VariableDeclaration).map((d) => d.getName()));

	return params.has(name) || locals.has(name);
};

// Plain `=` assignments inside a candidate: the target, whether it is local,
// and the module it came from (an imported binding is somebody else's value).
const plainAssignments = (node, importMap) =>
	node
		.getDescendants()
		.filter((d) => d.getKind() === SK.BinaryExpression && d.getOperatorToken().getText() === "=" && inThisPiece(node, d))
		.map((a) => {
			const lhs = a.getLeft();
			const fn = isFunctionNode(node) ? node : null;

			return { line: lhs.getStartLineNumber(), target: lhs.getText(), via: "assign", value: rootNameOf(lhs), local: fn ? isLocalTarget(lhs, fn) : false, module: importModuleOf(lhs, importMap), onThis: isThisChain(lhs) };
		});

// Writes into ANOTHER module's value: assignment to an imported binding,
// `delete imported.x`, and `Object.freeze(imported)` / `Object.seal(…)`.
// A class writes through its members, so it collects over the whole body; a
// function collects its own; a variable does not (its initializer's function is
// a candidate of its own — counting it twice would report the same write twice).
// The CALL a write lands in: `f().x = …` → `f()`, `f().a.b = …` → `f()`; null
// when the left side is not rooted in a call at all.
const callRootOf = (expr) => {
	let e = bare(expr);
	while (e && (e.getKind() === SK.PropertyAccessExpression || e.getKind() === SK.ElementAccessExpression)) e = bare(e.getExpression());
	return e && e.getKind() === SK.CallExpression ? e : null;
};

const collectMutations = (node, importMap) => {
	const out = [];
	for (const d of node.getDescendants()) {
		if (isFunctionNode(node) && !inThisPiece(node, d)) continue;
		const kind = d.getKind();
		if (kind === SK.BinaryExpression && d.getOperatorToken().getText() === "=") {
			const lhs = d.getLeft();
			const module = importModuleOf(lhs, importMap);
			if (module) out.push({ line: d.getStartLineNumber(), target: lhs.getText(), via: "assign", value: rootNameOf(lhs), module });
			else if (isThisChain(lhs)) out.push({ line: d.getStartLineNumber(), target: lhs.getText(), via: "assign", value: rootNameOf(lhs), onThis: true });
			// `f().x = …` — writing INTO the value a function returned. The callee is
			// what is mutated (that is the object the write lands in), so the edge
			// points at the module that returns it. Without this, every store write
			// spelled `getRootStore().settings = …` was invisible: the left side has
			// no identifier root, only a call.
			else {
				const call = callRootOf(lhs);
				const calleeModule = call ? importModuleOf(call.getExpression?.(), importMap) : null;
				if (calleeModule) out.push({ line: d.getStartLineNumber(), target: lhs.getText(), via: "assign", value: rootNameOf(lhs), module: calleeModule });
			}
			continue;
		}
		if (kind === SK.DeleteExpression) {
			const module = importModuleOf(d.getExpression(), importMap);
			if (module) out.push({ line: d.getStartLineNumber(), target: d.getExpression().getText(), via: "delete", value: rootNameOf(d.getExpression()), module });
			else if (isThisChain(d.getExpression())) out.push({ line: d.getStartLineNumber(), target: d.getExpression().getText(), via: "delete", value: rootNameOf(d.getExpression()), onThis: true });
			continue;
		}
		if (kind === SK.CallExpression) {
			const callee = d.getExpression();
			if (callee.getKind() !== SK.PropertyAccessExpression) continue;
			const fn = callee.getName?.() ?? "";
			if (fn !== "freeze" && fn !== "seal") continue;
			const module = importModuleOf(d.getArguments()[0], importMap);
			if (module) out.push({ line: d.getStartLineNumber(), target: d.getArguments()[0].getText(), via: fn, value: rootNameOf(d.getArguments()[0]), module });
		}
	}

	return out;
};

// ── Writes into a value the function does not own ────────────────────────────
// Two shapes mean the same thing for a state-bag: an assignment into the value
// (`state.x = …`) and a METHOD CALL on it (`state.ranges.replace(…)`,
// `state.update()`) — an MST action almost always mutates through the second.
// The root identifier decides, so the parameter's name is irrelevant.
const taggedWrites = (node, sf, repoRoot, importMap) => {
	const checker = sf.getProject().getTypeChecker();

	// Does a method call WRITE into its receiver? TypeScript has no `mutates`
	// flag, but a mutating method has no value to give back: it returns `this`
	// (`Map.set`, `Set.add`) or nothing at all (`state.setEnabled()`), while a
	// method that answers a question returns the answer (`has`, `get`). The second
	// half of the rule is the call SITE: a result nobody keeps (`bucket.splice(i, 1);`)
	// was never wanted, so the call was made for its effect — `Map.delete` and
	// `Array.splice` return a value and still change the receiver.
	const methodWrites = (call) => {
		if (call.getParent()?.getKind() === SK.ExpressionStatement) return true;
		const sig = checker?.getResolvedSignature?.(call);
		const decl = sig?.declaration ?? sig?.getDeclaration?.();
		const retNode = decl?.getReturnTypeNode?.();
		if (retNode) {
			const kind = retNode.getKindName?.();
			if (kind === "ThisType") return true;
			if (retNode.getText?.() === "void") return true;
		}
		const text = sig?.getReturnType?.()?.getText?.() ?? "";

		return text === "void" || text === "this";
	};
	const declaredInRepo = (idNode) => {
		const decls = checker?.getSymbolAtLocation?.(idNode)?.getDeclarations?.() ?? [];
		if (!decls.length) return true;

		return decls.some((d) => inRepo(d.getSourceFile?.().getFilePath?.(), repoRoot));
	};
	// The file that declares the TYPE of a property (`state.document` → the type
	// its declaration names, not the object literal the checker folded it into).
	// An anonymous type has no symbol of its own, so the property's own type
	// annotation is the only place the answer survives.
	const declaredFileOfProp = (expr) => {
		if (!expr || expr.getKind() !== SK.PropertyAccessExpression) return null;
		for (const d of checker?.getSymbolAtLocation?.(expr.getNameNode?.())?.getDeclarations?.() ?? []) {
			const tn = d.getTypeNode?.();
			const byNode = tn ? declaredFileOfNode(tn, checker, repoRoot) : null;
			if (byNode) return byNode;
		}

		return declaredFileOfType(expr.getType?.(), checker, repoRoot);
	};
	return node
		.getDescendants()
		.filter((d) => inThisPiece(node, d))
		.map((d) => {
			let receiver = null;
			let via = null;
			if (d.getKind() === SK.BinaryExpression && d.getOperatorToken().getText() === "=") {
				const lhs = d.getLeft();
				// Only a property access on the value (`x.y = ...`) is a write into
				// it. A bare `x = ...` reassignment is a different pattern.
				if (!lhs || lhs.getKind() !== SK.PropertyAccessExpression) return null;
				receiver = lhs.getExpression();
				via = "assign";
			} else if (d.getKind() === SK.CallExpression) {
				// `x.method(…)` — a call OF the value. Three things have to hold: the
				// method is called on the value itself and not on something taken out
				// of it (`x.items.has(…)` reads a container), the repo declares that
				// method (a built-in one only reads), and the value is declared in the
				// repo (a global is nobody's state).
				const callee = d.getExpression();
				if (!callee || callee.getKind() !== SK.PropertyAccessExpression) return null;
				if (!methodWrites(d)) return null;
				receiver = callee.getExpression();
				via = "call";
			}
			if (!receiver) return null;
			const rootNode = rootNodeOf(receiver);
			// A receiver rooted in a CALL has no name to follow: the value belongs to
			// whoever returned it, so the callee's module is the answer.
			const callRoot = rootNode ? null : callRootOf(receiver);
			if (!rootNode && !callRoot) return null;
			const root = rootNode ? rootNode.getText() : null;
			if (rootNode && !declaredInRepo(rootNode)) return null;
			const fromCall = callRoot ? importModuleOf(callRoot.getExpression(), importMap) : null;
			if (callRoot && !fromCall && !declaredInRepo(callRoot.getExpression())) return null;
			// WHAT is written — resolved by TYPE, whatever the shape: a parameter, an
			// import, an alias (`const s = state`), or the result of a call
			// (`const root = requireRootStore()`). The name never matters.
			// A local that HOLDS the value (`const ch = getRootStore()?.channel`) is the
			// same write as one made on the call — the value belongs to the module that
			// returned it, not to the name it was given.
			const initCallOf = (idNode) => {
				const decl = checker?.getSymbolAtLocation?.(idNode)?.getDeclarations?.()?.[0];
				const init = decl?.getInitializer?.();
				if (!init) return null;

				return callRootOf(init) ?? (init.getKind() === SK.CallExpression ? init : null);
			};
			const initCall = rootNode ? initCallOf(rootNode) : null;
			// The NAME in the message must be the thing that actually changes: a local
			// alias is not `channel` of the store, the store member is. So the target
			// keeps the alias's INITIALIZER, not the alias's name.
			const aliasText = rootNode
				? (checker?.getSymbolAtLocation?.(rootNode)?.getDeclarations?.()?.[0]?.getInitializer?.()?.getText?.() ?? null)
				: null;
			const fromInit = initCall ? importModuleOf(initCall.getExpression(), importMap) : null;
			const param = root ? node.getParameters().find((prm) => prm.getName() === root) : null;
			const rootDecl = param ? declaredFileOf(param, checker, repoRoot) : declaredFileOfExpr(rootNode, checker, repoRoot);
			// The nearest declared type wins: writing into `state.cache` is a write
			// into a container the store holds, writing into `state.host` is a call
			// into a port the store was given — they land in different files, and
			// only the one inside the repo names what was touched.
			const nearDecl = receiver.getText() === root ? null : (declaredFileOfProp(receiver) ?? declaredFileOfExpr(receiver, checker, repoRoot));
			const decl = nearDecl?.file && inRepo(nearDecl.file, repoRoot) ? nearDecl : rootDecl;
			// A type declared OUTSIDE the repo (`Map`, a library object, anything from
			// node_modules) is nobody's state: it is a value the code built for itself.
			// Without this, every `map.set(…)` was a write into "somebody else's" Map.
			const type = decl?.file && inRepo(decl.file, repoRoot) ? decl.file : null;

			// WHAT is written: for an assignment the whole target, for a method call
			// the value the method changes (the method's own name goes in `method`).
			const method = via === "call" ? d.getExpression().getName() : null;
			const written = via === "assign" ? d.getLeft().getText() : receiver.getText();
			// `store.loggerChannel` where `store = getRootStore()` → `getRootStore().loggerChannel`
			// Only a CALL gives the value an owner. `const state = {n: 0}` is this
			// file's own object, and rewriting its target to `{n: 0}.n` says nothing.
			const target = aliasText && root && initCall ? written.replace(new RegExp(`^${root}\\b`), aliasText) : written;

			return { line: startLine(d), target, method, value: root, via, type, module: fromCall ?? fromInit ?? undefined, param: Boolean(param) };
		})
		.filter(Boolean);
};

// Which RELATION a write forms. One rule, read by the edge producers and
// available to a filter — so "does this code write into anything that is not
// its own?" is asked the same way everywhere.
//   mutate — the value belongs to another module, or to the code that owns this
//            file (`this.x`): somebody else's state changes.
//   assign — the value was HANDED IN (a parameter) or its type is declared by
//            ANOTHER file: the piece writes into state it does not own.
//   null   — this file's own state (a type declared right here, a value with no
//            declared type at all): private, and no role has a say in it.
// Is a resolved file the one this code lives in? The checker answers with a path
// relative to the repo root when it knows it, and with the absolute one it read
// otherwise, so both spellings name the same file.
const isSameFile = (file, rel) => file != null && rel != null && (file === rel || file.endsWith(`/${rel}`));

const relationOf = (entry, rel) => {
	// A value the piece made itself stays its own: a factory in THIS file is not
	// somebody else's state, whatever module it lives in.
	if (entry.module && !isSameFile(entry.module, rel)) return "mutate";
	if (entry.onThis) return "mutate";
	if (entry.param || (entry.type && !isSameFile(entry.type, rel))) return "assign";
	return null;
};

// ── The one fact ────────────────────────────────────────────────────────────
// Three passes see a write from three angles — the raw `=` in the syntax, the
// binding it lands in, and the TYPE of the value it lands in. They describe the
// same line, so they are merged into one entry per (line, root): the syntax
// gives `target`/`local`, the binding gives `module`/`onThis`, the checker gives
// `type`/`param`.
const assignmentsFact = (node, sf, importMap, repoRoot, rel) => {
	const byKey = new Map();
	const add = (entry) => {
		// `line:target:method` — two mutating calls of the same value on one line
		// (`sort(); splice();`) are two writes, and the three passes still merge on
		// the same write because they agree on all three.
		// Keyed by the ROOT the write lands in, not by the spelling of the target:
		// the passes agree on `value` (`store`, `getRootStore()`) while one of them
		// rewrites the target into the alias's initializer — keying by target split
		// one write into two.
		const key = `${entry.line}:${entry.value ?? entry.target}:${entry.method ?? ""}`;
		const prev = byKey.get(key) ?? {};
		const merged = { ...prev };
		for (const [k, v] of Object.entries(entry)) if (v !== undefined && v !== null) merged[k] = v;
		byKey.set(key, merged);
	};

	for (const entry of isFunctionNode(node) ? plainAssignments(node, importMap) : []) add(entry);
	// A class writes through its members: the class collects, a variable does not
	// (its initializer's function is a candidate of its own — counting it here
	// would report the same write twice).
	for (const entry of isFunctionNode(node) || isClassNode(node) ? collectMutations(node, importMap) : []) add(entry);
	for (const entry of isFunctionNode(node) ? taggedWrites(node, sf, repoRoot, importMap) : []) add(entry);

	return [...byKey.values()]
		.map((entry) => ({ ...entry, relation: relationOf(entry, rel ?? null) }))
		.sort((a, b) => a.line - b.line);
};

module.exports = { assignmentsFact, relationOf };

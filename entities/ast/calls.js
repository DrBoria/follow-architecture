"use strict";

// Call expressions — `f()`, `new F()`, ``tag`…` ``. One entity for all three
// shapes: what is called, what it acts on, which module it comes from, and
// whether it hands the caller's own parameters straight through.

const { SK, kindName, isCallNode, nodeText } = require("./tree");
const { isPurePropertyPath, leftmostOrigin, lastMemberName, importModuleOf } = require("./properties");
const { declaredFileOfExpr, inRepo } = require("./file");

// WHAT IS HANDED OVER. A call is the one place a value LEAVES the piece that
// owns it. `type` is the file declaring the argument's type; a literal has no
// such file, so it is not listed. An object literal is listed through its
// SPREADS — `f({ ...state })` hands the state over just as `f(state)` does.
const ARGUMENTLESS = new Set([
	"StringLiteral",
	"NumericLiteral",
	"BigIntLiteral",
	"RegularExpressionLiteral",
	"NoSubstitutionTemplateLiteral",
	"TemplateExpression",
	"TrueKeyword",
	"FalseKeyword",
	"NullKeyword",
	"UndefinedKeyword",
	"ArrayLiteralExpression",
	"ArrowFunction",
	"FunctionExpression",
	"ClassExpression",
]);
const argumentsOf = (call, checker, repoRoot) =>
	(call.getArguments?.() ?? [])
		.flatMap((arg, index) => {
			const kind = kindName(arg);
			const fileOf = (n) => {
				const file = declaredFileOfExpr(n, checker, repoRoot)?.file ?? null;

				return file && inRepo(file, repoRoot) ? file : null;
			};
			// `{ ...state }` / `[..., ...state]` — one entry per spread source.
			if (kind === "ObjectLiteralExpression" || kind === "ArrayLiteralExpression") {
				const spreads = arg.getDescendants().filter((d) => ["SpreadAssignment", "SpreadElement"].includes(kindName(d)));
				return spreads.map((s) => ({ node: s.getExpression?.() ?? s, text: `{ ...${(s.getExpression?.() ?? s).getText()} }` }));
			}
			if (kind === "SpreadElement") return [{ node: arg.getExpression(), text: `...${arg.getExpression().getText()}` }];
			if (ARGUMENTLESS.has(kind)) return [];
			return [{ node: arg, text: arg.getText() }];
		})
		.map((entry, position) => {
			const file = entry.node ? (declaredFileOfExpr(entry.node, checker, repoRoot)?.file ?? null) : null;
			if (!file || !inRepo(file, repoRoot)) return null;

			return { index: position, text: entry.text, kind: kindName(entry.node), root: leftmostOrigin(entry.node), type: file };
		})
		.filter(Boolean);


// Every call the candidate makes:
//   kind       — the parser's kind of the call node
//   origin     — the origin of the called chain (`store.doX()` → "store",
//                `new F()` → "new F", `t.model(...)` → "t.model"); null when
//                the chain has no identifier root
//   action     — the member actually invoked (`doX` in `store.doX()`), or the
//                full expression text for a bare-identifier call
//   module     — the module the callee resolves to: for a bare identifier the
//                import it came from, for a member access the module of the
//                origin object
//   target     — `{ path, name }` when the call names an imported SYMBOL
const callsFact = (node, importMap, sf, repoRoot) =>
	node
		.getDescendants()
		.filter(isCallNode)
		.map((c) => {
			const expr = c.getKind() === SK.TaggedTemplateExpression ? c.getTag() : c.getExpression();
			// The module the callee was imported from — one implementation, in
			// `properties.js`, where "what is this chain rooted in" already lives.
			const module = expr ? importModuleOf(expr, importMap) : null;
			// origin = the base of the chain, action = the member actually invoked:
			// `store.doX()` → origin "store", action "doX";
			// `getRoot(self).store.doAction()` → origin "getRoot", action "doAction";
			// `new F()` → origin "new F", action "F".
			let origin, action;
			if (isPurePropertyPath(expr)) {
				const chain = nodeText(expr).split(".");
				origin = chain[0];
				action = chain[chain.length - 1];
			} else {
				origin = leftmostOrigin(expr);
				action = lastMemberName(expr) ?? nodeText(expr);
			}
			// `target` addresses the callee the same way `location` addresses
			// anything else in the architecture: `{ path }` is the module the symbol
			// was imported from, so a filter can say
			// `calls: { some: { target: { location: { node: "…" } } } }`.
			// Only a bare-identifier call names an imported SYMBOL; a member call
			// (`store.doX()`) names a property of an object, so its module says
			// nothing about where the member is declared.
			const target = module && origin === action ? { path: module, name: action } : null;

			return { kind: kindName(c), origin, action, module, target, receiverOnly: isReceiverOnly(c), bare: origin === action, arguments: argumentsOf(c, sf?.getProject?.().getTypeChecker?.(), repoRoot) };
		});

// Is the call's RESULT used only as the object of a member access — `f().x`,
// `f()[i]`? Then the call is the RECEIVER of a read, not a use of its own:
// `requireRootStore().settings` reads `settings`, it does not call anything of
// the store's. Without this flag one line produced two edges to the same file.
const isReceiverOnly = (call) => {
	const parent = call.getParent();
	if (!parent) return false;
	const kind = parent.getKind();
	if (kind !== SK.PropertyAccessExpression && kind !== SK.ElementAccessExpression) return false;
	return parent.getExpression() === call;
};

module.exports = { callsFact };

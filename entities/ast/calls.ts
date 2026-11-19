"use strict";

// Call expressions — `f()`, `new F()`, ``tag`…` ``. One entity for all three
// shapes: what is called, what it acts on, which module it comes from, and
// whether it hands the caller's own parameters straight through.

import { Node, type SourceFile, type TypeChecker, type CallExpression, type NewExpression, type TaggedTemplateExpression } from "ts-morph";
import { SK, kindName, isCallNode, nodeText } from "./tree";
import { isPurePropertyPath, leftmostOrigin, lastMemberName, importModuleOf } from "./properties";
import { declaredFileOfExpr, inRepo } from "./resolve";
import type { LooseNode } from "./loose";
import type { ArgumentFact, CallFact } from "../facts";

type CallNode = CallExpression | NewExpression | TaggedTemplateExpression;
type ImportMap = ReadonlyMap<string, string>;

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

// One handed-over entry: the expression and the text a report names it by.
type Handover = { node: Node; text: string };

const spreadHandover = (s: Node): Handover => {
	const expr = Node.isSpreadAssignment(s) || Node.isSpreadElement(s) ? s.getExpression() : s;

	return { node: expr, text: `{ ...${expr.getText()} }` };
};

// `{ ...state }` / `[..., ...state]` — one entry per spread source; a bare
// `...state` element is its own; a literal hands nothing over.
const handoversOf = (arg: Node): Handover[] => {
	const kind = kindName(arg);
	if (kind === "ObjectLiteralExpression" || kind === "ArrayLiteralExpression") {
		const spreads = arg.getDescendants().filter((d) => ["SpreadAssignment", "SpreadElement"].includes(kindName(d)));

		return spreads.map(spreadHandover);
	}
	if (kind === "SpreadElement" && Node.isSpreadElement(arg)) return [{ node: arg.getExpression(), text: `...${arg.getExpression().getText()}` }];
	if (ARGUMENTLESS.has(kind)) return [];

	return [{ node: arg, text: arg.getText() }];
};

// One argument fact, when the checker can name the repo file declaring its
// type; a literal (no such file) is not listed.
const argumentFact = (entry: Handover, position: number, checker: TypeChecker, repoRoot: string): ArgumentFact | null => {
	const file = declaredFileOfExpr(entry.node, checker, repoRoot)?.file ?? null;
	if (!file || !inRepo(file, repoRoot)) return null;

	return { index: position, text: entry.text, kind: kindName(entry.node), root: leftmostOrigin(entry.node), type: file };
};

// The arguments a call hands over; a tagged template's are its template's.
const callArguments = (call: CallNode): Node[] => {
	if (Node.isCallExpression(call) || Node.isNewExpression(call)) return call.getArguments();

	return [];
};

const argumentsOf = (call: CallNode, checker: TypeChecker, repoRoot: string): ArgumentFact[] =>
	callArguments(call)
		.flatMap(handoversOf)
		.map((entry, position) => argumentFact(entry, position, checker, repoRoot))
		.filter((a): a is ArgumentFact => a != null);


// origin = the base of the chain, action = the member actually invoked:
// `store.doX()` → origin "store", action "doX";
// `getRoot(self).store.doAction()` → origin "getRoot", action "doAction";
// `new F()` → origin "new F", action "F".
const originActionOf = (expr: Node | null): { origin: string | null; action: string | null } => {
	if (expr && isPurePropertyPath(expr)) {
		const chain = nodeText(expr).split(".");

		return { origin: chain[0], action: chain[chain.length - 1] };
	}

	return { origin: leftmostOrigin(expr), action: lastMemberName(expr) ?? (nodeText(expr) || null) };
};

// The expression actually invoked: a tagged template calls its TAG.
const calleeOf = (c: CallNode): Node | null => {
	if (Node.isTaggedTemplateExpression(c)) return c.getTag();

	return c.getExpression();
};

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
const callFactOf = (c: CallNode, importMap: ImportMap, checker: TypeChecker, repoRoot: string): CallFact => {
	const expr = calleeOf(c);
	// The module the callee was imported from — one implementation, in
	// `properties.js`, where "what is this chain rooted in" already lives.
	const module = expr ? importModuleOf(expr, importMap) : null;
	const { origin, action } = originActionOf(expr);
	// `target` addresses the callee the same way `location` addresses
	// anything else in the architecture: `{ path }` is the module the symbol
	// was imported from, so a filter can say
	// `calls: { some: { target: { location: { node: "…" } } } }`.
	// Only a bare-identifier call names an imported SYMBOL; a member call
	// (`store.doX()`) names a property of an object, so its module says
	// nothing about where the member is declared.
	const target = module && origin === action ? { path: module, name: action } : null;

	return { kind: kindName(c), origin, action, module, target, receiverOnly: isReceiverOnly(c), bare: origin === action, arguments: argumentsOf(c, checker, repoRoot) };
};

const callsFact = (node: LooseNode, importMap: ImportMap, sf: SourceFile | null, repoRoot: string): CallFact[] => {
	const checker = sf?.getProject?.().getTypeChecker?.();
	if (!checker) return [];

	return node
		.getDescendants()
		.filter(isCallNode)
		.filter((c): c is CallNode => Node.isCallExpression(c) || Node.isNewExpression(c) || Node.isTaggedTemplateExpression(c))
		.map((c) => callFactOf(c, importMap, checker, repoRoot));
};

// Is the call's RESULT used only as the object of a member access — `f().x`,
// `f()[i]`? Then the call is the RECEIVER of a read, not a use of its own:
// `requireRootStore().settings` reads `settings`, it does not call anything of
// the store's. Without this flag one line produced two edges to the same file.
const isReceiverOnly = (call: Node): boolean => {
	const parent = call.getParent();
	if (!parent) return false;
	const kind = parent.getKind();
	if (kind !== SK.PropertyAccessExpression && kind !== SK.ElementAccessExpression) return false;

	return (Node.isPropertyAccessExpression(parent) || Node.isElementAccessExpression(parent)) && parent.getExpression() === call;
};

export { callsFact };

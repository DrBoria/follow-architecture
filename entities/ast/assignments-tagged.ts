"use strict";

// The TYPE pass over a write. Two shapes mean the same thing for a state-bag: an
// assignment into the value (`state.x = …`) and a METHOD CALL on it
// (`state.ranges.replace(…)`). The root identifier decides, so the parameter's
// name is irrelevant; the checker says whose value it is and where its type is
// declared.

import { Node, type SourceFile, type TypeChecker, type CallExpression, type Signature } from "ts-morph";
import { startLine, inThisPiece } from "./tree";
import { importModuleOf } from "./properties";
import { declaredFileOfNode, declaredFileOf, declaredFileOfType, declaredFileOfExpr, inRepo, type DeclInfo } from "./file";
import { notice } from "../../report/notices";
import { VIA } from "../kinds";
import { rootNodeOf, callRootOf, type ImportMap } from "./assignments-nodes";
import type { LooseNode } from "./loose";
import type { AssignmentFact } from "../facts";

// Everything the tagged-write pass needs beyond the node itself.
type TaggedCtx = { node: Node; checker: TypeChecker; importMap: ImportMap; repoRoot: string };

// The root a write goes through, once it is known to be the repo's own value.
type RootContext = { rootNode: Node | null; root: string | null; fromCall: string | null };

// The resolved signature of a call, or null — a call whose import the checker
// cannot resolve is noticed and treated as not-a-write (never a crash).
const signatureOf = (call: CallExpression, checker: TypeChecker): Signature | null => {
	try {
		return checker.getResolvedSignature(call) ?? null;
	} catch (error) {
		const err: { message?: string } = error;
		notice(`whether \`${call.getText()}\` writes could not be read`, err.message ? err.message : String(err));

		return null;
	}
};

// Does a signature hand back no value? A mutating method returns `this`
// (`Map.set`, `Set.add`) or nothing (`state.setEnabled()`); a method that
// answers a question returns the answer (`has`, `get`).
const writesReturn = (sig: Signature): boolean => {
	const decl: LooseNode | undefined = sig.getDeclaration();
	const retNode = decl?.getReturnTypeNode?.();
	if (retNode) {
		const kind = retNode.getKindName();
		if (kind === "ThisType" || retNode.getText() === "void") return true;
	}
	const text = sig.getReturnType().getText();

	return text === "void" || text === "this";
};

// Does a method call WRITE into its receiver? A result nobody keeps
// (`bucket.splice(i, 1);`) was wanted for its effect; else the signature decides.
const methodWrites = (call: CallExpression, checker: TypeChecker): boolean => {
	const parent = call.getParent();
	if (parent && Node.isExpressionStatement(parent)) return true;
	const sig = signatureOf(call, checker);

	return sig ? writesReturn(sig) : false;
};

const declaredInRepo = (idNode: Node, checker: TypeChecker, repoRoot: string): boolean => {
	const decls = checker.getSymbolAtLocation(idNode)?.getDeclarations() ?? [];
	if (!decls.length) return true;

	return decls.some((d) => inRepo(d.getSourceFile().getFilePath(), repoRoot));
};

// The file that declares the TYPE of a property (`state.document` → the type
// its declaration names, not the object literal the checker folded it into).
// An anonymous type has no symbol of its own, so the property's own type
// annotation is the only place the answer survives.
const declaredFileOfProp = (expr: Node | null, checker: TypeChecker, repoRoot: string): DeclInfo | null => {
	if (!expr || !Node.isPropertyAccessExpression(expr)) return null;
	for (const d of checker.getSymbolAtLocation(expr.getNameNode())?.getDeclarations() ?? []) {
		const decl: LooseNode = d;
		const tn = decl.getTypeNode?.();
		const byNode = tn ? declaredFileOfNode(tn, checker, repoRoot) : null;
		if (byNode) return byNode;
	}

	return declaredFileOfType(expr.getType(), checker, repoRoot);
};

// The call a local holds the value through: `const ch = getRootStore()?.channel`
// — the initializer's call is the value's owner.
const initCallOf = (idNode: Node, checker: TypeChecker): CallExpression | null => {
	const decl: LooseNode | undefined = checker.getSymbolAtLocation(idNode)?.getDeclarations()?.[0];
	const init = decl?.getInitializer?.();
	if (!init) return null;

	return callRootOf(init) ?? (Node.isCallExpression(init) ? init : null);
};

// The initializer text a local root is an alias of (`const s = state` → `state`);
// null when the root is not a local with an initializer.
const aliasTextOf = (rootNode: Node, checker: TypeChecker): string | null => {
	const decl: LooseNode | undefined = checker.getSymbolAtLocation(rootNode)?.getDeclarations()?.[0];

	return decl?.getInitializer?.()?.getText() ?? null;
};

// The parameter of the piece named `root`, when the root is one of its parameters.
const findParam = (node: Node, root: string | null): LooseNode | null => {
	if (!root) return null;
	const params = Node.isFunctionLikeDeclaration(node) ? node.getParameters() : [];

	return params.find((prm) => prm.getName() === root) ?? null;
};

// Which write shape a node is, or null. An assignment needs a property access on
// the value (`x.y = …` is a write into `x`); a call needs a mutating method on it.
const resolveReceiver = (d: Node, checker: TypeChecker): { receiver: Node; via: string } | null => {
	if (Node.isBinaryExpression(d) && d.getOperatorToken().getText() === "=") {
		const lhs = d.getLeft();

		return Node.isPropertyAccessExpression(lhs) ? { receiver: lhs.getExpression(), via: VIA.ASSIGN } : null;
	}
	if (Node.isCallExpression(d)) {
		const callee = d.getExpression();
		if (!Node.isPropertyAccessExpression(callee) || !methodWrites(d, checker)) return null;

		return { receiver: callee.getExpression(), via: VIA.CALL };
	}

	return null;
};

// Is the written root something the repo owns? A named root is one only if the
// checker declares it in the repo; a root reached through a call is one when the
// callee is imported or itself declared in the repo.
const validRoot = (rootNode: Node | null, callRoot: CallExpression | null, ctx: TaggedCtx): boolean => {
	if (rootNode) return declaredInRepo(rootNode, ctx.checker, ctx.repoRoot);
	if (callRoot) return Boolean(importModuleOf(callRoot.getExpression(), ctx.importMap)) || declaredInRepo(callRoot.getExpression(), ctx.checker, ctx.repoRoot);

	return false;
};

// The root a write goes through, with the module a call-rooted value comes from.
const rootContext = (receiver: Node, ctx: TaggedCtx): RootContext | null => {
	const rootNode = rootNodeOf(receiver);
	const callRoot = rootNode ? null : callRootOf(receiver);
	if (!validRoot(rootNode, callRoot, ctx)) return null;
	const root = rootNode ? rootNode.getText() : null;
	const fromCall = callRoot ? importModuleOf(callRoot.getExpression(), ctx.importMap) : null;

	return { rootNode, root, fromCall };
};

// The repo file that declares the written value's TYPE, reading the nearest
// declared type first (`state.cache` vs `state.host` land in different files).
const writeDeclFile = (info: { rootNode: Node | null; receiver: Node; root: string | null; param: LooseNode | null }, ctx: TaggedCtx): string | null => {
	const rootDecl = info.param ? declaredFileOf(info.param, ctx.checker, ctx.repoRoot) : declaredFileOfExpr(info.rootNode, ctx.checker, ctx.repoRoot);
	const nearDecl = info.receiver.getText() === info.root ? null : (declaredFileOfProp(info.receiver, ctx.checker, ctx.repoRoot) ?? declaredFileOfExpr(info.receiver, ctx.checker, ctx.repoRoot));
	const decl = nearDecl?.file && inRepo(nearDecl.file, ctx.repoRoot) ? nearDecl : rootDecl;

	return decl?.file && inRepo(decl.file, ctx.repoRoot) ? decl.file : null;
};

// The method's own name for a call write (`state.set(…)` → `set`), or null.
const methodNameOf = (d: Node, via: string): string | null => {
	if (via !== VIA.CALL || !Node.isCallExpression(d)) return null;
	const callee = d.getExpression();

	return Node.isPropertyAccessExpression(callee) ? callee.getName() : null;
};

// The written name and method for a tagged write: `store.x` where the root is an
// alias of a call is rewritten to the call (`getRootStore().x`).
const taggedTarget = (d: Node, info: { receiver: Node; via: string; root: string | null; aliasText: string | null; initCall: CallExpression | null }): AssignmentFact => {
	const written = info.via === VIA.ASSIGN && Node.isBinaryExpression(d) ? d.getLeft().getText() : info.receiver.getText();
	const target = info.aliasText && info.root && info.initCall ? written.replace(new RegExp(`^${info.root}\\b`), info.aliasText) : written;

	return { line: startLine(d), target, method: methodNameOf(d, info.via), via: info.via };
};

// One write into a value the piece does not own — the root resolved, its type
// found, its target spelled — or null when the node is no such write.
const taggedWriteOf = (d: Node, ctx: TaggedCtx): AssignmentFact | null => {
	const rec = resolveReceiver(d, ctx.checker);
	if (!rec) return null;
	const rooted = rootContext(rec.receiver, ctx);
	if (!rooted) return null;
	const { rootNode, root, fromCall } = rooted;
	const initCall = rootNode ? initCallOf(rootNode, ctx.checker) : null;
	const aliasText = rootNode ? aliasTextOf(rootNode, ctx.checker) : null;
	const fromInit = initCall ? importModuleOf(initCall.getExpression(), ctx.importMap) : null;
	const param = findParam(ctx.node, root);
	const type = writeDeclFile({ rootNode, receiver: rec.receiver, root, param }, ctx);
	const performed = rec.via === VIA.ASSIGN || Boolean(param);

	return { ...taggedTarget(d, { receiver: rec.receiver, via: rec.via, root, aliasText, initCall }), value: root, performed, type, module: fromCall ?? fromInit ?? undefined, param: Boolean(param) };
};

// Writes into a value the function does not own — assignment into the value or
// a mutating method call on it — across the whole piece.
const taggedWrites = (node: Node, sf: SourceFile, importMap: ImportMap, repoRoot: string): AssignmentFact[] => {
	const ctx: TaggedCtx = { node, checker: sf.getProject().getTypeChecker(), importMap, repoRoot };

	return node
		.getDescendants()
		.filter((d) => inThisPiece(node, d))
		.map((d) => taggedWriteOf(d, ctx))
		.filter((e): e is AssignmentFact => e !== null);
};

export { taggedWrites };

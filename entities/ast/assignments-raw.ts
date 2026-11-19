"use strict";

// The SYNTAX pass over a write: a plain `=` into an imported binding or `this`
// (`state.x = …`), a `delete imported.x`, an `Object.freeze(imported)` /
// `Object.seal(…)`, and `f().x = …` pointed at the module that returns the
// object. Where a write lands in ANOTHER module's value — that is what these
// producers collect, from the raw AST alone.

import { Node, type BinaryExpression } from "ts-morph";
import { isFunctionNode, inThisPiece } from "./tree";
import { importModuleOf, isThisChain } from "./properties";
import { VIA } from "../kinds";
import { rootNameOf, callRootOf, isLocalTarget, type ImportMap } from "./assignments-nodes";
import type { AssignmentFact } from "../facts";

// Plain `=` assignments inside a candidate: the target, whether it is local,
// and the module it came from (an imported binding is somebody else's value).
const plainAssignments = (node: Node, importMap: ImportMap): AssignmentFact[] =>
	node
		.getDescendants()
		.filter((d): d is BinaryExpression => Node.isBinaryExpression(d) && d.getOperatorToken().getText() === "=" && inThisPiece(node, d))
		.map((a) => {
			const lhs = a.getLeft();
			const fn = isFunctionNode(node) ? node : null;

			return { line: lhs.getStartLineNumber(), target: lhs.getText(), via: VIA.ASSIGN, performed: true, value: rootNameOf(lhs), local: fn ? isLocalTarget(lhs, fn) : false, module: importModuleOf(lhs, importMap), onThis: isThisChain(lhs) };
		});

// The write a `delete imported.x` makes, if it lands in another module.
const deleteWrite = (d: Node, importMap: ImportMap): AssignmentFact | null => {
	if (!Node.isDeleteExpression(d)) return null;
	const expr = d.getExpression();
	const module = importModuleOf(expr, importMap);
	if (module) return { line: d.getStartLineNumber(), target: expr.getText(), via: VIA.DELETE, performed: true, value: rootNameOf(expr), module };
	if (isThisChain(expr)) return { line: d.getStartLineNumber(), target: expr.getText(), via: VIA.DELETE, performed: true, value: rootNameOf(expr), onThis: true };

	return null;
};

// `Object.freeze(x)` / `Object.seal(x)` on another module's value.
const freezeWrite = (d: Node, importMap: ImportMap): AssignmentFact | null => {
	if (!Node.isCallExpression(d)) return null;
	const callee = d.getExpression();
	if (!Node.isPropertyAccessExpression(callee)) return null;
	const fnName = callee.getName();
	if (fnName !== "freeze" && fnName !== "seal") return null;
	const arg = d.getArguments()[0];
	if (!arg) return null;
	const module = importModuleOf(arg, importMap);

	return module ? { line: d.getStartLineNumber(), target: arg.getText(), via: fnName, performed: true, value: rootNameOf(arg), module } : null;
};

// The assignment a `=` makes when it lands in another module's value, or in
// `this` — `f().x = …` points the write at the module that returns the object.
const assignWrite = (d: Node, importMap: ImportMap): AssignmentFact | null => {
	if (!Node.isBinaryExpression(d) || d.getOperatorToken().getText() !== "=") return null;
	const lhs = d.getLeft();
	const module = importModuleOf(lhs, importMap);
	if (module) return { line: d.getStartLineNumber(), target: lhs.getText(), via: VIA.ASSIGN, performed: true, value: rootNameOf(lhs), module };
	if (isThisChain(lhs)) return { line: d.getStartLineNumber(), target: lhs.getText(), via: VIA.ASSIGN, performed: true, value: rootNameOf(lhs), onThis: true };
	const call = callRootOf(lhs);
	const calleeModule = call ? importModuleOf(call.getExpression(), importMap) : null;
	if (calleeModule) return { line: d.getStartLineNumber(), target: lhs.getText(), via: VIA.ASSIGN, performed: true, value: rootNameOf(lhs), module: calleeModule };

	return null;
};

// Writes into ANOTHER module's value: assignment to an imported binding,
// `delete imported.x`, and `Object.freeze(imported)` / `Object.seal(…)`.
// A class writes through its members, so it collects over the whole body; a
// function collects its own; a variable does not (its initializer's function is
// a candidate of its own — counting it twice would report the same write twice).
const collectMutations = (node: Node, importMap: ImportMap): AssignmentFact[] => {
	const out: AssignmentFact[] = [];
	for (const d of node.getDescendants()) {
		if (isFunctionNode(node) && !inThisPiece(node, d)) continue;
		const write = assignWrite(d, importMap) ?? deleteWrite(d, importMap) ?? freezeWrite(d, importMap);
		if (write) out.push(write);
	}

	return out;
};

export { plainAssignments, collectMutations };

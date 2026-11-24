"use strict";

// FOLDING a value's pieces into the concrete text it reaches.
//
// Expressions are folded first (the CSS-variable reader cannot see a `var()`
// that an expression RETURNS until it is folded). Then every variable in the
// text is substituted from the scope, left to right, and each substitution may
// itself quote expressions and variables — the same walk, recursively, until
// nothing is left. A variable declared in several media queries multiplies the
// branches; a variable with no declaration and no fallback is a reported
// problem, never a skipped name.

import type { Expression } from "ts-morph";
import { expressionAnswer, firstLine } from "./expression";
import type { Scope, ScopeEntry } from "../core/scope-types";
import type { Branch, BranchProblem, Piece } from "../core/pieces";
import { closingParen, topLevelComma } from "../core/text-scan";

// The variable a text refers to next, whichever syntax names it.
// eslint-disable-next-line md-code-entities/entities-uniqueness -- a token with offsets+name+fallback; not a bare range
type VariableToken = { kind: "css" | "scss"; name: string; start: number; end: number; fallback: string | null; broken: BranchProblem | null };

// Where a value is resolved: the scope and the way back to TypeScript.
type ResolveContext = { scope: Scope; expression: (index: number) => Expression | null };

const BRANCH_LIMIT = 64;

const problemKey = (problem: BranchProblem): string => `${problem.kind}|${problem.name ?? ""}|${problem.text ?? ""}`;

const uniqueProblems = (problems: BranchProblem[]): BranchProblem[] => [...new Map(problems.map((problem) => [problemKey(problem), problem])).values()];

const CSS_VARIABLE_RE = /\bvar\(\s*(--[\w-]+)/;
const SCSS_VARIABLE_RE = /#\{\s*\$([\w-]+)\s*\}|\$([\w-]+)/;

const cssToken = (text: string, match: RegExpExecArray): VariableToken => {
	const open = text.indexOf("(", match.index);
	const close = closingParen(text, open);
	if (close < 0) return { kind: "css", name: match[1], start: match.index, end: text.length, fallback: null, broken: { kind: "unterminated-var" } };
	const inner = text.slice(open + 1, close);
	const comma = topLevelComma(inner);

	return { kind: "css", name: match[1], start: match.index, end: close + 1, fallback: comma < 0 ? null : inner.slice(comma + 1).trim(), broken: null };
};

const scssToken = (match: RegExpExecArray): VariableToken => ({ kind: "scss", name: `$${match[1] ?? match[2]}`, start: match.index, end: match.index + match[0].length, fallback: null, broken: null });

// The variable a text refers to next, whichever syntax names it: the two
// spellings are matched, and the EARLIEST one is the next to substitute.
const nextVariable = (text: string): VariableToken | null => {
	const css = CSS_VARIABLE_RE.exec(text);
	const scss = SCSS_VARIABLE_RE.exec(text);
	if (!css) return scss ? scssToken(scss) : null;
	if (!scss) return cssToken(text, css);

	return css.index <= scss.index ? cssToken(text, css) : scssToken(scss);
};

const entriesOf = (token: VariableToken, scope: Scope): ScopeEntry[] | undefined => (token.kind === "css" ? scope.customProperties.get(token.name) : scope.scssVariables.get(token.name));

const failed = (branch: Branch, problems: BranchProblem[]): Branch[] => [{ ...branch, problems: uniqueProblems([...branch.problems, ...problems]) }];

// A variable declared in several places (media variants) becomes one branch per
// declaration; each branch keeps the media query it read.
const expandEntries = (input: { branch: Branch; token: VariableToken; entries: ScopeEntry[] }, context: ResolveContext, stack: readonly string[]): Branch[] => {
	const { branch, token, entries } = input;
	const before = branch.text.slice(0, token.start);
	const after = branch.text.slice(token.end);
	const out: Branch[] = [];
	for (const entry of entries) {
		const resolved = resolvePieces(entry.pieces, { scope: context.scope, expression: entry.expression }, [...stack, token.name]);
		for (const inner of resolved) {
			if (inner.problems.length) {
				out.push({ ...branch, problems: uniqueProblems([...branch.problems, ...inner.problems]) });
				continue;
			}
			const text = before + inner.text + after;
			out.push(...substituteText({ text, provider: branch.provider ?? inner.provider, media: branch.media ?? entry.media ?? inner.media, problems: branch.problems }, context, stack));
		}
	}

	return out.slice(0, BRANCH_LIMIT);
};

const substituteText = (branch: Branch, context: ResolveContext, stack: readonly string[]): Branch[] => {
	if (branch.problems.length) return [branch];
	const token = nextVariable(branch.text);
	if (!token) return [branch];
	if (token.broken) return failed(branch, [token.broken]);
	if (stack.includes(token.name)) return failed(branch, [{ kind: "cyclic-var", name: token.name }]);
	const entries = entriesOf(token, context.scope);
	if (entries?.length) return expandEntries({ branch, token, entries }, context, stack);
	if (token.fallback === null) return failed(branch, [{ kind: "undeclared-var", name: token.name }]);

	return substituteText({ ...branch, text: branch.text.slice(0, token.start) + token.fallback + branch.text.slice(token.end) }, context, stack);
};

// Fold two branch lists, keeping the provider label they carry, the providers a
// fixed path was absent in, and whether the value is runtime-dynamic.
const crossValues = (branches: Branch[], values: { text: string; origin: string | null; dynamic?: boolean }[], absent: ({ provider: string; text: string })[] = []): Branch[] => {
	const out: Branch[] = [];
	for (const branch of branches) {
		for (const value of values) {
			if (out.length >= BRANCH_LIMIT) return out.map((item) => ({ ...item, problems: uniqueProblems([...item.problems, { kind: "too-many-variants" }]) }));
			const merged = [...(branch.absent ?? []), ...absent];
			const dynamic = branch.dynamic || value.dynamic ? true : undefined;
			out.push({ text: branch.text + value.text, provider: branch.provider ?? value.origin, media: branch.media, problems: branch.problems, directive: branch.directive, dynamic, ...(merged.length ? { absent: merged } : {}) });
		}
	}

	return out;
};

// Fold a declaration's pieces: expressions first, then the variables in the
// text they produced. The order matters — `var(--x)` can be the VALUE a theme
// expression returns, so it is only visible after the expression is folded.
const resolvePieces = (pieces: Piece[], context: ResolveContext, stack: readonly string[] = []): Branch[] => {
	let branches: Branch[] = [{ text: "", provider: null, media: null, problems: [] }];
	for (const piece of pieces) {
		if (piece.kind === "text") {
			branches = branches.map((branch) => ({ ...branch, text: branch.text + piece.text }));
			continue;
		}
		const node = context.expression(piece.index);
		const answer = node ? expressionAnswer(node, context.scope) : { values: [], problems: [{ kind: "missing-node", text: firstLine(piece.text) }], directive: false };
		if (answer.directive) {
			// A nested block, not a value: it contributes no text to THIS value.
			branches = branches.map((branch) => ({ ...branch, directive: true }));
			continue;
		}
		// A branch that resolves nothing is a REPORTED problem, but it does not
		// erase the branches that DID resolve: a nested ternary may reach two arms
		// and leave a runtime call unresolved, so both are kept side by side.
		const failedBranches = answer.problems.length ? branches.map((branch) => ({ ...branch, problems: uniqueProblems([...branch.problems, ...answer.problems]) })) : [];
		if (!answer.values.length) {
			branches = failedBranches;
			continue;
		}
		const absent: ({ provider: string; text: string })[] = (answer.absent ?? []).map((provider) => ({ provider, text: piece.text }));
		branches = [...crossValues(branches, answer.values, absent), ...failedBranches];
	}

	return branches.flatMap((branch) => substituteText(branch, context, stack));
};

export { resolvePieces };
export type { ResolveContext };

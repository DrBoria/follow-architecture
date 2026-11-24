"use strict";

// The small constructors and the union that every expression fold builds. Split
// out of `expression.ts` so the fold itself stays under the file-length budget;
// they depend on no folding logic, only on the reading/problem shapes.

import type { ProviderReading, ProviderAnswer } from "./theme-value";
import type { BranchProblem } from "../core/pieces";

// A loop/map variable bound to one concrete element while an expression is
// folded — the `col` in `.map((col) => `${col}`)`.
type Bindings = ReadonlyMap<string, string>;
const NO_BINDINGS: Bindings = new Map();

// The values an expression reaches, and the problems it hit on the branches that
// reach nothing. Both are reported: a nested ternary may resolve two arms and
// leave one runtime call unresolved. `origin` is set only when the providers
// DISAGREE — one value is not provider-specific. `directive` marks an expression
// that is a nested STYLE BLOCK. `absent` names the providers whose literal does
// not carry the path. `dynamic` marks a value that only the runtime knows.
type ValueAnswer = { values: ProviderReading[]; problems: BranchProblem[]; directive?: boolean; absent?: string[]; dynamic?: boolean };

// The placeholder a dynamic value contributes while a template is folded: `1`
// completes `1fr`, `1%`, `url(1)` — the SHAPE around it is what gets checked.
const DYNAMIC_PLACEHOLDER = "1";

// The first line of an expression/problem text — what a report quotes.
const firstLine = (text: string): string => text.split("\n")[0].trim();

const oneValue = (value: string): ValueAnswer => ({ values: [{ text: value, origin: null }], problems: [] });
const noValue = (problem: BranchProblem): ValueAnswer => ({ values: [], problems: [problem] });
const block = (): ValueAnswer => ({ values: [], problems: [], directive: true });
const dynamicValue = (): ValueAnswer => ({ values: [{ text: DYNAMIC_PLACEHOLDER, origin: null, dynamic: true }], problems: [], dynamic: true });
const absentValue = (answer: ProviderAnswer): ValueAnswer => ({ values: answer.readings, problems: [], absent: answer.absent.length ? answer.absent : undefined });

// Every reading and every problem of the given answers, in order: the branches
// of a conditional or a logical chain are the union of what each arm reaches.
const combine = (...answers: ValueAnswer[]): ValueAnswer => {
	const absent = [...new Set(answers.flatMap((answer) => answer.absent ?? []))];

	return {
		values: answers.flatMap((answer) => answer.values),
		problems: answers.flatMap((answer) => answer.problems),
		absent: absent.length ? absent : undefined,
		directive: answers.some((answer) => answer.directive) ? true : undefined,
		dynamic: answers.some((answer) => answer.dynamic) ? true : undefined,
	};
};

// FOLDING arithmetic and concatenation over readings. `+` concatenates (or adds
// two numbers); the arithmetic operators fold two NUMBERS only (a theme's rhythm
// is `origin * 2`). The operator table is the one place the operators are named;
// anything not in it is a guess, so the caller reports it instead of folding.
const ARITHMETIC = new Map<string, (left: number, right: number) => number>([
	["-", (left, right) => left - right],
	["*", (left, right) => left * right],
	["/", (left, right) => left / right],
]);

// Two numeric spellings add; anything else is a concatenation (`` `${n}` + "px" ``).
const sumOrConcat = (a: string, b: string): string => {
	const numeric = a.trim() !== "" && b.trim() !== "" && Number.isFinite(Number(a)) && Number.isFinite(Number(b));

	return numeric ? String(Number(a) + Number(b)) : a + b;
};

// The numeric result of `a <op> b` over two readings, or null when either side
// is not a number (a string `+` is concatenation, not arithmetic).
const numericReading = (left: ProviderReading, right: ProviderReading, combineNumbers: (a: number, b: number) => number): ProviderReading | null => {
	const a = Number(left.text.trim());
	const b = Number(right.text.trim());
	if (left.text.trim() === "" || right.text.trim() === "" || !Number.isFinite(a) || !Number.isFinite(b)) return null;

	return { text: String(combineNumbers(a, b)), origin: left.origin ?? right.origin, dynamic: left.dynamic || right.dynamic };
};

// The readings `a <op> b` reaches, from the readings each side produced. Null
// when no pair of readings can be combined.
const arithmeticValues = (op: string, left: readonly ProviderReading[], right: readonly ProviderReading[]): ProviderReading[] | null => {
	const combineNumbers = ARITHMETIC.get(op);
	const values = left.flatMap((a) =>
		right.flatMap((b): ProviderReading[] => {
			if (!combineNumbers) return [{ text: sumOrConcat(a.text, b.text), origin: a.origin ?? b.origin, dynamic: a.dynamic || b.dynamic }];
			const numeric = numericReading(a, b, combineNumbers);

			return numeric ? [numeric] : [];
		}),
	);

	return values.length ? values : null;
};

export { NO_BINDINGS, DYNAMIC_PLACEHOLDER, firstLine, oneValue, noValue, block, dynamicValue, absentValue, combine, ARITHMETIC, arithmeticValues };
export type { Bindings, ValueAnswer };

"use strict";

// Turn violations into findings: drop the call/declare duplicate, then one
// finding per decision.

import type { ArchNode } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { Finding, FindingFrom } from "../../entities/findings";
import type { Violation } from "./violation";

// A `declare` violation on a line that also carries a `call` to the same
// target is the same decision seen twice — the call's sentence answers for it.
const withoutDeclareDuplicates = (violations: Violation[]): Violation[] => {
	const called = new Set(violations.filter((v) => v.kind === "call").map((v) => `${v.line}|${v.targetPath}`));

	return violations.filter((v) => v.kind !== "declare" || !called.has(`${v.line}|${v.targetPath}`));
};

// Same role, several functions: one sentence naming all of them.
const roleSentence = (v: Violation): Violation => {
	const names = (v.names ?? []).filter(Boolean);
	const shown = names.slice(0, 4).map((n) => `\`${n}\``).join(", ");
	const rest = names.length > 4 ? ` and ${names.length - 4} more` : "";
	const tail = v.where ? `they belong in ${v.where}` : `${v.owning ?? "this folder"} declares no home for a \`${v.role}\``;
	const move = v.where ? `Move ${shown}${rest} to ${v.where}.` : null;

	return { ...v, fix: move, text: `This file declares \`${v.role}\` functions (${shown}${rest}): ${tail}.` };
};

// One decision per key: a role's many functions merge into one sentence; any
// other violation is its own decision, keyed by its text.
const decisionsOf = (violations: Violation[]): Violation[] => {
	const byText = new Map<string, Violation>();
	for (const v of violations) {
		const key = v.role ? `role:${v.role}` : v.text;
		const names = (v.names ?? []).filter(Boolean);
		if (v.role && names.length > 1 && !byText.has(key)) {
			byText.set(key, roleSentence(v));
			continue;
		}
		if (!byText.has(key)) byText.set(key, v);
	}

	return [...byText.values()].sort((a, b) => a.line - b.line);
};

// The structured evidence a relation finding carries — the token the report
// draws, with the target it names.
const evidenceOf = (v: Violation): Finding["data"] =>
	v.kind && v.targetNode
		? { violations: [{ kind: v.kind, targetNode: v.targetNode, targetPath: v.targetPath ?? null, line: v.line, destination: v.destination ?? null, token: v.token ?? null }] }
		: {};

const emitFindings = (...args: [violations: Violation[], ctx: FileContext, node: ArchNode, out: Finding[], findingFrom: FindingFrom]): void => {
	const [violations, ctx, node, out, findingFrom] = args;
	const kept = withoutDeclareDuplicates(violations);
	violations.length = 0;
	violations.push(...kept);
	if (violations.length === 0) return;

	for (const v of decisionsOf(violations)) {
		out.push(
			findingFrom(
				{
					report: { message: v.text, fix: v.fix ?? null, code: v.ask ?? null },
					line: v.line,
					data: evidenceOf(v),
				},
				"finally-follow-architecture",
				node.slug,
				`finally:${node.slug}:${ctx.rel}:${v.kind ?? "misc"}:${v.targetNode ?? "-"}:${v.line}`,
				{ path: ctx.rel, node: node.slug, what: ctx.rel },
			),
		);
	}
};

export { emitFindings };

"use strict";

// Turn violations into findings: drop the call/declare duplicate, then one
// finding per decision.

const emitFindings = (violations, ctx, node, out, findingFrom) => {
	const called = new Set(violations.filter((v) => v.kind === "call").map((v) => `${v.line}|${v.targetPath}`));
	const kept = violations.filter((v) => v.kind !== "declare" || !called.has(`${v.line}|${v.targetPath}`));
	violations.length = 0;
	violations.push(...kept);

	if (violations.length === 0) return;

	const byText = new Map();
	for (const v of violations) {
		// Same role, several functions: one sentence naming all of them.
		const key = v.role ? `role:${v.role}` : v.text;
		const names = (v.names ?? []).filter(Boolean);
		if (v.role && names.length > 1 && !byText.has(key)) {
			const shown = names.slice(0, 4).map((n) => `\`${n}\``).join(", ");
			const rest = names.length > 4 ? ` and ${names.length - 4} more` : "";
			const tail = v.where ? `they belong in ${v.where}` : `${v.owning ?? "this folder"} declares no home for a \`${v.role}\``;
			const move = v.where ? `Move ${shown}${rest} to ${v.where}.` : null;
			byText.set(key, { ...v, fix: move, text: `This file declares \`${v.role}\` functions (${shown}${rest}): ${tail}.` });
			continue;
		}
		if (!byText.has(key)) byText.set(key, v);
	}
	const unique = [...byText.values()];
	unique.sort((a, b) => a.line - b.line);
	for (const v of unique) {
		out.push(
			findingFrom(
				{
					report: { message: v.text, fix: v.fix ?? null, code: v.ask ?? null },
					line: v.line,
					data:
						v.kind && v.targetNode
							? {
									violations: [
										{
											kind: v.kind,
											targetNode: v.targetNode,
											targetPath: v.targetPath ?? null,
											line: v.line,
											destination: v.destination ?? null,
											token: v.token ?? null,
										},
									],
								}
							: {},
				},
				"finally-follow-architecture",
				node.slug,
				`finally:${node.slug}:${ctx.rel}:${v.kind ?? "misc"}:${v.targetNode ?? "-"}:${v.line}`,
				{ path: ctx.rel, node: node.slug, what: ctx.rel },
			),
		);
	}
};

module.exports = { emitFindings };

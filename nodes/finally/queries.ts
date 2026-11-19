"use strict";

// A file that matches a declared child's query but sits outside it.

import { matches } from "../../entities/queries";
import { nodePrefixRe } from "../children";
import { fillTemplate } from "../../entities/location";
import type { ArchNode } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { Violation } from "./violation";

const checkChildQueries = (ctx: FileContext, node: ArchNode, violations: Violation[]): void => {
	for (const child of node.children) {
		if (!child.query) continue;
		if (!matches(ctx.facts, child.query)) continue;
		const childPath = node.path === "." ? child.name : `${node.path}/${child.name}`;
		const { re } = nodePrefixRe(childPath ?? "");
		if (re.test(ctx.rel)) continue; // already in the right place
		const where = fillTemplate(childPath, ctx.rel);
		violations.push({ line: 1, text: `this file matches the query of node \`${child.slug ?? child.name}\` and belong in \`${where}\`` });
	}
};

export { checkChildQueries };

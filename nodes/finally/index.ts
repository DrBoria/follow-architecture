"use strict";

// finally-follow-architecture: the built-in structure rule. Four questions,
// one module each, no wording (that lives in report/errorTypes).

import { fillTemplate } from "../../entities/location";
import { deepestMatch } from "../../entities/tree";
import { missingRequiredChild } from "../children";
import { EDGE_FACTS } from "../../entities/kinds";

import { fitsRole } from "./roles";
import { checkRequiredChildren } from "./required";
import { checkChildQueries } from "./queries";
import { checkRelations } from "./relations";
import { emitFindings } from "./emit";
import type { Arch, ArchNode } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { Finding, FindingFrom } from "../../entities/findings";
import type { Violation } from "./violation";

// The node's own structure questions, asked of the file that matched it: the
// required children, the child queries, the relations — then one finding per
// decision.
const checkNode = (ctx: FileContext, node: ArchNode, out: Finding[], findingFrom: FindingFrom): void => {
	const violations: Violation[] = [];
	checkRequiredChildren(ctx, node, out, findingFrom);
	checkChildQueries(ctx, node, violations);
	checkRelations(ctx, ctx.arch, violations);
	emitFindings(violations, ctx, node, out, findingFrom);
};

const checkFinally = (ctx: FileContext, arch: Arch, out: Finding[], findingFrom: FindingFrom): void => {
	const match = deepestMatch(ctx.rel, arch);
	if (!match) return;
	checkNode(ctx, match.node, out, findingFrom);
};

const __exported_missingRequiredChild = (node: ArchNode, arch: Arch, rel: string, files: string[] | null | undefined): boolean =>
	missingRequiredChild(node, arch, rel, { repoFiles: files, concreteFolder: fillTemplate });
export { checkFinally, fitsRole, __exported_missingRequiredChild as missingRequiredChild, EDGE_FACTS };

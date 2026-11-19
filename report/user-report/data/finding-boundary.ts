"use strict";

// The boundary panel: WHO may reach the node the relation touched. The list is
// NOT recomputed here — it is the engine's own verdict (`token.why.roles`), the
// same array the sentence and the repairs print. One evaluation, three readers.

import type { ArchNode } from "../../../entities/architecture";
import type { NodeSummary } from "../../../entities/overview-summaries";
import type { Boundary } from "../../../entities/enriched-finding";

const boundaryDetail = (args: { ownerNode: ArchNode | null; targetNode: NodeSummary | null; roles: readonly string[] }): Boundary | null => {
	const { ownerNode, targetNode, roles } = args;
	if (!targetNode) return null;
	const where = targetNode.paths.join(" | ");
	const list = roles.filter(Boolean);
	const ownerPath = ownerNode ? ownerNode.path : "";
	const ownerText = ownerNode ? `\`${ownerNode.slug}\` (${ownerPath})` : "no declared node";
	return {
		targetNode: targetNode.slug,
		targetPaths: targetNode.paths,
		ownerNode: ownerNode?.slug ?? null,
		ownerPaths: ownerNode ? [ownerNode.path] : [],
		summary: `\`${targetNode.slug}\` (${where}) may be reached only from: ${list.length ? list.join(", ") : "—"}. This file belongs to ${ownerText}, which is not on that list.`,
		allowed: list,
	};
};

export { boundaryDetail };

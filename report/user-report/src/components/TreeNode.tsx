// One node of the declared tree: a row (name, action dots, roles, counts) and,
// when open, its children sorted by path. The row's pieces live in `tree-row/`;
// this component is the recursion and the click behaviour only.

import React from "react";
import { Row, Chevron, Name } from "./tree-row/styles";
import { ActionDots, RoleBadge, RowCounts } from "./tree-row/RowParts";
import type { NodeSummary } from "../../../../entities/overview-summaries";

// What every row reads: the children index, the open set, the selection, the
// finding counts, and the action colours. One bag, passed down unchanged.
type TreeCtx = {
	childrenByParent: Map<string, NodeSummary[]>;
	expanded: Set<string>;
	onToggle: (slug: string) => void;
	onSelect?: (slug: string) => void;
	selected: string | null;
	findingCounts: Record<string, number>;
	kindFlags: Record<string, string[]>;
	colors: Record<string, string>;
};

type TreeNodeProps = { node: NodeSummary; depth?: number; ctx: TreeCtx };

// The row's click: a parent toggles open, every row selects itself.
const rowClick = (node: NodeSummary, kids: readonly NodeSummary[], ctx: TreeCtx): void => {
	if (kids.length) ctx.onToggle(node.slug);
	ctx.onSelect?.(node.slug);
};

// The row itself: chevron, name, dots, roles, counts.
const NodeRow = ({ node, depth, kids, ctx }: { node: NodeSummary; depth: number; kids: readonly NodeSummary[]; ctx: TreeCtx }): React.JSX.Element => (
	<Row
		$depth={depth}
		$selected={ctx.selected === node.slug}
		title={node.paths?.join(" | ") ?? node.slug}
		onClick={() => rowClick(node, kids, ctx)}
	>
		<Chevron $open={ctx.expanded.has(node.slug)}>{kids.length ? "▶" : ""}</Chevron>
		<Name $file={node.isFile}>{node.name}</Name>
		<ActionDots kinds={ctx.kindFlags[node.slug] ?? []} colors={ctx.colors} />
		<RoleBadge roles={node.roles ?? []} />
		<RowCounts node={node} fixCount={ctx.findingCounts[node.slug] ?? 0} />
	</Row>
);

const TreeNode = ({ node, depth = 0, ctx }: TreeNodeProps): React.JSX.Element => {
	const kids = ctx.childrenByParent?.get(node.slug) ?? [];
	const open = ctx.expanded.has(node.slug);
	return (
		<div>
			<NodeRow node={node} depth={depth} kids={kids} ctx={ctx} />
			{open
				? [...kids]
						.sort((a, b) => a.paths[0].localeCompare(b.paths[0]))
						.map((kid) => <TreeNode key={kid.slug} node={kid} depth={depth + 1} ctx={ctx} />)
				: null}
		</div>
	);
};

export { TreeNode };
export type { TreeCtx, TreeNodeProps };

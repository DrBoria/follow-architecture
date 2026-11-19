// The declared-architecture screen: the tree on the left (search, kind legend,
// expandable rows), the selected node's detail on the right (paths, roles,
// local graph, sample, findings). The reads live in `tree-screen/reads`, the
// detail sections in `tree-screen/parts`; this screen is the state only.

import React, { useEffect, useMemo, useState } from "react";
import { Badge, Panel, PanelHead, SearchBox, Subtle, Title } from "../components/ui";
import { TreeNode, type TreeCtx } from "../components/TreeNode";
import { kindColors } from "../theme";
import { edgeKinds, edgeKindCounts, edgesOfKind } from "../utils/edges";
import { navigate } from "../utils/router";
import { kindFlagsOf, childrenOf, findingCountsOf, matchesOf, chainOf, localGraphOf } from "./tree-screen/reads";
import { Layout, TreeBox, PathLine, RolesSection, LocalGraphSection, FindingsSection, SampleSection } from "./tree-screen/parts";
import type { ScreenProps } from "./contract";
import type { NodeSummary } from "../../../../entities/overview-summaries";

// The kind legend: one coloured dot per action the config declares.
const KindLegend = ({ kinds, colors }: { kinds: readonly string[]; colors: Record<string, string> }): React.JSX.Element => (
	<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
		{kinds.map((kind) => (
			<span key={kind} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: colors[kind] }}>
				<span style={{ width: 7, height: 7, borderRadius: 4, background: colors[kind] }} />
				{kind}
			</span>
		))}
	</div>
);

// The search results: a flat list of matching nodes (slug — first path).
const MatchList = ({ matches, selected, onSelect }: { matches: readonly NodeSummary[]; selected: string | null; onSelect: (slug: string) => void }): React.JSX.Element => (
	<>
		{matches.slice(0, 60).map((n) => (
			<div
				key={n.slug}
				onClick={() => onSelect(n.slug)}
				style={{ cursor: "pointer", padding: "5px 8px", borderRadius: 6, fontSize: 12.5, fontFamily: "monospace", color: selected === n.slug ? "#6ea8fe" : "#c3ccd9" }}
			>
				{n.slug} <span style={{ color: "#6b7788" }}>— {n.paths[0]}</span>
			</div>
		))}
	</>
);

// The open rows: the roots at first, toggled by click, and the ancestor chain
// of a URL selection opened so the right panel describes a row nobody sees.
const useExpanded = (roots: readonly NodeSummary[], selected: string | null, nodes: readonly NodeSummary[]): { expanded: Set<string>; toggle: (slug: string) => void } => {
	const [expanded, setExpanded] = useState(() => new Set(roots.map((r) => r.slug)));
	const toggle = (slug: string): void =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	useEffect(() => {
		if (!selected) return;
		const chain = chainOf(selected, nodes);
		setExpanded((prev) => {
			const missing = chain.filter((slug) => !prev.has(slug));
			return missing.length ? new Set([...prev, ...missing]) : prev;
		});
	}, [selected, nodes]);
	return { expanded, toggle };
};

export const TreeScreen = ({ data, params }: ScreenProps): React.JSX.Element => {
	const { nodes, findings, access } = data;
	const colors = useMemo(() => kindColors(access.kinds), [access.kinds]);
	const kindFlags = useMemo(() => kindFlagsOf(access.edges), [access.edges]);
	const childrenByParent = useMemo(() => childrenOf(nodes), [nodes]);
	const roots = useMemo(() => nodes.filter((n) => !n.parents.length), [nodes]);
	const findingCounts = useMemo(() => findingCountsOf(findings), [findings]);

	const [query, setQuery] = useState("");
	const selected = params.node ?? roots[0]?.slug ?? null;
	const setSelected = (slug: string): void => navigate("tree", { node: slug });
	const { expanded, toggle } = useExpanded(roots, selected, nodes);
	const matches = useMemo(() => matchesOf(nodes, query), [nodes, query]);

	const detail = useNodeDetail(selected, data);

	const treeCtx: TreeCtx = { childrenByParent, expanded, onToggle: toggle, onSelect: setSelected, selected, findingCounts, kindFlags, colors };
	const { node, nodeRoles, nodeFindings, local, setKind } = detail;

	return (
		<Layout>
			<Panel>
				<PanelHead>
					<Title>Declared architecture</Title>
					<Subtle>click to expand</Subtle>
				</PanelHead>
				<SearchBox value={query} onChange={setQuery} placeholder="Find a node or path…" />
				<KindLegend kinds={access.kinds} colors={colors} />
				<TreeBox style={{ marginTop: 10 }}>
					{matches ? (
						<MatchList matches={matches} selected={selected} onSelect={setSelected} />
					) : (
						roots.map((r) => <TreeNode key={r.slug} node={r} ctx={treeCtx} />)
					)}
				</TreeBox>
			</Panel>

			<Panel>
				<PanelHead>
					<Title>{node ? node.paths[0] : "Node"}</Title>
					{node?.fileCount ? <Badge>{node.fileCount} files</Badge> : null}
					{nodeFindings.length ? <Badge color="#ff6b6b">{nodeFindings.length}</Badge> : null}
				</PanelHead>
				{node ? (
					<NodeDetail node={node} nodeRoles={nodeRoles} nodeFindings={nodeFindings} local={local} onKind={setKind} />
				) : (
					<Subtle>Select a node on the left.</Subtle>
				)}
			</Panel>
		</Layout>
	);
};

// The selected node's reads: the node, its roles, its findings, and its local
// graph with the kind filter (which resets per node).
const useNodeDetail = (selected: string | null, data: ScreenProps["data"]): { node: NodeSummary | null; nodeRoles: ScreenProps["data"]["roles"]; nodeFindings: ScreenProps["data"]["findings"]; local: NodeDetailAsk["local"]; setKind: (k: string) => void } => {
	const { nodes, findings, roles, access } = data;
	const node = selected ? nodes.find((n) => n.slug === selected) ?? null : null;
	const nodeRoles = node ? roles.filter((r) => (node.roles ?? []).includes(r.slug)) : [];
	const nodeFindings = node ? findings.filter((f) => f.ownerNode === node.slug) : [];
	const { localEdges, localNodes } = useMemo(() => localGraphOf(node, nodes, access.edges), [node, nodes, access.edges]);
	const [kind, setKind] = useState("all");
	useEffect(() => setKind("all"), [node?.slug]);
	const localKinds = useMemo(() => edgeKinds(localEdges), [localEdges]);
	const kindCounts = useMemo(() => edgeKindCounts(localEdges), [localEdges]);
	const shownEdges = useMemo(() => edgesOfKind(localEdges, kind), [localEdges, kind]);
	const colors = useMemo(() => kindColors(access.kinds), [access.kinds]);
	return { node, nodeRoles, nodeFindings, local: { localEdges, localNodes, localKinds, kindCounts, shownEdges, kind, colors }, setKind };
};

// The selected node's detail: its paths, roles, local graph, sample, findings.
type NodeDetailAsk = {
	node: NodeSummary;
	nodeRoles: ScreenProps["data"]["roles"];
	nodeFindings: ScreenProps["data"]["findings"];
	local: { localEdges: ScreenProps["data"]["access"]["edges"]; localNodes: NodeSummary[]; localKinds: string[]; kindCounts: Map<string, number>; shownEdges: ScreenProps["data"]["access"]["edges"]; kind: string; colors: Record<string, string> };
	onKind: (k: string) => void;
};

const NodeDetail = ({ node, nodeRoles, nodeFindings, local, onKind }: NodeDetailAsk): React.JSX.Element => (
	<>
		{node.paths.slice(1).map((p) => (
			<PathLine key={p}>{p}</PathLine>
		))}
		<RolesSection node={node} nodeRoles={nodeRoles} />
		<LocalGraphSection node={node} localEdges={local.localEdges} localNodes={local.localNodes} localKinds={local.localKinds} kindCounts={local.kindCounts} shownEdges={local.shownEdges} kind={local.kind} colors={local.colors} onKind={onKind} />
		<SampleSection node={node} />
		{nodeFindings.length ? <FindingsSection findings={nodeFindings} /> : null}
	</>
);

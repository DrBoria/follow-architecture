"use strict";

// The tree screen's styled pieces and the node-detail sections: the paths, the
// roles that may live here, the local graph with its kind filters, the sample,
// and the findings in this folder.

import React from "react";
import styled from "styled-components";
import { Badge, Subtle } from "../../components/ui";
import { CodePanel } from "../../components/code-preview/CodePanel";
import { AccessGraph } from "../../components/AccessGraph";
import { categoryColor } from "../../theme";
import { navigate } from "../../utils/router";
import type { NodeSummary, RoleSummary } from "../../../../../entities/overview-summaries";
import type { EnrichedFinding } from "../../../../../entities/enriched-finding";
import type { AccessEdge } from "../../../../../entities/access-graph";

const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.1fr) minmax(340px, 1fr);
	gap: 16px;
	align-items: start;
	@media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const TreeBox = styled.div`
	max-height: 640px;
	overflow: auto;
`;

const Section = styled.div`
	display: grid;
	gap: 5px;
	margin-top: 12px;
`;

const Label = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
`;

const PathLine = styled.div`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11.5px;
	color: ${(p) => p.theme.color.textDim};
`;

// A finding in this folder: the file is the LINK (it opens the finding), the
// title is one short line. Colour marks the category, not the whole paragraph.
const FindingRow = styled.button<{ $color: string }>`
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 8px;
	align-items: baseline;
	width: 100%;
	text-align: left;
	background: transparent;
	border: none;
	border-left: 2px solid ${(p) => p.$color};
	padding: 3px 0 3px 8px;
	cursor: pointer;
	color: ${(p) => p.theme.color.text};
	&:hover { background: rgba(255, 255, 255, 0.04); }
`;

const FileLink = styled.span`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11px;
	color: ${(p) => p.theme.color.textDim};
	white-space: nowrap;
`;

// The same colour-coded action filters as the Code Roles screen.
const FilterBar = styled.div`
	display: flex;
	gap: 6px;
	align-items: center;
	flex-wrap: wrap;
	margin-bottom: 8px;
`;

const KindButton = styled.button<{ $active?: boolean; $color?: string }>`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 3px 10px;
	border-radius: 999px;
	font-size: 11.5px;
	font-weight: 600;
	cursor: pointer;
	color: ${(p) => p.$color ?? p.theme.color.text};
	background: ${(p) => (p.$active ? `${p.$color}2e` : `${p.$color}14`)};
	border: 1px solid ${(p) => (p.$active ? `${p.$color}cc` : `${p.$color}55`)};
	&:hover { border-color: ${(p) => p.$color}; background: ${(p) => `${p.$color}24`}; }
`;

// The roles that may live here, plus the closed-folder flag.
const RolesSection = ({ node, nodeRoles }: { node: NodeSummary; nodeRoles: readonly RoleSummary[] }): React.JSX.Element => (
	<Section>
		<Label>code that may live here</Label>
		<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
			{nodeRoles.map((r) => (
				<Badge key={r.slug} color="#b48ef0">
					{r.slug}
				</Badge>
			))}
			{!nodeRoles.length ? <Badge>structure only</Badge> : null}
			{node.closed ? <Badge color="#fbbf24">closed folder</Badge> : null}
		</div>
	</Section>
);

// The local graph with its kind filters, or the "no action names it" note.
type LocalGraphAsk = {
	node: NodeSummary;
	localEdges: readonly AccessEdge[];
	localNodes: NodeSummary[];
	localKinds: string[];
	kindCounts: Map<string, number>;
	shownEdges: AccessEdge[];
	kind: string;
	colors: Record<string, string>;
	onKind: (k: string) => void;
};

const LocalGraphSection = (ask: LocalGraphAsk): React.JSX.Element => {
	const { node, localEdges, localNodes, localKinds, kindCounts, shownEdges, kind, colors, onKind } = ask;
	return (
		<Section>
			<Label>what is imported or used in it, and what it imports or uses</Label>
			{localEdges.length ? (
				<>
					<FilterBar>
						<KindButton $active={kind === "all"} $color="#d7dee8" onClick={() => onKind("all")}>
							all {localEdges.length}
						</KindButton>
						{localKinds.map((k) => (
							<KindButton key={k} $active={kind === k} $color={colors[k]} onClick={() => onKind(k)}>
								{k} {kindCounts.get(k) ?? 0}
							</KindButton>
						))}
					</FilterBar>
					<AccessGraph nodes={localNodes} edges={shownEdges} kindColors={colors} focus={node.slug} height={220} />
				</>
			) : (
				<Subtle>no action names this folder — nothing is imported or used in it, and it imports or uses nothing.</Subtle>
			)}
		</Section>
	);
};

// The findings in this folder: each row opens the finding on its own screen.
const FindingsSection = ({ findings }: { findings: readonly EnrichedFinding[] }): React.JSX.Element => (
	<Section>
		<Label>{findings.length} findings — click to open</Label>
		{findings.map((f, i) => (
			<FindingRow
				key={`${f.file}:${f.line}:${i}`}
				$color={categoryColor(f.category)}
				title={f.message}
				onClick={() => navigate("findings", { file: f.file, line: f.line })}
			>
				<FileLink>
					{f.file.replace(/^.*\//, "")}:{f.line}
				</FileLink>
				<span style={{ color: "#c3ccd9" }}>{f.title}</span>
			</FindingRow>
		))}
	</Section>
);

// The sample code window, when the node has one.
const SampleSection = ({ node }: { node: NodeSummary }): React.JSX.Element | null => {
	if (!node.sample) return null;
	return (
		<Section>
			<Label>what it looks like</Label>
			<CodePanel title={node.sample.file} code={node.sample.lines.join("\n")} max="150px" />
		</Section>
	);
};

export { Layout, TreeBox, Section, Label, PathLine, RolesSection, LocalGraphSection, FindingsSection, SampleSection };
export type { LocalGraphAsk };

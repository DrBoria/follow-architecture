"use strict";

// The summary's panels: what the report is (the stats), the findings by
// category, the orphan files, how to read it, and the most important findings.
// Split from the screen so each panel is one named block.

import React from "react";
import styled from "styled-components";
import { Badge, Panel, PanelHead, Stat, Stats, Subtle, Title } from "../components/ui";
import { FindingCard } from "../components/FindingCard";
import { categoryColor } from "../theme";
import { navigate } from "../utils/router";
import type { OverviewData } from "../../../../entities/overview-data";
import type { EnrichedFinding } from "../../../../entities/enriched-finding";

const Row = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid ${(p) => p.theme.color.border};
	font-size: 13px;
	&:last-child { border-bottom: none; }
`;

const Help = styled.ol`
	margin: 0;
	padding-left: 20px;
	color: ${(p) => p.theme.color.textDim};
	font-size: 13px;
	line-height: 1.75;
`;

// What this report is: the architecture it reads, and the four counts.
const AboutPanel = ({ data }: { data: OverviewData }): React.JSX.Element => {
	const { stats, meta } = data;
	return (
		<Panel>
			<PanelHead>
				<Title>What this report is</Title>
			</PanelHead>
			<Subtle>
				A visual reading of <code>{meta.architecturePath}</code> — every declared node, the code roles it accepts, the
				import boundaries between nodes, and every current violation shown in full context.
			</Subtle>
			<Stats style={{ marginTop: 14 }}>
				<Stat label="nodes" value={stats.nodes} color="#6ea8fe" />
				<Stat label="code roles" value={stats.roles} color="#b48ef0" />
				<Stat label="invariants" value={stats.invariants} color="#56c8a8" />
				<Stat label="findings" value={stats.findings} color={stats.findings ? "#ff6b6b" : "#4ade80"} />
			</Stats>
		</Panel>
	);
};

// The findings by category, or the "no violations" note.
const CategoryPanel = ({ data }: { data: OverviewData }): React.JSX.Element => {
	const { stats, groups } = data;
	return (
		<Panel>
			<PanelHead>
				<Title>Findings by category</Title>
				<Subtle>{stats.filesWithFindings} files affected</Subtle>
			</PanelHead>
			{groups.byCategory.length ? (
				groups.byCategory.map((g) => (
					<Row key={g.key}>
						<Badge color={categoryColor(g.key)}>{g.key}</Badge>
						<span style={{ flex: 1 }} />
						<strong>{g.count}</strong>
					</Row>
				))
			) : (
				<Subtle>No violations — the code matches the declared architecture.</Subtle>
			)}
		</Panel>
	);
};

// The files the architecture says nothing about.
const OrphanPanel = ({ orphans }: { orphans: readonly string[] }): React.JSX.Element => (
	<Panel $accent="#fbbf24">
		<PanelHead>
			<Title>Orphan files</Title>
			<Subtle>the architecture says nothing about these</Subtle>
		</PanelHead>
		{orphans.map((o) => (
			<Row key={o}>
				<code style={{ fontSize: 12 }}>{o}</code>
			</Row>
		))}
	</Panel>
);

// How to read the five screens.
const HelpPanel = (): React.JSX.Element => (
	<Panel>
		<PanelHead>
			<Title>How to read it</Title>
		</PanelHead>
		<Help>
			<li>
				<strong>Architecture tree</strong> — folders and files the config declares, with the kind of code each accepts.
			</li>
			<li>
				<strong>Graph</strong> — folders and the arrows the architecture allows between them, filterable by the action the config declares (<code>import</code>, <code>usage</code>, <code>mutation</code>, …). The tree shows the same arrows as coloured dots.
			</li>
			<li>
				<strong>Code roles</strong> — how each declaration is classified, with real examples from this repo.
			</li>
			<li>
				<strong>Invariants</strong> — cross-cutting rules, written out as plain conditions.
			</li>
			<li>
				<strong>Findings</strong> — what fires now, with the boundary it crossed and the fix.
			</li>
		</Help>
	</Panel>
);

// The most important findings right now, with the link to all of them.
const TopPanel = ({ top, total }: { top: readonly EnrichedFinding[]; total: number }): React.JSX.Element => (
	<Panel>
		<PanelHead>
			<Title>Most important right now</Title>
			<Badge color="#ff6b6b">top {top.length}</Badge>
		</PanelHead>
		<div style={{ display: "grid", gap: 10 }}>
			{top.map((f, i) => (
				<FindingCard key={`${f.file}:${f.line}:${i}`} finding={f} />
			))}
		</div>
		<button
			onClick={() => navigate("findings")}
			style={{
				marginTop: 12,
				background: "#161d2b",
				border: "1px solid #222c3c",
				color: "#6ea8fe",
				borderRadius: 6,
				padding: "6px 12px",
				cursor: "pointer",
				fontSize: 12.5,
			}}
		>
			See all {total} findings →
		</button>
	</Panel>
);

export { AboutPanel, CategoryPanel, OrphanPanel, HelpPanel, TopPanel };

import React from "react";
import styled from "styled-components";
import { Badge } from "./ui";
import { navigate } from "../utils/router";

const Header = styled.header`
	border-bottom: 1px solid ${(p) => p.theme.color.border};
	background: linear-gradient(180deg, #131a27, #0b0e14);
	padding: 16px 24px 0;
`;

const TopRow = styled.div`
	display: flex;
	align-items: baseline;
	gap: 12px;
	flex-wrap: wrap;
`;

const RepoName = styled.h1`
	margin: 0;
	font-size: 19px;
	font-weight: 700;
	letter-spacing: 0.2px;
`;

const Tabs = styled.nav`
	display: flex;
	gap: 2px;
	margin-top: 14px;
	overflow-x: auto;
`;

const Tab = styled.button`
	background: transparent;
	border: none;
	border-bottom: 2px solid ${(p) => (p.$active ? p.theme.color.accent : "transparent")};
	color: ${(p) => (p.$active ? p.theme.color.text : p.theme.color.textDim)};
	padding: 8px 14px 9px;
	font-size: 13px;
	font-weight: ${(p) => (p.$active ? 650 : 500)};
	cursor: pointer;
	white-space: nowrap;
	display: flex;
	align-items: center;
	gap: 7px;
	&:hover { color: ${(p) => p.theme.color.text}; }
`;

const Counter = styled.span`
	font-size: 11px;
	padding: 1px 6px;
	border-radius: 999px;
	background: ${(p) => (p.$alert ? "rgba(255,107,107,0.2)" : "rgba(255,255,255,0.07)")};
	color: ${(p) => (p.$alert ? p.theme.color.danger : p.theme.color.textFaint)};
	font-family: ${(p) => p.theme.font.mono};
`;

// The page body is a GRID with one column that may shrink to zero. Without the
// `minmax(0, 1fr)` a wide child (the graph's SVG) sets the track's minimum to its
// intrinsic width, the body grows past the viewport, and the plate paints over
// whatever sits next to it.
const Body = styled.main`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	padding: 22px 24px 60px;
	max-width: 1560px;
	margin: 0 auto;
	min-width: 0;
`;

const TABS = [
	{ id: "summary", label: "Overview" },
	{ id: "tree", label: "Architecture tree" },
	{ id: "graph", label: "Graph & code roles" },
	{ id: "invariants", label: "Invariants" },
	{ id: "findings", label: "Findings" },
];

export const Shell = ({ data, tab, children }) => {
	const { meta, stats } = data;
	const counters = {
		tree: stats.nodes,
		graph: stats.edges,
		invariants: stats.invariants,
		findings: stats.findings,
	};

	return (
		<>
			<Header>
				<TopRow>
					<RepoName>{meta.repoName}</RepoName>
					<Badge color="#6ea8fe">{meta.architecturePath}</Badge>
					<Badge>{meta.filesScanned} files scanned</Badge>
					{stats.orphans ? <Badge color="#fbbf24">{stats.orphans} orphan files</Badge> : null}
					<span style={{ marginLeft: "auto", fontSize: 11.5, color: "#6b7788" }}>
						generated {new Date(meta.generatedAt).toLocaleString()}
					</span>
				</TopRow>
				<Tabs>
					{TABS.map((t) => (
						<Tab key={t.id} $active={tab === t.id} onClick={() => navigate(t.id)}>
							{t.label}
							{counters[t.id] != null ? (
								<Counter $alert={t.id === "findings" && counters[t.id] > 0}>{counters[t.id]}</Counter>
							) : null}
						</Tab>
					))}
				</Tabs>
			</Header>
			<Body>{children}</Body>
		</>
	);
};

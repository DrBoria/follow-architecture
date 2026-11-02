import React, { useState } from "react";
import styled from "styled-components";
import { Badge, Panel, PanelHead, SearchBox, Title } from "../components/ui";
import { navigate } from "../utils/router";

const Cond = styled.li`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12px;
	color: ${(p) => p.theme.color.textDim};
	list-style: none;
	padding: 1px 0;
	&::before { content: "▸ "; color: ${(p) => p.theme.color.invariant}; }
`;

const GoButton = styled.button`
	background: ${(p) => (p.$count ? "rgba(255,107,107,0.12)" : "rgba(255,255,255,0.04)")};
	border: 1px solid ${(p) => (p.$count ? "rgba(255,107,107,0.45)" : p.theme.color.border)};
	color: ${(p) => (p.$count ? "#ff9a9a" : p.theme.color.textDim)};
	border-radius: ${(p) => p.theme.radius.sm};
	padding: 4px 10px;
	font-size: 12px;
	cursor: pointer;
	&:hover { border-color: ${(p) => p.theme.color.borderStrong}; }
`;

// One invariant = the rule as declared: what it forbids, where it applies,
// and what the config says the fix is. Findings live on their own screen.
const InvariantCard = ({ inv }) => (
	<Panel $accent="#56c8a8">
		<PanelHead>
			<Title>{inv.id}</Title>
			<Badge color={inv.findingCount ? "#ff6b6b" : "#4ade80"}>{inv.findingCount}</Badge>
			<GoButton
				$count={inv.findingCount > 0}
				disabled={!inv.findingCount}
				onClick={() => navigate("findings", { invariant: inv.id })}
				style={{ marginLeft: "auto" }}
			>
				show findings →
			</GoButton>
		</PanelHead>

		<div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
			{inv.where.map((w) => (
				<Badge key={w} color="#6ea8fe">
					{w}
				</Badge>
			))}
			{inv.ignore.map((e) => (
				<Badge key={e} color="#fbbf24">
					ignore {e}
				</Badge>
			))}
			{inv.dedupeBy.map((d) => (
				<Badge key={d} color="#8b9bb4">
					once per {d}
				</Badge>
			))}
			{inv.when.map((w) => (
				<Badge key={w} color="#b48ef0">
					when {w}
				</Badge>
			))}
		</div>

		{inv.infer.map((rule, i) => (
			<div key={i} style={{ marginBottom: 12 }}>
				<Badge color="#ff9a9a">infer</Badge>
				<ul style={{ margin: "6px 0 0", padding: 0 }}>
					{rule.conditions.map((c, j) => (
						<Cond key={j}>{c}</Cond>
					))}
				</ul>
				{rule.message ? <div style={{ marginTop: 8, fontSize: 12.5, color: "#c3ccd9" }}>{rule.message}</div> : null}
				{rule.fix ? <div style={{ marginTop: 6, fontSize: 12.5, color: "#8ce6a8" }}>{rule.fix}</div> : null}
			</div>
		))}
	</Panel>
);

export const InvariantsScreen = ({ data }) => {
	const [query, setQuery] = useState("");
	const list = data.invariants.filter((i) => !query || i.id.toLowerCase().includes(query.toLowerCase()));

	return (
		<div style={{ display: "grid", gap: 14 }}>
			<SearchBox value={query} onChange={setQuery} placeholder="Filter invariants…" />
			{list.map((inv) => (
				<InvariantCard key={inv.id} inv={inv} />
			))}
		</div>
	);
};

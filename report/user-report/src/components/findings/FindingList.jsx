import React from "react";
import styled from "styled-components";
import { Badge, Panel, PanelHead, SearchBox, Subtle, Title } from "../ui";
import { categoryColor } from "../../theme";

const Log = styled.div`
	overflow: auto;
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-height: 120px;
	/* A column flex container shrinks its items to fit: with 254 rows inside a
	   max-height, every row collapsed to a few pixels. Rows keep their height. */
	& > * {
		flex: 0 0 auto;
	}
`;

const Entry = styled.button`
	display: grid;
	gap: 2px;
	text-align: left;
	width: 100%;
	box-sizing: border-box;
	overflow: hidden;
	padding: 8px 10px;
	border-radius: ${(p) => p.theme.radius.sm};
	border: 1px solid ${(p) => (p.$active ? "#6ea8fe88" : "transparent")};
	background: ${(p) => (p.$active ? "rgba(110,168,254,0.12)" : "transparent")};
	color: ${(p) => p.theme.color.text};
	cursor: pointer;
	&:hover { background: ${(p) => (p.$active ? "rgba(110,168,254,0.16)" : "rgba(255,255,255,0.04)")}; }
`;

const Line = styled.div`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11px;
	line-height: 14px;
	color: ${(p) => p.theme.color.textFaint};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

// Memoised: the list re-renders on every keystroke, and only `active` changes.
const FindingRow = React.memo(function FindingRow({ f, at, active, onOpen }) {
	return (
		<Entry $active={active} onClick={() => onOpen(f, at)}>
			<div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap", lineHeight: "18px" }}>
				<Badge color={categoryColor(f.category)} style={{ flexShrink: 0, whiteSpace: "nowrap", lineHeight: "14px" }}>
					{f.category}
				</Badge>
				<span style={{ flex: "1 1 auto", minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{f.title}
				</span>
			</div>
			<Line>
				{/* WHICH RULE fired, by id: an invariant is found by its name
				    (`package-does-not-import-the-app`), not by re-reading the prose. */}
				{f.invariant ? `${f.invariant} · ` : ""}
				{f.file}:{f.line}
			</Line>
		</Entry>
	);
});

// The list of findings: search, the category filter, and the rows.
//
// Rows are NOT windowed. A scroll-offset window drifted out of step with the
// container whenever the selection changed (the rows were rendered, but far
// below the visible area — the panel looked empty), and a few hundred two-line
// rows cost nothing: the expensive render was the graph, not this list.
export const FindingList = ({
	data,
	rows,
	selectedIndex,
	query,
	onQuery,
	category,
	onCategory,
	invariantFilter,
	onClearInvariant,
	openFinding,
	viewport = 840,
}) => (
	<Panel>
		<PanelHead>
			<Title>Findings</Title>
			<Subtle>{rows.length}</Subtle>
		</PanelHead>
		<SearchBox value={query} onChange={onQuery} placeholder="Search findings…" />
		<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
			{invariantFilter ? (
				<Badge color="#56c8a8" onClick={onClearInvariant} style={{ cursor: "pointer" }}>
					{invariantFilter} ✕
				</Badge>
			) : (
				<>
					<Badge color={category === "all" ? "#6ea8fe" : undefined} onClick={() => onCategory("all")} style={{ cursor: "pointer" }}>
						all {data.findings.length}
					</Badge>
					{data.groups.byCategory.map((c) => (
						<Badge key={c.key} color={category === c.key ? categoryColor(c.key) : undefined} onClick={() => onCategory(c.key)} style={{ cursor: "pointer" }}>
							{c.key} {c.count}
						</Badge>
					))}
				</>
			)}
		</div>
		<Log data-testid="findings-list" style={{ marginTop: 10, maxHeight: viewport }}>
			{rows.map(({ f, i, at }) => (
				<FindingRow key={`${i}:${f.file}:${f.line}:${at}`} f={f} at={at} active={i === selectedIndex} onOpen={openFinding} />
			))}
			{!rows.length ? <Subtle>nothing matches this filter</Subtle> : null}
		</Log>
	</Panel>
);

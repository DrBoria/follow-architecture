import React, { useDeferredValue, useMemo, useState } from "react";
import styled from "styled-components";
import { Badge, Panel, PanelHead, SearchBox, Subtle, Title } from "../components/ui";
import { categoryColor } from "../theme";
import { AccessGraph } from "../components/AccessGraph";
import { kindColors } from "../theme";
import { BeforeAfter } from "../components/BeforeAfter";
import { nodeLabel } from "../utils/format";
import { navigate } from "../utils/router";

const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.4fr);
	gap: 16px;
	align-items: start;
	@media (max-width: 1050px) { grid-template-columns: 1fr; }
`;

const Log = styled.div`
	max-height: 620px;
	overflow: auto;
	display: grid;
	gap: 3px;
`;

const Entry = styled.button`
	display: grid;
	gap: 2px;
	text-align: left;
	width: 100%;
	/* The row is placed in a fixed-height slot by the virtual list; it must never
	   grow past it, or tall rows draw on top of the next one. */
	height: 100%;
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

const Block = styled.div`
	margin-top: 10px;
	padding: 10px 12px;
	border-radius: ${(p) => p.theme.radius.sm};
	background: ${(p) => p.$bg ?? "rgba(255,255,255,0.025)"};
	font-size: 13px;
	line-height: 1.6;
`;

const Label = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
	margin-bottom: 4px;
`;

// A list row is memoised: filtering re-renders the screen on every keystroke, and
// without this every row is rebuilt even though only `active` ever changes.
const FindingRow = React.memo(function FindingRow({ f, at, active, onOpen }) {
	return (
		<Entry $active={active} onClick={() => onOpen(f, at)}>
			{/* One line, always: the badge keeps its width and the title ellipsises.
			    Wrapping either of them makes the row taller than its slot. */}
			<div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap", lineHeight: "18px" }}>
				<Badge color={categoryColor(f.category)} style={{ flexShrink: 0, whiteSpace: "nowrap", lineHeight: "14px" }}>
					{f.category}
				</Badge>
				<span style={{ flex: "1 1 auto", minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</span>
			</div>
			<Line>
				{f.file}:{f.line}
			</Line>
		</Entry>
	);
});

// A row is two fixed-height lines, so the list can be WINDOWED: only the rows in
// the viewport (+ a little slack) are in the DOM. Rendering 200 rows on every
// keystroke was seconds of work; this keeps the cost constant no matter how many
// findings match. A row measures 8 (padding) + 20 (badge/title) + 2 (gap) + 14
// (location) + 8 (padding) + 2 (borders) ≈ 54px, so the slot is 54px; a shorter
// slot makes the rows draw on top of each other.
const ROW_H = 54;
const OVERSCAN = 6;
const VIEWPORT = 640;

export const FindingsScreen = ({ data, params }) => {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("all");

	const invariantFilter = params.invariant ?? null;

	// The search reads EVERYTHING the report knows about a finding — message, fix,
	// plan, roles, rule conditions — not a hand-picked subset. Picking the fields
	// meant a symbol could be searched for and "not found" while the finding about
	// it was on screen: the reader could not tell "the rule sees nothing here" from
	// "the search does not look there".
	const haystacks = useMemo(() => data.findings.map((f) => JSON.stringify(f).toLowerCase()), [data.findings]);
	// Typing must not wait for 350 rows to re-render: the input keeps its own state
	// and React decides when the filtered list catches up. Without this every
	// keystroke paid for the whole list (seconds on this repo).
	const deferredQuery = useDeferredValue(query);
	const filtered = useMemo(() => {
		const needle = deferredQuery.trim().toLowerCase();
		if (!needle) {
			return data.findings.filter((f) => (invariantFilter ? f.invariant === invariantFilter : true) && (category === "all" || f.category === category));
		}
		const out = [];
		for (let i = 0; i < data.findings.length; i += 1) {
			const f = data.findings[i];
			if (invariantFilter && f.invariant !== invariantFilter) continue;
			if (category !== "all" && f.category !== category) continue;
			if (haystacks[i].includes(needle)) out.push(f);
		}
		return out;
	}, [data.findings, haystacks, invariantFilter, category, deferredQuery]);

	// Selection lives in the URL, so a finding is linkable and the back button works.
	// `file`+`line` is NOT an identity: two findings on one line of one file are the
	// normal case (structure and relation both complain about the same place), and
	// the second one was unreachable — its link resolved to the first match. `n`
	// says WHICH finding at that place, so each row opens itself.
	// One pass over the filtered list gives BOTH the selection and the `n` of every
	// row (`n` = which finding at this file:line, counting from 0).
	const { rows, selectedIndex } = useMemo(() => {
		const seen = new Map();
		const out = [];
		let selected = 0;
		for (let i = 0; i < filtered.length; i += 1) {
			const f = filtered[i];
			const place = `${f.file}:${f.line}`;
			const at = seen.get(place) ?? 0;
			seen.set(place, at + 1);
			out.push({ f, i, at });
			if (params.file && f.file === params.file && String(f.line) === String(params.line)) {
				const nth = Number(params.n ?? 0);
				const wanted = Number.isFinite(nth) ? Math.max(nth, 0) : 0;
				if (at === wanted) selected = i;
			}
		}
		return { rows: out, selectedIndex: selected };
	}, [filtered, params.file, params.line, params.n]);
	// Which slice of the list is on screen. `scrollTop` is the container's own
	// position; it resets whenever the filtered list changes, so the reader never
	// lands in the middle of a new result.
	const [scrollTop, setScrollTop] = useState(0);
	// The graph is the most expensive thing on this screen (a layout over every role
	// and rule). Drawing it for the selected finding made each keystroke pay for it,
	// so it is drawn only when asked for.
	const [showGraph, setShowGraph] = useState(false);
	const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
	const count = Math.ceil(VIEWPORT / ROW_H) + OVERSCAN * 2;
	const start = Math.min(first, Math.max(0, rows.length - count));
	const end = Math.min(rows.length, start + count);
	const visibleRows = rows.slice(start, end);
	const onListScroll = React.useCallback((e) => setScrollTop(e.currentTarget.scrollTop), []);
	React.useEffect(() => setScrollTop(0), [deferredQuery, invariantFilter, category]);

	const current = filtered[selectedIndex] ?? null;
	const rule = current?.invariant ? data.invariants.find((i) => i.id === current.invariant) ?? null : null;
	// Props for the graph are memoised: a new array/object on every render busts
	// AccessGraph's own memo, and its layout is the most expensive thing on screen.
	const graphEdges = useMemo(
		() => data.access.edges.filter((e) => e.from === current?.ownerNode || e.to === current?.ownerNode),
		[data.access.edges, current?.ownerNode],
	);
	const graphKinds = useMemo(() => kindColors(data.access.kinds), [data.access.kinds]);

	const openFinding = React.useCallback(
		(f, at) => navigate("findings", { ...(invariantFilter ? { invariant: invariantFilter } : {}), file: f.file, line: f.line, n: String(at) }),
		[invariantFilter],
	);
	const clearInvariant = () => navigate("findings", {});

	return (
		<Layout>
			<Panel>
				<PanelHead>
					<Title>Findings</Title>
					<Subtle>{filtered.length}</Subtle>
				</PanelHead>
				<SearchBox value={query} onChange={setQuery} placeholder="Search findings…" />
				<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
					{invariantFilter ? (
						<Badge color="#56c8a8" onClick={clearInvariant} style={{ cursor: "pointer" }}>
							{invariantFilter} ✕
						</Badge>
					) : (
						<>
							<Badge color={category === "all" ? "#6ea8fe" : undefined} onClick={() => setCategory("all")} style={{ cursor: "pointer" }}>
								all {data.findings.length}
							</Badge>
							{data.groups.byCategory.map((c) => (
								<Badge key={c.key} color={category === c.key ? categoryColor(c.key) : undefined} onClick={() => setCategory(c.key)} style={{ cursor: "pointer" }}>
									{c.key} {c.count}
								</Badge>
							))}
						</>
					)}
				</div>
				<Log data-testid="findings-list" style={{ marginTop: 10, maxHeight: VIEWPORT, overflowY: "auto" }} onScroll={onListScroll}>
					{/* Rows are POSITIONED, not spaced with growing divs: spacers change the
					    scroll height as you scroll, which re-anchors the container and makes
					    `onScroll` fight the layout in a loop. One fixed-height box, rows
					    absolutely placed inside it — the height never changes. */}
					<div style={{ position: "relative", height: rows.length * ROW_H }}>
						{/* The key MUST be unique per row. `f.key` is the RULE that fired, and a
						    rule fires on hundreds of findings — duplicate keys made React keep the
						    previous rows on screen and hand a click to the wrong one. */}
						{visibleRows.map(({ f, i, at }) => (
							<div key={`${i}:${f.file}:${f.line}:${at}`} style={{ position: "absolute", top: i * ROW_H, left: 0, right: 0, height: ROW_H }}>
								<FindingRow f={f} at={at} active={i === selectedIndex} onOpen={openFinding} />
							</div>
						))}
					</div>
					{!filtered.length ? <Subtle>nothing matches this filter</Subtle> : null}
				</Log>
			</Panel>

			{current ? (
				<div data-testid="finding-detail" style={{ display: "grid", gap: 16 }}>
					<Panel>
						<PanelHead>
							<Title>{current.title}</Title>
							<Badge color={categoryColor(current.category)}>{current.category}</Badge>
							{current.ownerPaths?.length ? <Badge color="#6ea8fe">{nodeLabel({ paths: current.ownerPaths }, 2)}</Badge> : null}
						</PanelHead>
						<div style={{ fontSize: 13, color: "#c3ccd9" }}>{current.message}</div>
						<div style={{ marginTop: 12 }}>
							<BeforeAfter plan={current.plan} file={current.file} />
						</div>
						{rule ? (
							<Block>
								<Label>rule as declared — {rule.id}</Label>
								<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
									{(rule.infer[0]?.conditions ?? []).map((c, i) => (
										<Badge key={i} color="#56c8a8">
											{c}
										</Badge>
									))}
								</div>
							</Block>
						) : null}
						{current.fix ? (
							<Block $bg="rgba(74,222,128,0.06)">
								<Label>how to fix</Label>
								{current.fix}
							</Block>
						) : null}
					</Panel>

					<Panel>
						<PanelHead>
							<Title>Where it sits</Title>
							<Subtle
								as="button"
								onClick={() => setShowGraph((v) => !v)}
								style={{ cursor: "pointer", background: "none", border: "none", color: "#6ea8fe", font: "inherit", padding: 0 }}
							>
								{showGraph ? "hide graph" : "show graph"}
							</Subtle>
						</PanelHead>
						{showGraph ? (
							<AccessGraph nodes={data.nodes} edges={graphEdges} kindColors={graphKinds} focus={current.ownerNode ?? null} height={220} />
						) : (
							<Subtle>{current.ownerNode ? `node \`${current.ownerNode}\`` : "no declared node"} — the graph is drawn on demand: laying out every role for every finding cost seconds per keystroke.</Subtle>
						)}
					</Panel>
				</div>
			) : (
				<Panel>
					<Subtle>Select a finding on the left.</Subtle>
				</Panel>
			)}
		</Layout>
	);
};

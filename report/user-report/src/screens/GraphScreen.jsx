import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Badge, Panel, PanelHead, SearchBox, Subtle, Title } from "../components/ui";
import { AccessGraph } from "../components/AccessGraph";
import { RoleDetail } from "../components/RoleDetail";
import { kindColors } from "../theme";
import { nodeLabel, plural } from "../utils/format";
import { navigate } from "../utils/router";

// The role screen: pick a code role on the left, see ITS boundary on the right.
// The canvas is the folder graph — boxes are declared nodes, arrows are the
// actions that role declares — so "what may be done with this role, and by
// whom" is read in the same vocabulary as the tree.

// Two independent columns, each of which may shrink below its content: the
// graph is a wide SVG, and without `minmax(0, …)` on BOTH sides its intrinsic
// width pushes the grid wider and the plate paints over the column next to it.
const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
	gap: 16px;
	align-items: start;
	width: 100%;
	min-width: 0;
	@media (max-width: 820px) { grid-template-columns: minmax(0, 1fr); }
`;

// One grid cell that cannot grow past its column.
const Cell = styled.div`
	display: grid;
	gap: 16px;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
`;

// The dashboard sits UNDER the two panes (`control toggle` + `graph`) and spans
// the page: its cards are the role's own answers, not a sidebar.
const Dash = styled.section`
	display: grid;
	gap: 12px;
	width: 100%;
	min-width: 0;
	margin-top: 16px;
`;

const DashHead = styled.header`
	display: flex;
	align-items: baseline;
	gap: 10px;
	flex-wrap: wrap;
	min-width: 0;
`;

const RoleRow = styled.div`
	padding: 7px 9px;
	border-radius: ${(p) => p.theme.radius.sm};
	cursor: pointer;
	border: 1px solid ${(p) => (p.$active ? "#6ea8fe88" : "transparent")};
	background: ${(p) => (p.$active ? "rgba(110,168,254,0.12)" : "transparent")};
	&:hover { background: rgba(255, 255, 255, 0.04); }
`;

const Scroll = styled.div`
	max-height: 300px;
	overflow: auto;
	display: grid;
	gap: 2px;
	/* On a large screen the list gets the room the page has: the roles are the
	   navigation, and a 300px window over them is a scrollbar for nothing. */
	@media (min-width: 1200px) {
		max-height: 620px;
	}
`;

const Bar = styled.div`
	display: flex;
	gap: 7px;
	align-items: center;
	flex-wrap: wrap;
	margin-bottom: 12px;
`;

const KindButton = styled.button`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 3px 10px;
	border-radius: 999px;
	font-size: 11.5px;
	font-weight: 600;
	cursor: pointer;
	/* The button carries the colour of the arrows it filters — reading the legend
	   and reading the canvas is the same act, so the words are tinted the same way
	   the lines are. The active one is filled with that colour, the rest keep it
	   as a tint. */
	color: ${(p) => p.$color ?? p.theme.color.text};
	background: ${(p) => (p.$active ? `${p.$color}2e` : `${p.$color}14`)};
	border: 1px solid ${(p) => (p.$active ? `${p.$color}cc` : `${p.$color}55`)};
	&:hover { border-color: ${(p) => p.$color}; background: ${(p) => `${p.$color}24`}; }
`;

export const GraphScreen = ({ data, params }) => {
	const { nodes, access, roles } = data;
	const [query, setQuery] = useState("");
	const [showAll, setShowAll] = useState(false);

	const roleSlug = params.role ?? roles[0]?.slug ?? null;
	const role = roles.find((r) => r.slug === roleSlug) ?? null;
	const kind = params.kind ?? "all";
	const focus = params.focus ?? null;

	const colors = useMemo(() => kindColors(access.kinds), [access.kinds]);
	const listed = roles.filter((r) => !query || `${r.slug} ${r.name}`.toLowerCase().includes(query.toLowerCase()));

	// A role's picture: every relation it takes part in, from either side.
	// A role's boundary is BOTH sides: who may reach its code (`e.target`) and
	// where its own code may go (`e.actor`). Dropping one side lost real
	// declarations (an action using another action, a store's state used by its
	// actions), so both are drawn and the arrow direction follows the tree.
	// Drawn at ROLE level, not folder level: one box per codeRole, with the paths
	// it may be met at listed inside its box. A role that lives in three places is
	// ONE box with three lines — not three boxes with arrows between them, which is
	// what made a single entity look like several unrelated things.
	const roleEdges = useMemo(() => {
		const all = access.roleEdges ?? [];
		if (!role) return all;
		return all.filter((e) => e.to === role.slug || e.from === role.slug);
	}, [access.roleEdges, role]);
	const roleGraphNodes = useMemo(() => {
		const all = access.roleNodes ?? [];
		if (!role || showAll) return all;
		const involved = new Set([role.slug, ...roleEdges.flatMap((e) => [e.from, e.to])]);
		return all.filter((n) => involved.has(n.slug));
	}, [access.roleNodes, role, roleEdges, showAll]);
	const edges = useMemo(() => (kind === "all" ? roleEdges : roleEdges.filter((e) => (e.kinds ?? [e.kind]).includes(kind))), [roleEdges, kind]);

	// The action names this role actually declares — the filter buttons.
	const kinds = useMemo(() => {
		const out = [];
		for (const e of roleEdges) for (const k of e.kinds ?? [e.kind]) if (!out.includes(k)) out.push(k);
		return out;
	}, [roleEdges]);
	const mentions = useMemo(() => (role ? access.mentions?.[role.slug] ?? [] : []), [access.mentions, role]);

	const counts = useMemo(() => {
		const map = new Map();
		for (const e of roleEdges) for (const k of e.kinds ?? [e.kind]) map.set(k, (map.get(k) ?? 0) + 1);
		return map;
	}, [roleEdges]);

	const setRole = (slug) => navigate("graph", { role: slug });
	const setKind = (k) => navigate("graph", { ...(roleSlug ? { role: roleSlug } : {}), ...(k !== "all" ? { kind: k } : {}), ...(focus ? { focus } : {}) });
	const setFocus = (slug) => navigate("graph", { ...(roleSlug ? { role: roleSlug } : {}), ...(kind !== "all" ? { kind } : {}), ...(slug ? { focus: slug } : {}) });

	// The canvas is twice as tall on a wide screen — the graph is the point of the
	// screen, and a 280px window shows a picture the reader has to zoom into.

	return (
		<>
		<Layout>
			<Cell>
				<Panel>
					<PanelHead>
						<Title>Code roles</Title>
					</PanelHead>
					<SearchBox value={query} onChange={setQuery} placeholder="Filter roles…" />
					<Scroll style={{ marginTop: 8 }}>
						{listed.map((r) => (
							<RoleRow key={r.slug} $active={role?.slug === r.slug} onClick={() => setRole(r.slug)}>
								<div style={{ display: "flex", alignItems: "center", gap: 7 }}>
									<span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
									<Badge color="#b48ef0">{r.slug}</Badge>
									<span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7788" }}>{r.exampleCount} in repo</span>
								</div>
							</RoleRow>
						))}
					</Scroll>
				</Panel>

				{/* Where the selected role may be declared: it belongs with the role
				    list, not in the dashboard of answers. */}
				{role?.homes?.length ? (
					<Panel>
						<PanelHead>
							<Title>May Live In</Title>
						</PanelHead>
						{role.homes.map((h) => {
							// A folder whose name IS its path (`packages/vscode-extension`) would
							// print the same string twice and read as two different homes.
							const label = nodeLabel(h, 2);
							const path = h.paths?.join(" | ") ?? "";
							return (
								<div key={h.slug} style={{ fontSize: 12.5, fontFamily: "monospace", overflowWrap: "anywhere", marginBottom: 4 }}>
									<span style={{ color: "#6ea8fe" }}>{label || path}</span>{" "}
									{path && path !== label ? <span style={{ color: "#6b7788" }}>{path}</span> : null}
								</div>
							);
						})}
					</Panel>
				) : null}
			</Cell>

			<Cell>
			<Panel style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
				<PanelHead>
					<Title>Graph View</Title>
					<Badge color="#8b9bb4">
						{plural(new Set(edges.flatMap((e) => [e.from, e.to])).size, "role")} · {plural(edges.length, "rule")}
					</Badge>

					<KindButton $active={showAll} $color="#6b7788" onClick={() => setShowAll((v) => !v)} style={{ marginLeft: "auto" }}>
						{showAll ? "Only connected" : "Show all roles"}
					</KindButton>
				</PanelHead>

				{role && !roleEdges.length ? (
					<div style={{ marginBottom: 12, fontSize: 13, color: "#c3ccd9" }}>
						{role.homes?.length ? (
							<>No action names this role as a source or a target — nothing may reach it and it reaches nothing.</>
						) : (
							<>
								<span style={{ color: "#fbbf24" }}>
									This role has no <code>where</code>: it may live in any folder, so it has no single box to draw.
								</span>{" "}
								Add <code>{"where: [{ node: … }]"}</code> to pin it down.
							</>
						)}
						{mentions.length ? (
							<div style={{ marginTop: 10 }}>
								<div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, color: "#6b7788", marginBottom: 4 }}>
									rules that name this role as the actor
								</div>
								{mentions.map((m, i) => (
									<div key={i} style={{ fontFamily: "monospace", fontSize: 12, color: "#c3ccd9" }}>
										<code>{m.targetRole}</code> <span style={{ color: colors[m.kind] ?? "#7d8899" }}>{m.kind}</span> —{" "}
										{m.targetPaths.join(" | ")}
									</div>
								))}
							</div>
						) : null}
					</div>
				) : null}

				<Bar style={kinds.length ? undefined : { display: "none" }}>
					<KindButton $active={kind === "all"} $color="#d7dee8" onClick={() => setKind("all")}>
						all {roleEdges.length}
					</KindButton>
					{kinds.map((k) => (
						<KindButton key={k} $active={kind === k} $color={colors[k]} onClick={() => setKind(k)}>
							{k} {counts.get(k) ?? 0}
						</KindButton>
					))}
				</Bar>

								<AccessGraph nodes={roleGraphNodes} edges={edges} kindColors={colors} focus={focus} onFocus={setFocus} showAll={showAll} height={280} growOnWide />
				<Subtle style={{ display: "block", marginTop: 8 }}>
					{"an arrow points from the code that is imported or used INTO the code that imports or uses it: “left ──import──▶ right” = right imports left — hover for the exact sentence"}
				</Subtle>

				{(() => {
					const n = access.unplaceable.filter((u) => !role || u.targetRole === role.slug).length;
					return n ? (
						<Subtle style={{ display: "block", marginTop: 10 }}>
							{n} rule(s) cannot be drawn as a folder arrow — the rule names a glob or a filter, not a folder.
						</Subtle>
					) : null;
				})()}
			</Panel>
			</Cell>
		</Layout>

		{/* A DASHBOARD, not a rail: the role's own answers sit under the two main
		    panes and flow across the full width, so nothing is squeezed into a
		    column and nothing covers the graph. */}
		{role ? (
			<Dash>
				<DashHead>
					<Title>{role.name}</Title>
					<Badge color="#b48ef0">{role.slug}</Badge>
					{role.homes?.length ? <Badge color="#f0a35e">{nodeLabel(role.homes[0], 2)}</Badge> : null}
					{role.exampleCount ? <Badge color="#8b9bb4">{plural(role.exampleCount, "match", "matches")}</Badge> : null}
				</DashHead>
				<RoleDetail role={role} nodes={nodes} graph={access} />
			</Dash>
		) : null}
		</>
	);
};

import React from "react";
import styled from "styled-components";
import { Badge, Mono, Subtle } from "./ui";

const Row = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;
	padding: 4px 8px 4px ${(p) => 8 + p.$depth * 18}px;
	border-radius: ${(p) => p.theme.radius.sm};
	overflow: hidden;
	cursor: pointer;
	background: ${(p) => (p.$selected ? "rgba(110,168,254,0.15)" : "transparent")};
	&:hover { background: ${(p) => (p.$selected ? "rgba(110,168,254,0.2)" : "rgba(255,255,255,0.04)")}; }
`;

const Chevron = styled.span`
	width: 13px;
	color: ${(p) => p.theme.color.textFaint};
	font-size: 10px;
	flex: none;
	transform: rotate(${(p) => (p.$open ? "90deg" : "0deg")});
	transition: transform 0.12s ease;
`;

const Name = styled.span`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12.5px;
	font-weight: 600;
	white-space: nowrap;
	min-width: 0;
	max-width: 52%;
	overflow: hidden;
	text-overflow: ellipsis;
	/* The folder NAME is the row: it never shrinks. The role badge next to it is
	   the thing that gives way (it has its own ellipsis). */
	flex: 0 0 auto;
	color: ${(p) => (p.$file ? p.theme.color.text : p.theme.color.accent)};
`;

// The path used to be its own column, and it was the widest thing in the row:
// rows overflowed and the role badge was clipped. The row is already nested, so
// the path is a tooltip now.

const Count = styled.span`
	font-size: 11px;
	color: ${(p) => p.theme.color.textFaint};
	font-family: ${(p) => p.theme.font.mono};
	white-space: nowrap;
	flex: none;
`;

// One dot per ACTION the folder takes part in, in the same colour the arrow
// has on the Graph screen. That is how a reader carries the picture over.
const Dot = styled.span`
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: ${(p) => p.$color};
	flex: none;
`;

// At most five dots: seven actions turned the row into a colour strip and left
// no room for the role name.
const MAX_DOTS = 5;

export const TreeNode = ({ node, childrenByParent, depth = 0, expanded, onToggle, onSelect, selected, findingCounts = {}, parentSlug = null, kindFlags = {}, colors = {} }) => {
	const fixCount = findingCounts[node.slug] ?? 0;
	const open = expanded.has(node.slug);
	const kids = childrenByParent?.get(node.slug) ?? [];

	return (
		<div>
			<Row
				$depth={depth}
				$selected={selected === node.slug}
				title={node.paths?.join(" | ") ?? node.slug}
				onClick={() => {
					if (kids.length) onToggle(node.slug);
					onSelect?.(node.slug);
				}}
			>
				<Chevron $open={open}>{kids.length ? "▶" : ""}</Chevron>
				<Name $file={node.isFile}>{node.name}</Name>
				{(kindFlags[node.slug] ?? []).slice(0, MAX_DOTS).map((kind) => (
					<span key={kind} title={`takes part in \`${kind}\``} style={{ display: "inline-flex", flex: "none" }}>
						<Dot $color={colors[kind]} />
					</span>
				))}
				{(kindFlags[node.slug] ?? []).length > MAX_DOTS ? (
					<span style={{ flex: "none", fontSize: 10, color: "#6b7788" }} title="more actions take part">
						+{(kindFlags[node.slug] ?? []).length - MAX_DOTS}
					</span>
				) : null}
				<Badge
					nowrap
					title={node.roles?.length ? node.roles.join(" · ") : "structure only"}
					color={node.roles?.length ? "#b48ef0" : undefined}
					style={{ flex: "0 1 auto", minWidth: 0, maxWidth: 200 }}
				>
					{/* The text is its own box so a long role list ellipsizes instead of
					    widening the row (which pushed a horizontal scrollbar on the tree). */}
					<span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						{node.roles?.length ? node.roles.join(" · ") : "structure only"}
					</span>
				</Badge>
				{node.closed ? <Badge nowrap color="#fbbf24">closed</Badge> : null}
				{node.fileCount ? <Count>{node.fileCount} {node.fileCount === 1 ? "file" : "files"}</Count> : null}
				{fixCount ? <Badge nowrap color="#ff6b6b">{fixCount}</Badge> : null}
			</Row>
			{open
				? [...kids]
						.sort((a, b) => a.paths[0].localeCompare(b.paths[0]))
						.map((kid) => (
							<TreeNode
								key={kid.slug}
								node={kid}
								childrenByParent={childrenByParent}
								parentSlug={node.slug}
								depth={depth + 1}
								expanded={expanded}
								onToggle={onToggle}
								onSelect={onSelect}
								selected={selected}
								findingCounts={findingCounts}
								kindFlags={kindFlags}
								colors={colors}
							/>
						))
				: null}
		</div>
	);
};

export const NodeDetail = ({ node, onPick }) => {
	if (!node) return null;
	const allowed = (list) =>
		list.length ? (
			<ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
				{list.map((e, i) => (
					<li key={i}>
						<Mono>{e.value}</Mono> <Subtle>({e.type})</Subtle>
					</li>
				))}
			</ul>
		) : (
			<Subtle>—</Subtle>
		);

	return (
		<div style={{ display: "grid", gap: 10 }}>
			<div>
				<Mono>{node.paths.join("  |  ")}</Mono>
			</div>
			<div>
				<Subtle>allowed children</Subtle>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
					{node.children.length ? node.children.map((c) => <Badge key={c}>{c}</Badge>) : <Subtle>anything</Subtle>}
				</div>
			</div>
			<div>
				<Subtle>code roles this node gives a home to</Subtle>
				<div style={{ marginTop: 4 }}>
					{node.roles?.length ? node.roles.map((r) => <Badge key={r} color="#b48ef0">{r}</Badge>) : <Subtle>none</Subtle>}
				</div>
			</div>
			{node.files.length ? (
				<div>
					<Subtle>actual files ({node.fileCount})</Subtle>
					<div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
						{node.files.slice(0, 12).map((f) => (
							<Mono key={f} style={{ color: "#95a1b3" }}>
								{f}
							</Mono>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
};

import React from "react";
import styled from "styled-components";
import { Badge, Mono, Subtle } from "./ui";

const Row = styled.div`
	display: flex;
	align-items: center;
	gap: 7px;
	padding: 4px 8px 4px ${(p) => 8 + p.$depth * 18}px;
	border-radius: ${(p) => p.theme.radius.sm};
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
	color: ${(p) => (p.$file ? p.theme.color.text : p.theme.color.accent)};
`;

const Spacer = styled.span`
	flex: 1;
`;

const Count = styled.span`
	font-size: 11px;
	color: ${(p) => p.theme.color.textFaint};
	font-family: ${(p) => p.theme.font.mono};
`;

// One dot per ACTION the folder takes part in, in the same colour the arrow
// has on the Graph screen. That is how a reader carries the picture over.
const Dot = styled.span`
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: ${(p) => p.$color};
	flex: none;
`;

// A node may hang under several parents (`store.ts` under every feature); each
// parent gets its own path variant. Show the variant matching the row's parent.
const pathForParent = (node, parentSlug) => {
	const i = node.parents.indexOf(parentSlug);
	return (i >= 0 ? node.paths[i] : node.paths[0]) ?? node.paths[0];
};

export const TreeNode = ({ node, childrenByParent, depth = 0, expanded, onToggle, onSelect, selected, findingCounts = {}, parentSlug = null, kindFlags = {}, colors = {} }) => {
	const fixCount = findingCounts[node.slug] ?? 0;
	const open = expanded.has(node.slug);
	const kids = childrenByParent?.get(node.slug) ?? [];

	return (
		<div>
			<Row
				$depth={depth}
				$selected={selected === node.slug}
				onClick={() => {
					if (kids.length) onToggle(node.slug);
					onSelect?.(node.slug);
				}}
			>
				<Chevron $open={open}>{kids.length ? "▶" : ""}</Chevron>
				<Name $file={node.isFile}>{node.name}</Name>
				{(kindFlags[node.slug] ?? []).map((kind) => (
					<span key={kind} title={`takes part in \`${kind}\``} style={{ display: "inline-flex" }}>
						<Dot $color={colors[kind]} />
					</span>
				))}
				<Badge color={node.roles?.length ? "#b48ef0" : undefined}>{node.roles?.length ? node.roles.join(" · ") : "structure only"}</Badge>
				{node.closed ? <Badge color="#fbbf24">closed</Badge> : null}
				{node.fileCount ? <Count>{node.fileCount} {node.fileCount === 1 ? "file" : "files"}</Count> : null}
				{fixCount ? <Badge color="#ff6b6b">{fixCount}</Badge> : null}
				<Spacer />
				<Subtle>{pathForParent(node, parentSlug)}</Subtle>
			</Row>
			{open
				? kids
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

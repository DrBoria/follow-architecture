import React, { useState } from "react";
import styled from "styled-components";
import { Badge, CategoryBadge, Mono, Panel, Subtle } from "./ui";
import { categoryColor } from "../theme";

const Head = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 8px;
`;

const Heading = styled.h3`
	margin: 0;
	font-size: 14px;
	font-weight: 650;
	flex: 1;
	min-width: 220px;
`;

const Location = styled.button`
	background: ${(p) => p.theme.color.panelAlt};
	border: 1px solid ${(p) => p.theme.color.border};
	color: ${(p) => p.theme.color.accent};
	border-radius: ${(p) => p.theme.radius.sm};
	padding: 2px 8px;
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11.5px;
	cursor: pointer;
	&:hover { border-color: ${(p) => p.theme.color.borderStrong}; }
`;

const Block = styled.div`
	margin-top: 10px;
	padding: 10px 12px;
	border-radius: ${(p) => p.theme.radius.sm};
	background: ${(p) => p.$bg ?? "rgba(255,255,255,0.025)"};
	border: 1px solid ${(p) => p.$border ?? "transparent"};
	font-size: 13px;
`;

const Label = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
	margin-bottom: 4px;
`;

const ArrowRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12px;
`;

const Chip = styled.span`
	border: 1px solid ${(p) => p.$color}66;
	background: ${(p) => p.$color}1a;
	color: ${(p) => p.$color};
	border-radius: 6px;
	padding: 2px 7px;
`;

const Boundary = ({ boundary }) => (
	<Block $bg="rgba(255,107,107,0.07)" $border="rgba(255,107,107,0.3)">
		<Label>architecture boundary</Label>
		<ArrowRow>
			<Chip $color="#ff6b6b">{boundary.ownerNode ?? "?"} (this file)</Chip>
			<span>─✕→</span>
			<Chip $color="#fbbf24">{boundary.targetNode}</Chip>
		</ArrowRow>
		<div style={{ marginTop: 8, lineHeight: 1.6 }}>{boundary.summary}</div>
	</Block>
);

export const FindingCard = ({ finding }) => {
	const [open, setOpen] = useState(false);
	const accent = categoryColor(finding.category);

	return (
		<Panel $accent={accent} style={{ display: "block" }}>
			<Head>
				<CategoryBadge category={finding.category} />
				<Heading>{finding.title}</Heading>
				<Location onClick={() => setOpen((v) => !v)}>
					{finding.file}:{finding.line}
				</Location>
			</Head>

			<div style={{ color: "#c3ccd9" }}>{finding.message}</div>

			{finding.boundary ? <Boundary boundary={finding.boundary} /> : null}

			{finding.fix ? (
				<Block $bg="rgba(74,222,128,0.06)" $border="rgba(74,222,128,0.25)">
					<Label>how to fix</Label>
					{finding.fix}
				</Block>
			) : null}

			<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
				{finding.ownerNode ? <Badge color="#6ea8fe">node {finding.ownerNode}</Badge> : null}
				{finding.role ? <Badge color="#b48ef0">role {finding.role}</Badge> : null}
				{finding.invariant ? <Badge color="#56c8a8">invariant {finding.invariant}</Badge> : null}
				<Badge>{finding.rule}</Badge>
			</div>

			{open ? (
				<div style={{ marginTop: 10 }}>
					<Label>file</Label>
					<Mono style={{ color: "#95a1b3" }}>{finding.file}</Mono>
					{finding.violation ? (
						<div style={{ marginTop: 8 }}>
							<Label>engine reported</Label>
							<Badge color="#ff6b6b">
								{finding.violation.kind} → {finding.violation.targetNode}
							</Badge>
						</div>
					) : null}
					<div style={{ marginTop: 8 }}>
						<Subtle>rule key: </Subtle>
						<Mono>{finding.key}</Mono>
					</div>
				</div>
			) : null}
		</Panel>
	);
};

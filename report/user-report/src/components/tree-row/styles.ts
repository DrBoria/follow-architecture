"use strict";

// The tree row's styled pieces: one row per node, indented by depth, with the
// action dots, the role badge and the counts. Split from the component so the
// row's markup reads as one screen, not a style sheet.

import styled from "styled-components";

const Row = styled.div<{ $depth: number; $selected?: boolean }>`
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

const Chevron = styled.span<{ $open?: boolean }>`
	width: 13px;
	color: ${(p) => p.theme.color.textFaint};
	font-size: 10px;
	flex: none;
	transform: rotate(${(p) => (p.$open ? "90deg" : "0deg")});
	transition: transform 0.12s ease;
`;

const Name = styled.span<{ $file?: boolean }>`
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
const Dot = styled.span<{ $color?: string }>`
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: ${(p) => p.$color};
	flex: none;
`;

export { Row, Chevron, Name, Count, Dot };

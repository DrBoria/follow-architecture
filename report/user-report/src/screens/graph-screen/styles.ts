"use strict";

// The role screen's styled pieces: the two-column layout, the role list, the
// kind filter buttons (tinted with the arrow colour they filter), and the
// dashboard that spans the page under the panes.

import styled from "styled-components";

// Two independent columns, each of which may shrink below its content: the
// graph is a wide SVG, and without `minmax(0, …)` on BOTH sides its intrinsic
// width pushes the grid wider.
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

// The dashboard sits UNDER the two panes and spans the page: its cards are the
// role's own answers, not a sidebar.
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

const RoleRow = styled.div<{ $active?: boolean }>`
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

const KindButton = styled.button<{ $active?: boolean; $color?: string }>`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 3px 10px;
	border-radius: 999px;
	font-size: 11.5px;
	font-weight: 600;
	cursor: pointer;
	/* The button carries the colour of the arrows it filters — reading the legend
	   and reading the canvas is the same act. The active one is filled with that
	   colour, the rest keep it as a tint. */
	color: ${(p) => p.$color ?? p.theme.color.text};
	background: ${(p) => (p.$active ? `${p.$color}2e` : `${p.$color}14`)};
	border: 1px solid ${(p) => (p.$active ? `${p.$color}cc` : `${p.$color}55`)};
	&:hover { border-color: ${(p) => p.$color}; background: ${(p) => `${p.$color}24`}; }
`;

export { Layout, Cell, Dash, DashHead, RoleRow, Scroll, Bar, KindButton };

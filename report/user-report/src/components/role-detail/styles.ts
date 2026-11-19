"use strict";

// The role dashboard's styled cards: a dense grid of fit-content sections, the
// one-line boundary arrows (acting chip → glyph → target chips), and the prose
// quote/fix for the report template.

import styled from "styled-components";

// The role's answers are CARDS, not one tall column: each question is its own
// small block, and the whole set flows across the page.
const Dashboard = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
	/* Dense: a wide card pulls the next short card up into the hole it leaves. */
	grid-auto-flow: dense;
	gap: 14px;
	align-items: start;
	width: 100%;
	min-width: 0;
`;

const Section = styled.section<{ $wide?: boolean }>`
	display: grid;
	gap: 6px;
	align-content: start;
	background: ${(p) => p.theme.color.panel};
	border: 1px solid ${(p) => p.theme.color.border};
	border-radius: ${(p) => p.theme.radius.md};
	padding: ${(p) => p.theme.space(4)};
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;
	/* The card is as wide as its CONTENT, not as wide as the grid cell. */
	justify-self: start;
	width: fit-content;
	/* A card that needs room spans two columns when the grid has them. */
	${(p) => (p.$wide ? "@media (min-width: 700px) { grid-column: span 2; }" : "")}
`;

const Label = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
`;

// One boundary, ONE line, never painting outside the card: every part is
// shrinkable and every chip ellipsizes its text (the full text is in its title).
const Arrow = styled.div`
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 7px;
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12px;
	min-width: 0;
	max-width: 100%;

	/* The acting side is NOT shrunk: a short name is always readable, a long
	   list of roles is capped at 45% and ellipsized. */
	& > span:first-child {
		flex: 0 0 auto;
		min-width: 0;
		max-width: 45%;
	}
`;

// The arrow and its target travel together as flex items (no extra box).
const Link = styled.span`
	display: contents;
`;

const ArrowGlyph = styled.span`
	flex: none;
	white-space: nowrap;
	color: ${(p) => p.theme.color.textDim};
`;

// The right side may carry several chips: one line, each ellipsizing on its own.
const Targets = styled.span`
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 5px;
	flex: 1 1 auto;
	min-width: 0;
`;

const Chip = styled.span<{ $c: string }>`
	border: 1px solid ${(p) => `${p.$c}66`};
	background: ${(p) => `${p.$c}1a`};
	color: ${(p) => p.$c};
	border-radius: 6px;
	padding: 1px 7px;
	/* One line, ellipsized: a chip never wraps and never overflows the row. */
	min-width: 0;
	max-width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	box-sizing: border-box;
`;

// The finding message is prose, not a code snippet: a quote with room to breathe.
const Quote = styled.blockquote`
	margin: 0;
	padding: 8px 0 8px 12px;
	border-left: 2px solid ${(p) => p.theme.color.border};
	color: ${(p) => p.theme.color.text};
	font-size: 13px;
	line-height: 1.5;
	overflow-wrap: anywhere;
`;

const Fix = styled.div`
	font-size: 12.5px;
	line-height: 1.5;
	color: #8ce6a8;
	overflow-wrap: anywhere;
`;

export { Dashboard, Section, Label, Arrow, Link, ArrowGlyph, Targets, Chip, Quote, Fix };

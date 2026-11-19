"use strict";

// The before/after cards' styled pieces: a three-column row (now → arrow →
// after), tinted cards, and the mono labels inside them.

import styled from "styled-components";

const Row = styled.div`
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	gap: 10px;
	align-items: center;
`;

const Card = styled.div<{ $color: string }>`
	border: 1px solid ${(p) => p.$color}55;
	background: ${(p) => p.$color}12;
	border-radius: ${(p) => p.theme.radius.sm};
	padding: 9px 11px;
	min-width: 0;
`;

const CardTitle = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
	margin-bottom: 3px;
`;

const Node = styled.div<{ $color: string }>`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12.5px;
	color: ${(p) => p.$color};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const Path = styled.div`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11px;
	color: ${(p) => p.theme.color.textFaint};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const Arrow = styled.div<{ $color: string }>`
	font-size: 18px;
	color: ${(p) => p.$color};
	white-space: nowrap;
`;

export { Row, Card, CardTitle, Node, Path, Arrow };

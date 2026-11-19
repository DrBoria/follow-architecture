"use strict";

// The canvas's styled pieces: the viewport, the SVG (whose height is a CSS
// decision — a media query doubles it on a wide screen), the zoom bar, the
// places overlay, and the fullscreen preview.

import styled from "styled-components";

const Canvas = styled.div<{ $panning?: boolean }>`
	max-width: 100%;
	min-width: 0;
	overflow: hidden;
	touch-action: none;
	background: #0a0d13;
	border: 1px solid ${(p) => p.theme.color.border};
	border-radius: ${(p) => p.theme.radius.md};
	cursor: ${(p) => (p.$panning ? "grabbing" : "grab")};
`;

// The canvas height is a CSS decision, not a JS one: a media query doubles it on
// a wide screen, so the drawing grows with the page without a resize listener.
const GraphSvg = styled.svg<{ $h: number; $full?: boolean; $grow?: boolean }>`
	display: block;
	width: 100%;
	max-width: 100%;
	touch-action: none;
	height: ${(p) => (p.$full ? "100%" : `${Math.max(p.$h, 260)}px`)};
	${(p) =>
		p.$grow
			? `@media (min-width: 1200px) { height: ${p.$full ? "100%" : `${Math.max(p.$h * 2, 520)}px`}; }`
			: ""}
`;

const ZoomBar = styled.div`
	position: absolute;
	right: 8px;
	top: 8px;
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 2px;
	border-radius: ${(p) => p.theme.radius.md};
	border: 1px solid ${(p) => p.theme.color.border};
	background: rgba(10, 13, 19, 0.88);
	font-family: monospace;
	font-size: 11px;
	user-select: none;
`;

// The opened place list: an overlay ON the canvas, because the control that
// opens it lives on the canvas.
const PlacesPanel = styled.div`
	position: absolute;
	left: 10px;
	bottom: 10px;
	right: 10px;
	z-index: 3;
	max-height: 45%;
	overflow: auto;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 8px 12px;
	padding: 8px 10px;
	border: 1px solid ${(p) => p.theme.color.border};
	border-radius: 8px;
	background: rgba(11, 16, 23, 0.94);
	font-family: monospace;
	font-size: 11.5px;
	color: #c3ccd9;
`;

// Fullscreen preview: the SAME graph, the same state, drawn over the whole
// window. Not a second canvas — the drawing does not jump or re-layout.
const Overlay = styled.div`
	position: fixed;
	inset: 0;
	z-index: 50;
	display: flex;
	flex-direction: column;
	background: #070a10;
	padding: 12px;
	gap: 8px;
`;

// `color.subtle` is not a key of the theme (it never was): the interpolation
// resolved to undefined and styled-components appended nothing. Stating no
// colour here keeps that rendered output byte-for-byte unchanged.
const OverlayHead = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	font-family: monospace;
	font-size: 12px;
`;

const ZoomBtn = styled.button`
	width: 22px;
	height: 22px;
	border: 0;
	border-radius: 4px;
	background: transparent;
	color: ${(p) => p.theme.color.text};
	font: inherit;
	line-height: 1;
	cursor: pointer;
	&:hover { background: rgba(110, 168, 254, 0.18); }
	&:disabled { cursor: default; background: transparent; }
`;

// The percentage is a BUTTON too (click = fit again), so it sizes to its text.
const Pct = styled(ZoomBtn)`
	width: auto;
	min-width: 44px;
	padding: 0 6px;
`;

export { Canvas, GraphSvg, ZoomBar, PlacesPanel, Overlay, OverlayHead, ZoomBtn, Pct };

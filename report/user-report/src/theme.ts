import { createGlobalStyle } from "styled-components";

// The ONE theme object. Its shape is DERIVED here (`AppTheme`) and declared as
// styled-components' `DefaultTheme` below, so every styled template reads
// `p.theme.color.…` / `p.theme.space(…)` with the real types — no component
// re-declares the palette, and a key added here is typed everywhere at once.
export const theme = {
	color: {
		bg: "#0b0e14",
		panel: "#121722",
		panelAlt: "#161d2b",
		border: "#222c3c",
		borderStrong: "#31415a",
		text: "#d7dee8",
		textDim: "#95a1b3",
		textFaint: "#6b7788",
		accent: "#6ea8fe",
		structure: "#f0a35e",
		codeRole: "#b48ef0",
		invariant: "#56c8a8",
		danger: "#ff6b6b",
		ok: "#4ade80",
		warn: "#fbbf24",
	},
	font: {
		mono: "'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace",
		sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
	},
	radius: { sm: "6px", md: "10px", lg: "14px" },
	space: (n: number): string => `${n * 4}px`,
};

// The theme's own shape, derived from the ONE object above. Redeclaring each
// member with its DERIVED type (`AppTheme["…"]`) is what types `p.theme` in
// every styled template across the app (module augmentation — the library's
// documented hook). The members are restated, not copied: each reads its type
// from `AppTheme`, so a change to the object above flows through everywhere.
export type AppTheme = typeof theme;

declare module "styled-components" {
	export interface DefaultTheme {
		color: AppTheme["color"];
		font: AppTheme["font"];
		radius: AppTheme["radius"];
		space: AppTheme["space"];
	}
}

// One colour per ACTION KIND, assigned by the order the config declares them
// in — so `import`/`call`/`mutate`/`read` or `emit`/`dispatch` need no table here.
// The same map colours the arrows, the legend buttons and the tree markers.
const KIND_PALETTE = ["#6ea8fe", "#56c8a8", "#f0a35e", "#b48ef0", "#ffd166", "#f78c6c", "#7fdbca", "#ff9ecb"];

export const kindColors = (kinds: readonly string[] = []): Record<string, string> =>
	Object.fromEntries(kinds.map((kind, i) => [kind, KIND_PALETTE[i % KIND_PALETTE.length]]));

const CATEGORY_COLORS: Record<string, string> = {
	structure: theme.color.structure,
	codeRole: theme.color.codeRole,
	invariant: theme.color.invariant,
};

export const categoryColor = (category: string): string => CATEGORY_COLORS[category] ?? theme.color.accent;

export const GlobalStyle = createGlobalStyle`
	*, *::before, *::after { box-sizing: border-box; }
	html, body, #root { height: 100%; }
	body {
		margin: 0;
		background: ${(p) => p.theme.color.bg};
		color: ${(p) => p.theme.color.text};
		font-family: ${(p) => p.theme.font.sans};
		font-size: 14px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
	}
	code, pre { font-family: ${(p) => p.theme.font.mono}; }
	::selection { background: ${(p) => p.theme.color.accent}44; }
	::-webkit-scrollbar { width: 10px; height: 10px; }
	::-webkit-scrollbar-thumb { background: ${(p) => p.theme.color.borderStrong}; border-radius: 8px; }
	::-webkit-scrollbar-track { background: transparent; }
	button { font-family: inherit; }

	/* highlight.js tokens (only the grammars we ship) */
	.hljs { color: #c8d3e0; background: transparent; }
	.hljs-comment, .hljs-quote { color: #5f6b7d; font-style: italic; }
	.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section { color: #c792ea; }
	.hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute { color: #a5e075; }
	.hljs-number, .hljs-symbol, .hljs-bullet, .hljs-variable { color: #f78c6c; }
	.hljs-title, .hljs-title.class_, .hljs-title.function_, .hljs-name { color: #82aaff; }
	.hljs-type, .hljs-built_in, .hljs-class .hljs-title { color: #ffcb6b; }
	.hljs-attr, .hljs-property, .hljs-selector-attr { color: #7fdbca; }
	.hljs-meta, .hljs-tag { color: #89ddff; }
	.hljs-deletion { color: #ff6b6b; }
`;

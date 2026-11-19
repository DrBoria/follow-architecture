import React, { useMemo, type ReactNode } from "react";
import styled from "styled-components";
import { highlight } from "./highlight";
import type { MatchedRange } from "../../../../../entities/overview-summaries";

// The ✓ / ✗ framing colours, one table: a tone names its border, head
// background, head text and mark colour. An unnamed tone reads as neutral.
type ToneColors = { border: string; headBg: string; headText: string; mark: string };
const TONES: Record<string, ToneColors> = {
	bad: { border: "rgba(255,107,107,0.45)", headBg: "rgba(255,107,107,0.10)", headText: "#ff9a9a", mark: "#ff6b6b" },
	good: { border: "rgba(74,222,128,0.45)", headBg: "rgba(74,222,128,0.09)", headText: "#8ce6a8", mark: "#4ade80" },
};

const Frame = styled.div<{ $tone?: string }>`
	border: 1px solid ${(p) => TONES[p.$tone ?? ""]?.border ?? p.theme.color.border};
	border-radius: ${(p) => p.theme.radius.sm};
	background: #0a0d13;
	overflow: hidden;
`;

const Head = styled.div<{ $tone?: string }>`
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;
	background: ${(p) => TONES[p.$tone ?? ""]?.headBg ?? "rgba(255,255,255,0.03)"};
	border-bottom: 1px solid ${(p) => p.theme.color.border};
	font-size: 11.5px;
	font-family: ${(p) => p.theme.font.mono};
	color: ${(p) => TONES[p.$tone ?? ""]?.headText ?? p.theme.color.textDim};
`;

const Mark = styled.span<{ $tone?: string }>`
	font-weight: 700;
	color: ${(p) => TONES[p.$tone ?? ""]?.mark ?? "#6ea8fe"};
`;

const Pre = styled.pre<{ $max: string }>`
	margin: 0;
	padding: 10px 12px;
	overflow: auto;
	max-height: ${(p) => p.$max};
	font-size: 12.3px;
	line-height: 1.55;
	tab-size: 2;
`;

const Note = styled.div`
	padding: 6px 10px 8px;
	font-size: 12px;
	color: ${(p) => p.theme.color.textDim};
	border-top: 1px dashed ${(p) => p.theme.color.border};
`;

// A single highlighted snippet. `tone` drives the ✓ / ✗ framing used by the
// ESLint-style bad/good pairs. `matched` is a list of `{ from, to, why }` line
// ranges RELATIVE to the snippet's first line: those lines are tinted and
// titled with WHY they matched, so a role card shows the exact declarations
// its infer caught instead of an unmarked window of code.
type CodePanelProps = {
	title?: string | null;
	code?: string | null;
	lang?: string;
	tone?: string;
	note?: ReactNode;
	max?: string;
	mark?: ReactNode;
	matched?: MatchedRange[] | null;
};

// One highlighted line, tinted and titled when a matched range covers it.
const markedLine = (line: string, i: number, matched: readonly MatchedRange[]): string => {
	const hit = matched.find((r) => i >= r.from && i <= r.to);
	if (!hit) return line;
	return `<span class="fa-matched-line" title="${String(hit.why ?? "matched").replace(/"/g, "&quot;")}">${line}</span>`;
};

export const CodePanel = ({ title, code, lang = "typescript", tone, note, max = "320px", mark, matched = null }: CodePanelProps): React.JSX.Element => {
	const html = useMemo(() => {
		const highlighted = highlight(code ?? "", lang);
		if (!matched?.length) return highlighted;
		// highlight.js emits spans that never cross a line boundary, so splitting
		// the highlighted HTML on newlines keeps every line's markup intact.
		return highlighted.split("\n").map((line, i) => markedLine(line, i, matched)).join("\n");
	}, [code, lang, matched]);
	return (
		<Frame $tone={tone}>
			{title ? (
				<Head $tone={tone}>
					{tone ? <Mark $tone={tone}>{tone === "bad" ? "✗" : "✓"}</Mark> : null}
					<span>{title}</span>
				</Head>
			) : null}
			<Pre $max={max}>
				{/* The tint is a class, not a styled wrapper per line: the HTML is
				    injected as one string, so the rule lives in a <style> the panel
				    carries with it. */}
				{matched?.length ? (
					<style>{`.fa-matched-line{display:inline-block;min-width:100%;background:rgba(110,168,254,0.14);box-shadow:inset 3px 0 0 #6ea8fe;margin:0 -12px;padding:0 12px 0 9px;}`}</style>
				) : null}
				<code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
			</Pre>
			{note ? <Note>{note}</Note> : null}
			{mark}
		</Frame>
	);
};

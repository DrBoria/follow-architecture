import React, { useMemo } from "react";
import styled from "styled-components";
import { highlight } from "./highlight";

const Frame = styled.div`
	border: 1px solid ${(p) => (p.$tone === "bad" ? "rgba(255,107,107,0.45)" : p.$tone === "good" ? "rgba(74,222,128,0.45)" : p.theme.color.border)};
	border-radius: ${(p) => p.theme.radius.sm};
	background: #0a0d13;
	overflow: hidden;
`;

const Head = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;
	background: ${(p) => (p.$tone === "bad" ? "rgba(255,107,107,0.10)" : p.$tone === "good" ? "rgba(74,222,128,0.09)" : "rgba(255,255,255,0.03)")};
	border-bottom: 1px solid ${(p) => p.theme.color.border};
	font-size: 11.5px;
	font-family: ${(p) => p.theme.font.mono};
	color: ${(p) => (p.$tone === "bad" ? "#ff9a9a" : p.$tone === "good" ? "#8ce6a8" : p.theme.color.textDim)};
`;

const Mark = styled.span`
	font-weight: 700;
	color: ${(p) => (p.$tone === "bad" ? "#ff6b6b" : p.$tone === "good" ? "#4ade80" : "#6ea8fe")};
`;

const Pre = styled.pre`
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
export const CodePanel = ({ title, code, lang = "typescript", tone, note, max = "320px", mark, matched = null }) => {
	const html = useMemo(() => {
		const highlighted = highlight(code ?? "", lang);
		if (!matched?.length) return highlighted;
		// highlight.js emits spans that never cross a line boundary, so splitting
		// the highlighted HTML on newlines keeps every line's markup intact.
		const lines = highlighted.split("\n");
		return lines
			.map((line, i) => {
				const hit = matched.find((r) => i >= r.from && i <= r.to);
				if (!hit) return line;
				return `<span class="fa-matched-line" title="${String(hit.why ?? "matched").replace(/"/g, "&quot;")}">${line}</span>`;
			})
			.join("\n");
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

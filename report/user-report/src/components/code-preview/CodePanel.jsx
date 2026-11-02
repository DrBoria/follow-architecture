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
// ESLint-style bad/good pairs.
export const CodePanel = ({ title, code, lang = "typescript", tone, note, max = "320px", mark }) => {
	const html = useMemo(() => highlight(code ?? "", lang), [code, lang]);
	return (
		<Frame $tone={tone}>
			{title ? (
				<Head $tone={tone}>
					{tone ? <Mark $tone={tone}>{tone === "bad" ? "✗" : "✓"}</Mark> : null}
					<span>{title}</span>
				</Head>
			) : null}
			<Pre $max={max}>
				<code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
			</Pre>
			{note ? <Note>{note}</Note> : null}
			{mark}
		</Frame>
	);
};

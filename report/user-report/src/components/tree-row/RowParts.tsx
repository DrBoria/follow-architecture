"use strict";

// The tree row's small parts: the action dots (at most five, then a "+N"), the
// role badge, and the file/finding counts. Each is one named piece so the row
// component reads as a list of facts, not a wall of JSX.

import React from "react";
import { Badge } from "../ui";
import { Dot, Count } from "./styles";
import type { NodeSummary } from "../../../../../entities/overview-summaries";

// At most five dots: seven actions turned the row into a colour strip and left
// no room for the role name.
const MAX_DOTS = 5;

// One dot per action the folder takes part in, in the arrow's own colour.
const ActionDots = ({ kinds, colors }: { kinds: readonly string[]; colors: Record<string, string> }): React.JSX.Element => (
	<>
		{kinds.slice(0, MAX_DOTS).map((kind) => (
			<span key={kind} title={`takes part in \`${kind}\``} style={{ display: "inline-flex", flex: "none" }}>
				<Dot $color={colors[kind]} />
			</span>
		))}
		{kinds.length > MAX_DOTS ? (
			<span style={{ flex: "none", fontSize: 10, color: "#6b7788" }} title="more actions take part">
				+{kinds.length - MAX_DOTS}
			</span>
		) : null}
	</>
);

// The roles this node gives a home to — its own box so a long list ellipsizes
// instead of widening the row.
const RoleBadge = ({ roles }: { roles: readonly string[] }): React.JSX.Element => (
	<Badge
		nowrap
		title={roles.length ? roles.join(" · ") : "structure only"}
		color={roles.length ? "#b48ef0" : undefined}
		style={{ flex: "0 1 auto", minWidth: 0, maxWidth: 200 }}
	>
		<span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
			{roles.length ? roles.join(" · ") : "structure only"}
		</span>
	</Badge>
);

// The node's own counts: closed flag, files, findings.
const RowCounts = ({ node, fixCount }: { node: NodeSummary; fixCount: number }): React.JSX.Element => (
	<>
		{node.closed ? <Badge nowrap color="#fbbf24">closed</Badge> : null}
		{node.fileCount ? <Count>{node.fileCount} {node.fileCount === 1 ? "file" : "files"}</Count> : null}
		{fixCount ? <Badge nowrap color="#ff6b6b">{fixCount}</Badge> : null}
	</>
);

export { ActionDots, RoleBadge, RowCounts };

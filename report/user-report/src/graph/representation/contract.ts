"use strict";

// THE representation contract — one picture module per story kind. Every
// representation answers the same five questions (which story it handles, what
// the panel is titled, which boxes/arrows/marks the picture needs, and one
// caption sentence), so `graph/decision` picks one without knowing any kind.
//
// The picture's arrows are a DIAGRAM, not the access graph: they carry only
// what a drawing needs (from, to, the word on the line, broken/option flags).

import type { Story } from "../../../../../entities/story";
import type { AccessEdge } from "../../../../../entities/access-graph";
import type { Repair } from "../../../../../entities/repair";
import type { EnrichedFinding } from "../../../../../entities/enriched-finding";
import type { NodeSummary } from "../../../../../entities/overview-summaries";

// One arrow of the problem picture: the access-graph edge narrowed to what a
// drawing states (the pair, the word on the line, the verdict flags).
type ProblemEdge = Pick<AccessEdge, "from" | "to" | "kind" | "broken" | "option">;

// A box verdict: crossed out ("wrong") or ticked ("right").
type Mark = "wrong" | "right";

// A place the picture draws that the architecture tree has no node for (a file
// inside a folder): a move between two files of one folder is still a move.
type PlaceBox = { slug: string; name: string; paths: string[]; file: string; parents: string[]; children: string[] };

// What a representation builds: the arrows, the marks, and the optional
// overrides (which boxes to keep, extra boxes, per-box place/name/action words).
type Built = {
	edges?: ProblemEdge[];
	marks?: Record<string, Mark>;
	only?: string[];
	extra?: PlaceBox[];
	places?: Record<string, string[]>;
	rename?: Record<string, string>;
	action?: Record<string, string>;
};

// The scene every representation reads: the finding, its story, the node list,
// and the SAME options array the text prints.
type Scene = { finding: EnrichedFinding; story: Story; nodes: NodeSummary[]; options: Repair[] };

// One picture module: the same five questions for every story kind.
type Representation = {
	key: string;
	title: string;
	handles: (story: Story) => boolean;
	build: (scene: Scene) => Built;
	caption: (scene: Scene) => string;
};

export type { ProblemEdge, Mark, PlaceBox, Built, Scene, Representation };

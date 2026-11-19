"use strict";

// THE story — what a finding is ABOUT, as the decision maker
// (`errorTypes/decision-maker`) hands it to the two representations. The text
// reads `message`/`options`; the picture (`user-report/src/graph`) reads
// `type`/`from`/`to`/`target`/`actors`/`token`/`destinations`. One shape, so the
// sentence and the picture cannot disagree.
//
// Every type module produces its own story variant; the common fields are named
// here and each variant extends them. The fields are optional because a story
// may arrive partial (a token-only finding has no tree); readers qualify what
// they need through the shared field readers.

import type { RelationToken } from "./token";
import type { Repair } from "./repair";
import type { Place } from "./place";

// The place a story's target names: the box and the paths it covers (`Place`),
// plus whether the path is exact (a file) or a folder pattern.
type StoryTarget = Place & { exact: boolean };

// One destination the decision maker chose: where the code belongs, and how
// confident the decision is. The picture draws one arrow per destination.
type Destination = {
	role: string;
	node: string;
	path: string;
	confidence: number;
	tier: string;
	reason: string;
	signals: Record<string, number>;
	contributions: Record<string, number>;
	evidence: string[];
	thresholds: Record<string, number>;
	weights: Record<string, number>;
};

// The common story fields every type carries.
type StoryBase = {
	type: string;
	from: string | null;
	to: string[];
	destinations?: Destination[];
};

// A refused relation: the edge is wrong, the boxes are fine.
type WrongActionStory = StoryBase & {
	kind: string;
	line: number | null;
	target: StoryTarget;
	actors: string[];
	token: RelationToken | null;
};

// The code sits where it may not: one destination (move) or many (split).
type WrongPlacementStory = StoryBase & {
	shape: "move" | "split";
	invariant: string | null;
};

// Nothing declares this kind of code here.
type UnknownRoleStory = StoryBase;

// The finding judges the file's own contents.
type FileContentsStory = StoryBase;

type Story = WrongActionStory | WrongPlacementStory | UnknownRoleStory | FileContentsStory;

// The decision maker's full output: the story plus the wording and the repairs.
type Described = {
	type: string;
	label: string;
	story: Story;
	message: string | null;
	options: Repair[];
};

export type { StoryTarget, Destination, StoryBase, WrongActionStory, WrongPlacementStory, UnknownRoleStory, FileContentsStory, Story, Described };

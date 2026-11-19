"use strict";

// THE layout's data shapes — what a box, an arrow and a placed link are. The
// nodes and edges are the overview's own summaries (a folder box, a role box,
// or a problem-picture place box all carry the same core fields); the layout
// reads only what it places, never what a box MEANS.

import type { AccessEdge, RoleNode } from "../../../../../entities/access-graph";

// A box the layout places: the role-box core (slug/name/paths/places/note/
// fileCount) plus the optional lines a folder or problem box carries. DERIVED
// from the ONE role-box contract so the two cannot drift.
type LayoutNode = Partial<RoleNode> & Pick<RoleNode, "slug"> & { action?: string; parents?: string[] };

// An arrow the layout routes: the access-graph edge core plus the verdict flag
// the problem picture draws. The hover line reads the actor/subject fields when
// they are there (a declared edge carries them; a picture arrow does not).
type LayoutEdge = Pick<AccessEdge, "from" | "to" | "kind" | "kinds" | "scope" | "broken" | "actorPath" | "subjectPath" | "fromPath" | "toPath" | "same" | "actorRole" | "actorRoles">;

// One placed box: its rectangle in graph units.
type Box = { x: number; y: number; w: number; h: number };

// A point in graph units.
type Point = [number, number];

// One routed arrow: its edge, its corners, its SVG path, and (once placed) the
// label's centre-x and baseline-y.
type Link = { edge: LayoutEdge; kind: string; points: Point[]; path: string; lx?: number; ly?: number };

// A rectangle the occupancy grid tracks: the same shape as a placed box.
type Rect = Box;

export type { LayoutNode, LayoutEdge, Box, Point, Link, Rect };

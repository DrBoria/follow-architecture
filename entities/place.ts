"use strict";

// A PLACE — the box (node slug) and the paths it covers. The ONE shape every
// "where" answer carries: a story's target, a plan's before/after, a repair's
// destination. Named once so the readers never re-spell `{ node, paths }`.

type Place = { node: string | null; paths: string[] };

export type { Place };

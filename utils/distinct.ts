"use strict";

// A DISTINCT COLLECT is one mechanism: every item of a list contributes names
// (zero, one, or many), and the answer is the names in first-seen order, each
// once. A component's props are the distinct names its parameters contribute
// (`frameworks/react`); an entity's shape is the distinct roles its children
// declare (`nodes/similar`). The walk is the same — flatMap the contributions,
// keep the first of each — so it lives here once. What a name IS and where it
// comes from is the caller's own.

const distinctFlat = <T>(items: readonly T[], namesOf: (item: T) => readonly string[]): string[] => [...new Set(items.flatMap(namesOf))];

export { distinctFlat };
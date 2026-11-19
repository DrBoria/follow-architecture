# Entity similarity report

Scanned 130 file(s), found 66 entities.

Found 1 duplicate pair(s), 6 extraction candidate pair(s), and 2 weakly-similar pair(s).

## High-confidence duplicates (confidence ≥ duplicate threshold) (1)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `duplicate:report/user-report/src/graph/representation/wrongAction.js#wrongAction=>report/user-report/src/graph/representation/wrongPlacement.js#wrongPlacement` | wrongAction | `report/user-report/src/graph/representation/wrongAction.js:10` | wrongPlacement | `report/user-report/src/graph/representation/wrongPlacement.js:6` | 0.92 | Properties | Replace `wrongAction` with `wrongPlacement` from `report/user-report/src/graph/representation/wrongPlacement.js` — they are the same shape. |

### Why each one matched

- **wrongAction** — `wrongAction` repeats `wrongPlacement` — 0.92 (92%) confidence that these are the same shape.
  scores  Properties 100%
  Properties  100%  6/6 shared agree in type  (6↔6 properties)
    shared  key: string, title: string, handles: function, edges: object, marks: object, caption: function
  **Fix** — Replace `wrongAction` with `wrongPlacement` from `report/user-report/src/graph/representation/wrongPlacement.js` — they are the same shape.

## Strong extraction candidates (extract ≤ confidence < duplicate) (6)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `extract:report/user-report/src/graph/representation/fileContents.js#VERB=>report/user-report/src/graph/representation/fileContents.js#what` | VERB | `report/user-report/src/graph/representation/fileContents.js:14` | what | `report/user-report/src/graph/representation/fileContents.js:115` | 0.78 | Properties | Extract a shared type for the shared members and have both `VERB` and `what` use it. |
| `extract:report/user-report/src/graph/representation/fileContents.js#fileContents=>report/user-report/src/graph/representation/unknownRole.js#unknownRole` | fileContents | `report/user-report/src/graph/representation/fileContents.js:28` | unknownRole | `report/user-report/src/graph/representation/unknownRole.js:4` | 0.72 | Properties | Extract a shared type for the shared members and have both `fileContents` and `unknownRole` use it. |
| `extract:report/user-report/src/graph/representation/unknownRole.js#unknownRole=>report/user-report/src/graph/representation/wrongPlacement.js#wrongPlacement` | unknownRole | `report/user-report/src/graph/representation/unknownRole.js:4` | wrongPlacement | `report/user-report/src/graph/representation/wrongPlacement.js:6` | 0.65 | Properties | Extract a shared type for the shared members and have both `unknownRole` and `wrongPlacement` use it. |
| `extract:report/user-report/src/graph/representation/unknownRole.js#unknownRole=>report/user-report/src/graph/representation/wrongAction.js#wrongAction` | unknownRole | `report/user-report/src/graph/representation/unknownRole.js:4` | wrongAction | `report/user-report/src/graph/representation/wrongAction.js:10` | 0.64 | Properties | Extract a shared type for the shared members and have both `unknownRole` and `wrongAction` use it. |
| `extract:report/user-report/src/graph/representation/fileContents.js#fileContents=>report/user-report/src/graph/representation/wrongPlacement.js#wrongPlacement` | fileContents | `report/user-report/src/graph/representation/fileContents.js:28` | wrongPlacement | `report/user-report/src/graph/representation/wrongPlacement.js:6` | 0.60 | Properties | Extract a shared type for the shared members and have both `fileContents` and `wrongPlacement` use it. |
| `extract:report/user-report/src/graph/representation/fileContents.js#fileContents=>report/user-report/src/graph/representation/wrongAction.js#wrongAction` | fileContents | `report/user-report/src/graph/representation/fileContents.js:28` | wrongAction | `report/user-report/src/graph/representation/wrongAction.js:10` | 0.59 | Properties | Extract a shared type for the shared members and have both `fileContents` and `wrongAction` use it. |

### Why each one matched

- **VERB** — `VERB` and `what` share a large part of their shape — 0.78 (78%). A shared type is worth extracting.
  scores  Properties 91%  ·  Values 0%
  Properties  91%  6/6 shared agree in type  (7↔6 properties)
    shared  move: string, split: string, rewrite: string, merge: string, add: string, role: string
    only A  remove
  Values  0%  6 value path(s) compared
    ≠ move: move ↔ moved
    ≠ split: split ↔ split into the parts it is made of
    ≠ rewrite: rewrite ↔ rewritten where it stands
    ≠ merge: merge ↔ merged into the file it duplicates
    ≠ add: create ↔ created
    ≠ role: declare ↔ not declared as any kind of code — give it its kind, or delete it
    only A  remove
  **Fix** — Extract a shared type for the shared members and have both `VERB` and `what` use it.
- **fileContents** — `fileContents` and `unknownRole` share a large part of their shape — 0.72 (72%). A shared type is worth extracting.
  scores  Properties 84%
  Properties  84%  5/6 shared agree in type  (7↔6 properties)
    shared  key: string, title: string, handles: function, edges: never[], caption: function
    type differs  marks: {} ≠ {[x:number]:string}
    only A  only
  **Fix** — Extract a shared type for the shared members and have both `fileContents` and `unknownRole` use it.
- **unknownRole** — `unknownRole` and `wrongPlacement` share a large part of their shape — 0.65 (65%). A shared type is worth extracting.
  scores  Properties 75%
  Properties  75%  4/6 shared agree in type  (6↔6 properties)
    shared  key: string, title: string, handles: function, caption: function
    type differs  edges: never[] ≠ object, marks: {[x:number]:string} ≠ object
  **Fix** — Extract a shared type for the shared members and have both `unknownRole` and `wrongPlacement` use it.
- **unknownRole** — `unknownRole` and `wrongAction` share a large part of their shape — 0.64 (64%). A shared type is worth extracting.
  scores  Properties 75%
  Properties  75%  4/6 shared agree in type  (6↔6 properties)
    shared  key: string, title: string, handles: function, caption: function
    type differs  edges: never[] ≠ object, marks: {[x:number]:string} ≠ object
  **Fix** — Extract a shared type for the shared members and have both `unknownRole` and `wrongAction` use it.
- **fileContents** — `fileContents` and `wrongPlacement` share a large part of their shape — 0.60 (60%). A shared type is worth extracting.
  scores  Properties 69%
  Properties  69%  4/6 shared agree in type  (7↔6 properties)
    shared  key: string, title: string, handles: function, caption: function
    type differs  edges: never[] ≠ object, marks: {} ≠ object
    only A  only
  **Fix** — Extract a shared type for the shared members and have both `fileContents` and `wrongPlacement` use it.
- **fileContents** — `fileContents` and `wrongAction` share a large part of their shape — 0.59 (59%). A shared type is worth extracting.
  scores  Properties 69%
  Properties  69%  4/6 shared agree in type  (7↔6 properties)
    shared  key: string, title: string, handles: function, caption: function
    type differs  edges: never[] ≠ object, marks: {} ≠ object
    only A  only
  **Fix** — Extract a shared type for the shared members and have both `fileContents` and `wrongAction` use it.

## Weak similarity (similar ≤ confidence < extract) (2)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `similar:report/user-report/src/components/AccessGraph.jsx#GLYPH=>report/user-report/src/graph/representation/fileContents.js#what` | GLYPH | `report/user-report/src/components/AccessGraph.jsx:149` | what | `report/user-report/src/graph/representation/fileContents.js:115` | 0.45 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/components/AccessGraph.jsx#GLYPH=>report/user-report/src/graph/representation/fileContents.js#VERB` | GLYPH | `report/user-report/src/components/AccessGraph.jsx:149` | VERB | `report/user-report/src/graph/representation/fileContents.js:14` | 0.40 | Properties | No action needed beyond the note. |

### Why each one matched

- **GLYPH** — `GLYPH` looks like `what`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 53%  ·  Values 0%
  Properties  53%  4/4 shared agree in type  (7↔6 properties)
    shared  split: string, rewrite: string, merge: string, move: string
    only A  delete, declare, create
    only B  add, role
  Values  0%  4 value path(s) compared
    ≠ split: ⑂ ↔ split into the parts it is made of
    ≠ rewrite: ✎ ↔ rewritten where it stands
    ≠ merge: ⊕ ↔ merged into the file it duplicates
    ≠ move: → ↔ moved
    only A  delete, declare, create
    only B  add, role
  **Fix** — No action needed beyond the note.
- **GLYPH** — `GLYPH` looks like `VERB`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 47%  ·  Values 0%
  Properties  47%  4/4 shared agree in type  (7↔7 properties)
    shared  split: string, rewrite: string, merge: string, move: string
    only A  delete, declare, create
    only B  remove, add, role
  Values  0%  4 value path(s) compared
    ≠ split: ⑂ ↔ split
    ≠ rewrite: ✎ ↔ rewrite
    ≠ merge: ⊕ ↔ merge
    ≠ move: → ↔ move
    only A  delete, declare, create
    only B  remove, add, role
  **Fix** — No action needed beyond the note.

## Cross-file copies (3)

### VERB · what

2 entities describe the same shape across files. Nothing shared exists yet, so the fix is one shared type — weakest link 0.78 (78%).

| Entity | Location | Kind |
| --- | --- | --- |
| VERB | `report/user-report/src/graph/representation/fileContents.js:14` | object |
| what | `report/user-report/src/graph/representation/fileContents.js:115` | object |

**Fix** — Extract a shared type for the shared members and have both `VERB` and `what` use it.

### fileContents · unknownRole

2 entities describe the same shape across files. Nothing shared exists yet, so the fix is one shared type — weakest link 0.72 (72%).

| Entity | Location | Kind |
| --- | --- | --- |
| fileContents | `report/user-report/src/graph/representation/fileContents.js:28` | object |
| unknownRole | `report/user-report/src/graph/representation/unknownRole.js:4` | object |

**Fix** — Extract a shared type for the shared members and have both `fileContents` and `unknownRole` use it.

### wrongAction · wrongPlacement

2 entities describe the same shape across files. Nothing shared exists yet, so the fix is one shared type — weakest link 0.92 (92%).

| Entity | Location | Kind |
| --- | --- | --- |
| wrongAction | `report/user-report/src/graph/representation/wrongAction.js:10` | object |
| wrongPlacement | `report/user-report/src/graph/representation/wrongPlacement.js:6` | object |

**Fix** — Extract a shared type for the shared members and have both `wrongAction` and `wrongPlacement` use it.

## Duplicate trees (3)

### Duplicates of VERB

- VERB `report/user-report/src/graph/representation/fileContents.js:14`
  - what `report/user-report/src/graph/representation/fileContents.js:115`
### Duplicates of SCREENS

- SCREENS `report/user-report/src/App.jsx:10`
  - counters `report/user-report/src/components/Shell.jsx:81`
### Duplicates of fileContents

- fileContents `report/user-report/src/graph/representation/fileContents.js:28`
  - unknownRole `report/user-report/src/graph/representation/unknownRole.js:4`
  - wrongAction `report/user-report/src/graph/representation/wrongAction.js:10`
  - wrongPlacement `report/user-report/src/graph/representation/wrongPlacement.js:6`

## Shared-entity candidates (5)

- **wrongAction** `report/user-report/src/graph/representation/wrongAction.js:10` ↔ **wrongPlacement** `report/user-report/src/graph/representation/wrongPlacement.js:6` (1)
  - shared: key, title, handles, edges, marks, caption — extract a shared type for key, title, handles, edges, marks, caption
- **unknownRole** `report/user-report/src/graph/representation/unknownRole.js:4` ↔ **wrongAction** `report/user-report/src/graph/representation/wrongAction.js:10` (0.75)
  - shared: key, title, handles, edges, marks, caption — extract a shared type for key, title, handles, edges, marks, caption
- **unknownRole** `report/user-report/src/graph/representation/unknownRole.js:4` ↔ **wrongPlacement** `report/user-report/src/graph/representation/wrongPlacement.js:6` (0.75)
  - shared: key, title, handles, edges, marks, caption — extract a shared type for key, title, handles, edges, marks, caption
- **GLYPH** `report/user-report/src/components/AccessGraph.jsx:149` ↔ **what** `report/user-report/src/graph/representation/fileContents.js:115` (0.533)
  - shared: split, rewrite, merge, move — extract a shared type for split, rewrite, merge, move
- **best** `entities/ast/depth.js:33` ↔ **out** `entities/ast/depth.js:52` (0.347)
  - shared: depth, chain — extract a shared type for depth, chain

## Refactor suggestions (3)

- **shared-type** — 2 entities share only properties (move, split, rewrite, merge, add, role) — extract a shared type/interface for the common fields.
  - entities: VERB, what
  - members: move, split, rewrite, merge, add, role
- **shared-type** — 2 entities share only properties (key, title, handles, edges, marks, caption) — extract a shared type/interface for the common fields.
  - entities: fileContents, unknownRole
  - members: key, title, handles, edges, marks, caption
- **shared-type** — 2 entities share only properties (key, title, handles, edges, marks, caption) — extract a shared type/interface for the common fields.
  - entities: wrongAction, wrongPlacement
  - members: key, title, handles, edges, marks, caption

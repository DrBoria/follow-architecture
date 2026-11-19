# Entity similarity report

Scanned 309 file(s), found 420 entities.

Found 1 duplicate pair(s), 10 extraction candidate pair(s), and 88 weakly-similar pair(s) (after filtering out 1 match(es)).

## High-confidence duplicates (confidence ≥ duplicate threshold) (1)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `duplicate:entities/structure-facts.ts#StructureFacts=>tests/report/errorTypes.test.ts#facts` | StructureFacts | `entities/structure-facts.ts:8` | facts | `tests/report/errorTypes.test.ts:154` | 0.86 | Properties | Replace `StructureFacts` with `facts` from `tests/report/errorTypes.test.ts` — they are the same shape. |

### Why each one matched

- **StructureFacts** — `StructureFacts` repeats `facts` — 0.86 (86%) confidence that these are the same shape.
  scores  Properties 93%
  Properties  93%  8/8 shared agree in type  (8↔9 properties)
    shared  asDir: boolean?, dest: string?, duplicate: string?, homeHere: string[]?, roles: string[]?, held: string[]?, named: string?, seen: string?
    only B  basename
  **Fix** — Replace `StructureFacts` with `facts` from `tests/report/errorTypes.test.ts` — they are the same shape.

## Strong extraction candidates (extract ≤ confidence < duplicate) (10)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `extract:tests/report/access-graph.test.ts#a=>tests/report/access-graph.test.ts#b` | a | `tests/report/access-graph.test.ts:188` | b | `tests/report/access-graph.test.ts:189` | 0.85 | Properties | Extract a shared type for the shared members and have both `a` and `b` use it. |
| `extract:entities/access-graph.ts#RoleNode=>tests/report/access-graph.test.ts#a` | RoleNode | `entities/access-graph.ts:57` | a | `tests/report/access-graph.test.ts:188` | 0.56 | Properties | Extract a shared type for the shared members and have both `RoleNode` and `a` use it. |
| `extract:entities/access-graph.ts#RoleNode=>tests/report/access-graph.test.ts#b` | RoleNode | `entities/access-graph.ts:57` | b | `tests/report/access-graph.test.ts:189` | 0.56 | Properties | Extract a shared type for the shared members and have both `RoleNode` and `b` use it. |
| `extract:entities/facts.ts#Leaf=>tests/entities/queries.test.ts#item` | Leaf | `entities/facts.ts:226` | item | `tests/entities/queries.test.ts:43` | 0.54 | Properties | Extract a shared type for the shared members and have both `Leaf` and `item` use it. |
| `extract:entities/overview-summaries.ts#InvariantSummary=>tests/invariants/invariants.test.ts#inv` | InvariantSummary | `entities/overview-summaries.ts:69` | inv | `tests/invariants/invariants.test.ts:26` | 0.51 | Properties | Extract a shared type for the shared members and have both `InvariantSummary` and `inv` use it. |
| `extract:entities/decision-ctx.ts#Places=>tests/report/errorTypes.test.ts#places` | Places | `entities/decision-ctx.ts:19` | places | `tests/report/errorTypes.test.ts:38` | 0.50 | Properties | Extract a shared type for the shared members and have both `Places` and `places` use it. |
| `extract:report/user-report/src/graph/representation/contract.ts#PlaceBox=>tests/report/access-graph.test.ts#a` | PlaceBox | `report/user-report/src/graph/representation/contract.ts:26` | a | `tests/report/access-graph.test.ts:188` | 0.50 | Properties | Extract a shared type for the shared members and have both `PlaceBox` and `a` use it. |
| `extract:report/user-report/src/graph/representation/contract.ts#PlaceBox=>tests/report/access-graph.test.ts#b` | PlaceBox | `report/user-report/src/graph/representation/contract.ts:26` | b | `tests/report/access-graph.test.ts:189` | 0.50 | Properties | Extract a shared type for the shared members and have both `PlaceBox` and `b` use it. |
| `extract:tests/invariants/invariants.test.ts#inv=>tests/invariants/invariants.test.ts#inv2` | inv | `tests/invariants/invariants.test.ts:26` | inv2 | `tests/invariants/invariants.test.ts:62` | 0.50 | Properties | Extract a shared type for the shared members and have both `inv` and `inv2` use it. |
| `extract:tests/invariants/invariants.test.ts#inv=>tests/invariants/invariants.test.ts#inv3` | inv | `tests/invariants/invariants.test.ts:26` | inv3 | `tests/invariants/invariants.test.ts:65` | 0.50 | Properties | Extract a shared type for the shared members and have both `inv` and `inv3` use it. |

### Why each one matched

- **a** — `a` and `b` share a large part of their shape — 0.85 (85%). A shared type is worth extracting.
  scores  Properties 100%  ·  Values 29%
  Properties  100%  5/5 shared agree in type  (5↔5 properties)
    shared  slug: string, name: string, paths: string[], fileCount: number, parents: undefined[]
  Values  29%  4 value path(s) compared
    shared  fileCount = 1
    ≠ slug: store ↔ actions
    ≠ name: store.ts ↔ actions
    ≠ paths[0]: src/store.ts ↔ src/actions
  **Fix** — Extract a shared type for the shared members and have both `a` and `b` use it.
- **RoleNode** — `RoleNode` and `a` share a large part of their shape — 0.56 (56%). A shared type is worth extracting.
  scores  Properties 66%
  Properties  66%  4/4 shared agree in type  (6↔5 properties)
    shared  slug: string, name: string, paths: string[], fileCount: number
    only A  places, note
    only B  parents
  **Fix** — Extract a shared type for the shared members and have both `RoleNode` and `a` use it.
- **RoleNode** — `RoleNode` and `b` share a large part of their shape — 0.56 (56%). A shared type is worth extracting.
  scores  Properties 66%
  Properties  66%  4/4 shared agree in type  (6↔5 properties)
    shared  slug: string, name: string, paths: string[], fileCount: number
    only A  places, note
    only B  parents
  **Fix** — Extract a shared type for the shared members and have both `RoleNode` and `b` use it.
- **Leaf** — `Leaf` and `item` share a large part of their shape — 0.54 (54%). A shared type is worth extracting.
  scores  Properties 64%
  Properties  64%  2/2 shared agree in type  (5↔2 properties)
    shared  segments: string[], exts: string[]
    only A  path, fileName, words
  **Fix** — Extract a shared type for the shared members and have both `Leaf` and `item` use it.
- **InvariantSummary** — `InvariantSummary` and `inv` share a large part of their shape — 0.51 (51%). A shared type is worth extracting.
  scores  Properties 58%
  Properties  58%  3/4 shared agree in type  (9↔4 properties)
    shared  id: string, where: string[], report: string?
    type differs  infer: InvariantRule[] ≠ {lines:{gt:number}}[]
    only A  node, ignore, when, dedupeBy, findingCount
  **Fix** — Extract a shared type for the shared members and have both `InvariantSummary` and `inv` use it.
- **Places** — `Places` and `places` share a large part of their shape — 0.50 (50%). A shared type is worth extracting.
  scores  Properties 41%
  Properties  41%  0/5 shared agree in type  (7↔5 properties)
    type differs  pathOf: fn<string>:string ≠ function, roles: fn<>:string[] ≠ function, rolesAtPath: fn<string>:string[] ≠ function, homeTemplates: fn<string>:string[] ≠ function, homeFor: fn<string,string>:{ role: string; path: string; folder: boolean; concrete: boolean; node: string; } ≠ function
    only A  folderOf, nodeAtPath
  **Fix** — Extract a shared type for the shared members and have both `Places` and `places` use it.
- **PlaceBox** — `PlaceBox` and `a` share a large part of their shape — 0.50 (50%). A shared type is worth extracting.
  scores  Properties 58%
  Properties  58%  3/4 shared agree in type  (6↔5 properties)
    shared  slug: string, name: string, paths: string[]
    type differs  parents: string[] ≠ undefined[]
    only A  file, children
    only B  fileCount
  **Fix** — Extract a shared type for the shared members and have both `PlaceBox` and `a` use it.
- **PlaceBox** — `PlaceBox` and `b` share a large part of their shape — 0.50 (50%). A shared type is worth extracting.
  scores  Properties 58%
  Properties  58%  3/4 shared agree in type  (6↔5 properties)
    shared  slug: string, name: string, paths: string[]
    type differs  parents: string[] ≠ undefined[]
    only A  file, children
    only B  fileCount
  **Fix** — Extract a shared type for the shared members and have both `PlaceBox` and `b` use it.
- **inv** — `inv` and `inv2` share a large part of their shape — 0.50 (50%). A shared type is worth extracting.
  scores  Properties 52%  ·  Values 11%
  Properties  52%  1/2 shared agree in type  (4↔2 properties)
    shared  id: string
    type differs  infer: {lines:{gt:number}}[] ≠ {scopeChains:{any:{chain:{contains:string}}}}[]
    only A  where, report
  Values  11%  2 value path(s) compared
    shared  id = x
    ≠ infer[0].lines.gt: 0 ↔ undefined
    only A  where, report
  **Fix** — Extract a shared type for the shared members and have both `inv` and `inv2` use it.
- **inv** — `inv` and `inv3` share a large part of their shape — 0.50 (50%). A shared type is worth extracting.
  scores  Properties 52%  ·  Values 11%
  Properties  52%  1/2 shared agree in type  (4↔2 properties)
    shared  id: string
    type differs  infer: {lines:{gt:number}}[] ≠ {scopeChains:{any:{via:{equals:string}}}}[]
    only A  where, report
  Values  11%  2 value path(s) compared
    shared  id = x
    ≠ infer[0].lines.gt: 0 ↔ undefined
    only A  where, report
  **Fix** — Extract a shared type for the shared members and have both `inv` and `inv3` use it.

## Weak similarity (similar ≤ confidence < extract) (89)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `similar:entities/access-graph.ts#Unplaceable=>report/user-report/src/components/access-graph/NodeBox.tsx#Loop` | Unplaceable | `entities/access-graph.ts:39` | Loop | `report/user-report/src/components/access-graph/NodeBox.tsx:31` | 0.50 | Properties | No action needed beyond the note. |
| `dropped:code-roles/roles.ts#ACTION_KEYS=>entities/architecture.ts#ActionDef` | ACTION_KEYS | `code-roles/roles.ts:93` | ActionDef | `entities/architecture.ts:68` | 0.50 | Properties | No action needed beyond the note. |
| `similar:entities/location.ts#Resolved=>report/asks.ts#MoveAsk` | Resolved | `entities/location.ts:74` | MoveAsk | `report/asks.ts:33` | 0.49 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/theme.ts#theme=>report/user-report/src/theme.ts#DefaultTheme` | theme | `report/user-report/src/theme.ts:7` | DefaultTheme | `report/user-report/src/theme.ts:41` | 0.49 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#BindingFact=>entities/facts.ts#ConstructorParam` | BindingFact | `entities/facts.ts:108` | ConstructorParam | `entities/facts.ts:139` | 0.49 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Arch=>tests/code-roles/connector.test.ts#arch` | Arch | `entities/architecture.ts:169` | arch | `tests/code-roles/connector.test.ts:38` | 0.49 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchChild=>entities/architecture.ts#RawChildSpec` | ArchChild | `entities/architecture.ts:123` | RawChildSpec | `entities/architecture.ts:185` | 0.49 | Properties | No action needed beyond the note. |
| `similar:entities/overview-data.ts#OverviewMeta=>entities/overview.ts#OverviewInput` | OverviewMeta | `entities/overview-data.ts:20` | OverviewInput | `entities/overview.ts:20` | 0.48 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#Unplaceable=>entities/access-graph.ts#Mention` | Unplaceable | `entities/access-graph.ts:39` | Mention | `entities/access-graph.ts:43` | 0.48 | Properties | No action needed beyond the note. |
| `similar:entities/overview-summaries.ts#NodeSummary=>tests/report/access-graph.test.ts#a` | NodeSummary | `entities/overview-summaries.ts:49` | a | `tests/report/access-graph.test.ts:188` | 0.48 | Properties | No action needed beyond the note. |
| `similar:tests/code-roles/connector.test.ts#arch=>tests/report/overview.test.ts#ARCH` | arch | `tests/code-roles/connector.test.ts:38` | ARCH | `tests/report/overview.test.ts:14` | 0.48 | Properties | No action needed beyond the note. |
| `similar:tests/finally-follow-architecture/writes.test.ts#ARCH=>tests/report/overview.test.ts#ARCH` | ARCH | `tests/finally-follow-architecture/writes.test.ts:55` | ARCH | `tests/report/overview.test.ts:14` | 0.48 | Properties | No action needed beyond the note. |
| `similar:tests/report/access-graph.test.ts#arch=>tests/report/overview.test.ts#ARCH` | arch | `tests/report/access-graph.test.ts:40` | ARCH | `tests/report/overview.test.ts:14` | 0.48 | Properties | No action needed beyond the note. |
| `similar:tests/report/overview.test.ts#ARCH=>tests/report/role-example-marks.test.ts#ARCH` | ARCH | `tests/report/overview.test.ts:14` | ARCH | `tests/report/role-example-marks.test.ts:18` | 0.48 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchNode=>entities/architecture.ts#RawNode` | ArchNode | `entities/architecture.ts:138` | RawNode | `entities/architecture.ts:197` | 0.47 | Properties | No action needed beyond the note. |
| `similar:entities/overview-summaries.ts#NodeSummary=>tests/report/access-graph.test.ts#b` | NodeSummary | `entities/overview-summaries.ts:49` | b | `tests/report/access-graph.test.ts:189` | 0.47 | Properties | No action needed beyond the note. |
| `similar:entities/overview-data.ts#CountGroup=>utils/count.ts#Count` | CountGroup | `entities/overview-data.ts:18` | Count | `utils/count.ts:10` | 0.47 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#WhereEntry=>entities/architecture.ts#RoleHome` | WhereEntry | `entities/architecture.ts:49` | RoleHome | `entities/architecture.ts:106` | 0.46 | Properties | No action needed beyond the note. |
| `similar:report/render-report.ts#TextFinding=>report/user-report/data/finding-title.ts#TitleArgs` | TextFinding | `report/render-report.ts:16` | TitleArgs | `report/user-report/data/finding-title.ts:22` | 0.46 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>entities/overview-summaries.ts#InvariantSummary` | Invariant | `entities/architecture.ts:86` | InvariantSummary | `entities/overview-summaries.ts:69` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/decision-ctx.ts#CtxPlan=>entities/enriched-finding.ts#Plan` | CtxPlan | `entities/decision-ctx.ts:30` | Plan | `entities/enriched-finding.ts:18` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/overview-summaries.ts#NodeSummary=>report/user-report/src/graph/representation/contract.ts#PlaceBox` | NodeSummary | `entities/overview-summaries.ts:49` | PlaceBox | `report/user-report/src/graph/representation/contract.ts:26` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/ast/file-facts.ts#CollectOptions=>utils/imports.ts#ResolveContext` | CollectOptions | `entities/ast/file-facts.ts:20` | ResolveContext | `utils/imports.ts:97` | 0.45 | Properties | No action needed beyond the note. |
| `similar:tests/invariants/invariants.test.ts#inv=>tests/invariants/invariants.test.ts#perCandidate` | inv | `tests/invariants/invariants.test.ts:26` | perCandidate | `tests/invariants/invariants.test.ts:116` | 0.45 | Properties | No action needed beyond the note. |
| `similar:tests/code-roles/classify.test.ts#hostFile=>tests/code-roles/classify.test.ts#plainFile` | hostFile | `tests/code-roles/classify.test.ts:165` | plainFile | `tests/code-roles/classify.test.ts:166` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#MemberFact=>entities/facts.ts#BindingFact` | MemberFact | `entities/facts.ts:22` | BindingFact | `entities/facts.ts:108` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>frameworks/facet.ts#FacetContext` | FileContext | `entities/context.ts:18` | FacetContext | `frameworks/facet.ts:22` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/location.ts#Resolved=>entities/story.ts#Destination` | Resolved | `entities/location.ts:74` | Destination | `entities/story.ts:24` | 0.45 | Properties | No action needed beyond the note. |
| `similar:report/user-report/shared/describe.ts#DescribeOptions=>report/user-report/shared/describe.ts#Walk` | DescribeOptions | `report/user-report/shared/describe.ts:26` | Walk | `report/user-report/shared/describe.ts:30` | 0.45 | Properties | No action needed beyond the note. |
| `similar:tests/invariants/invariants.test.ts#inv=>tests/invariants/invariants.test.ts#or` | inv | `tests/invariants/invariants.test.ts:26` | or | `tests/invariants/invariants.test.ts:136` | 0.45 | Properties | No action needed beyond the note. |
| `similar:tests/invariants/invariants.test.ts#inv=>tests/invariants/invariants.test.ts#xor` | inv | `tests/invariants/invariants.test.ts:26` | xor | `tests/invariants/invariants.test.ts:138` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#AssignmentFact=>entities/kinds.ts#WriteInfo` | AssignmentFact | `entities/facts.ts:117` | WriteInfo | `entities/kinds.ts:100` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#ReadFact=>entities/kinds.ts#Edge` | ReadFact | `entities/facts.ts:249` | Edge | `entities/kinds.ts:43` | 0.44 | Properties | No action needed beyond the note. |
| `similar:entities/location/homes.ts#Destination=>entities/location/homes.ts#Place` | Destination | `entities/location/homes.ts:24` | Place | `entities/location/homes.ts:26` | 0.44 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ReportObject=>entities/repair.ts#Repair` | ReportObject | `entities/architecture.ts:31` | Repair | `entities/repair.ts:25` | 0.43 | Properties | No action needed beyond the note. |
| `similar:entities/location/homes.ts#Place=>entities/tree/entries.ts#Spot` | Place | `entities/location/homes.ts:26` | Spot | `entities/tree/entries.ts:24` | 0.43 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/components/access-graph/useZoomPan.ts#View=>report/user-report/src/utils/layout/types.ts#Box` | View | `report/user-report/src/components/access-graph/useZoomPan.ts:19` | Box | `report/user-report/src/utils/layout/types.ts:21` | 0.43 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>invariants/name.ts#FileVarsCtx` | FileContext | `entities/context.ts:18` | FileVarsCtx | `invariants/name.ts:10` | 0.43 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#AccessEdge=>tests/report/layout.test.ts#e` | AccessEdge | `entities/access-graph.ts:14` | e | `tests/report/layout.test.ts:85` | 0.42 | Properties | No action needed beyond the note. |
| `similar:config-state.ts#RuleState=>entities/overview.ts#OverviewInput` | RuleState | `config-state.ts:42` | OverviewInput | `entities/overview.ts:20` | 0.42 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#RoleDef=>entities/architecture.ts#RawNode` | RoleDef | `entities/architecture.ts:76` | RawNode | `entities/architecture.ts:197` | 0.42 | Properties | No action needed beyond the note. |
| `similar:css/css-tree.ts#CssNode=>entities/facts.ts#ConstructorParam` | CssNode | `css/css-tree.ts:17` | ConstructorParam | `entities/facts.ts:139` | 0.41 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#FileFacts=>tests/entities/kinds.test.ts#facts` | FileFacts | `entities/facts.ts:252` | facts | `tests/entities/kinds.test.ts:16` | 0.41 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#RoleDef=>utils/classify.ts#Definition` | RoleDef | `entities/architecture.ts:76` | Definition | `utils/classify.ts:16` | 0.41 | Properties | No action needed beyond the note. |
| `similar:tests/invariants/invariants.test.ts#facts=>tests/invariants/invariants.test.ts#bare` | facts | `tests/invariants/invariants.test.ts:50` | bare | `tests/invariants/invariants.test.ts:68` | 0.41 | Properties | No action needed beyond the note. |
| `similar:tests/invariants/invariants.test.ts#named=>tests/invariants/invariants.test.ts#ns` | named | `tests/invariants/invariants.test.ts:200` | ns | `tests/invariants/invariants.test.ts:206` | 0.41 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#MemberFact=>entities/facts.ts#ConstructorParam` | MemberFact | `entities/facts.ts:22` | ConstructorParam | `entities/facts.ts:139` | 0.41 | Properties | No action needed beyond the note. |
| `similar:entities/story.ts#Destination=>report/errorTypes/destinations.ts#Scored` | Destination | `entities/story.ts:24` | Scored | `report/errorTypes/destinations.ts:115` | 0.41 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Arch=>tests/report/overview.test.ts#ARCH` | Arch | `entities/architecture.ts:169` | ARCH | `tests/report/overview.test.ts:14` | 0.41 | Properties | No action needed beyond the note. |
| `similar:css/css-tree.ts#CssNode=>entities/facts.ts#BindingFact` | CssNode | `css/css-tree.ts:17` | BindingFact | `entities/facts.ts:108` | 0.40 | Properties | No action needed beyond the note. |
| `similar:css/document.ts#DocumentOptions=>css/document.ts#DocumentFacts` | DocumentOptions | `css/document.ts:173` | DocumentFacts | `css/document.ts:178` | 0.40 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchVariant=>entities/architecture.ts#ArchNode` | ArchVariant | `entities/architecture.ts:113` | ArchNode | `entities/architecture.ts:138` | 0.40 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>tests/invariants/invariants.test.ts#inv` | Invariant | `entities/architecture.ts:86` | inv | `tests/invariants/invariants.test.ts:26` | 0.40 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchChild=>entities/architecture.ts#ArchNode` | ArchChild | `entities/architecture.ts:123` | ArchNode | `entities/architecture.ts:138` | 0.40 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/components/access-graph/useZoomPan.ts#View=>report/user-report/src/components/access-graph/useZoomPan.ts#Drag` | View | `report/user-report/src/components/access-graph/useZoomPan.ts:19` | Drag | `report/user-report/src/components/access-graph/useZoomPan.ts:60` | 0.40 | Properties | No action needed beyond the note. |
| `similar:pipeline-roles.ts#Misfit=>entities/facts.ts#Located` | Misfit | `pipeline-roles.ts:19` | Located | `entities/facts.ts:17` | 0.39 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#RoleNode=>entities/overview-summaries.ts#NodeSummary` | RoleNode | `entities/access-graph.ts:57` | NodeSummary | `entities/overview-summaries.ts:49` | 0.39 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/App.tsx#SCREENS=>report/user-report/src/components/Shell.tsx#counters` | SCREENS | `report/user-report/src/App.tsx:12` | counters | `report/user-report/src/components/Shell.tsx:82` | 0.39 | Properties | No action needed beyond the note. |
| `similar:css/template.ts#TemplateExpr=>css/values.ts#at` | TemplateExpr | `css/template.ts:15` | at | `css/values.ts:70` | 0.39 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>entities/ast/file-facts.ts#CollectOptions` | FileContext | `entities/context.ts:18` | CollectOptions | `entities/ast/file-facts.ts:20` | 0.39 | Properties | No action needed beyond the note. |
| `similar:tests/report/access-graph.test.ts#arch2=>tests/report/overview.test.ts#ARCH` | arch2 | `tests/report/access-graph.test.ts:142` | ARCH | `tests/report/overview.test.ts:14` | 0.39 | Properties | No action needed beyond the note. |
| `similar:entities/findings.ts#FindingItem=>report/render-report.ts#TextFinding` | FindingItem | `entities/findings.ts:19` | TextFinding | `report/render-report.ts:16` | 0.39 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#RoleNode=>entities/overview-summaries.ts#RoleHome` | RoleNode | `entities/access-graph.ts:57` | RoleHome | `entities/overview-summaries.ts:30` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#RawArch=>tests/report/overview.test.ts#ARCH` | RawArch | `entities/architecture.ts:218` | ARCH | `tests/report/overview.test.ts:14` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>utils/imports.ts#ResolveContext` | FileContext | `entities/context.ts:18` | ResolveContext | `utils/imports.ts:97` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Arch=>tests/finally-follow-architecture/writes.test.ts#ARCH` | Arch | `entities/architecture.ts:169` | ARCH | `tests/finally-follow-architecture/writes.test.ts:55` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Arch=>tests/report/access-graph.test.ts#arch` | Arch | `entities/architecture.ts:169` | arch | `tests/report/access-graph.test.ts:40` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Arch=>tests/report/role-example-marks.test.ts#ARCH` | Arch | `entities/architecture.ts:169` | ARCH | `tests/report/role-example-marks.test.ts:18` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>tests/invariants/invariants.test.ts#inv2` | Invariant | `entities/architecture.ts:86` | inv2 | `tests/invariants/invariants.test.ts:62` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>tests/invariants/invariants.test.ts#inv3` | Invariant | `entities/architecture.ts:86` | inv3 | `tests/invariants/invariants.test.ts:65` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/enriched-finding.ts#EnrichedFinding=>report/user-report/data/finding-title.ts#TitleArgs` | EnrichedFinding | `entities/enriched-finding.ts:48` | TitleArgs | `report/user-report/data/finding-title.ts:22` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/findings.ts#FindingItem=>utils/configs.ts#ConfigIssue` | FindingItem | `entities/findings.ts:19` | ConfigIssue | `utils/configs.ts:38` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#RawChildSpec=>entities/architecture.ts#RawNode` | RawChildSpec | `entities/architecture.ts:185` | RawNode | `entities/architecture.ts:197` | 0.37 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>tests/invariants/invariants.test.ts#perCandidate` | Invariant | `entities/architecture.ts:86` | perCandidate | `tests/invariants/invariants.test.ts:116` | 0.37 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#GraphViolation=>entities/ast/resolve.ts#DeclInfo` | GraphViolation | `entities/access-graph.ts:46` | DeclInfo | `entities/ast/resolve.ts:20` | 0.36 | Properties | No action needed beyond the note. |
| `similar:entities/enriched-finding.ts#EnrichedFinding=>report/render-report.ts#TextFinding` | EnrichedFinding | `entities/enriched-finding.ts:48` | TextFinding | `report/render-report.ts:16` | 0.36 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>tests/invariants/invariants.test.ts#or` | Invariant | `entities/architecture.ts:86` | or | `tests/invariants/invariants.test.ts:136` | 0.36 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>tests/invariants/invariants.test.ts#xor` | Invariant | `entities/architecture.ts:86` | xor | `tests/invariants/invariants.test.ts:138` | 0.36 | Properties | No action needed beyond the note. |
| `similar:entities/overview-summaries.ts#InvariantSummary=>tests/invariants/invariants.test.ts#perCandidate` | InvariantSummary | `entities/overview-summaries.ts:69` | perCandidate | `tests/invariants/invariants.test.ts:116` | 0.36 | Properties | No action needed beyond the note. |
| `similar:tests/report/access-graph.test.ts#arch=>tests/report/access-graph.test.ts#arch2` | arch | `tests/report/access-graph.test.ts:40` | arch2 | `tests/report/access-graph.test.ts:142` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/decision-ctx.ts#DecisionCtx=>tests/report/errorTypes.test.ts#CTX` | DecisionCtx | `entities/decision-ctx.ts:51` | CTX | `tests/report/errorTypes.test.ts:52` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/overview-summaries.ts#InvariantSummary=>tests/invariants/invariants.test.ts#inv2` | InvariantSummary | `entities/overview-summaries.ts:69` | inv2 | `tests/invariants/invariants.test.ts:62` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/overview-summaries.ts#InvariantSummary=>tests/invariants/invariants.test.ts#inv3` | InvariantSummary | `entities/overview-summaries.ts:69` | inv3 | `tests/invariants/invariants.test.ts:65` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/location/homes.ts#Destination=>entities/tree/entries.ts#Spot` | Destination | `entities/location/homes.ts:24` | Spot | `entities/tree/entries.ts:24` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/operators.ts#SCALAR_OPS=>entities/queries.ts#scalarHandlers` | SCALAR_OPS | `entities/operators.ts:19` | scalarHandlers | `entities/queries.ts:112` | 0.35 | Properties | No action needed beyond the note. |
| `similar:css/css-tree.ts#CssNode=>entities/facts.ts#MemberFact` | CssNode | `css/css-tree.ts:17` | MemberFact | `entities/facts.ts:22` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ReportObject=>report/errorTypes/codes/structure.ts#StructureCode` | ReportObject | `entities/architecture.ts:31` | StructureCode | `report/errorTypes/codes/structure.ts:11` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>invariants/name.ts#FileVars` | FileContext | `entities/context.ts:18` | FileVars | `invariants/name.ts:11` | 0.35 | Properties | No action needed beyond the note. |
| `similar:tests/invariants/invariants.test.ts#inv2=>tests/invariants/invariants.test.ts#inv3` | inv2 | `tests/invariants/invariants.test.ts:62` | inv3 | `tests/invariants/invariants.test.ts:65` | 0.35 | Properties | No action needed beyond the note. |

### Why each one matched

- **Unplaceable** — `Unplaceable` looks like `Loop`, but not closely enough to call it a copy — 0.50 (50%).
  scores  Properties 58%
  Properties  58%  1/2 shared agree in type  (3↔2 properties)
    shared  kind: string
    type differs  who: string ≠ string[]
    only A  targetRole
  **Fix** — No action needed beyond the note.
- **ACTION_KEYS** — `ACTION_KEYS` and `ActionDef` were filtered out — usage: ACTION_KEYS uses ActionDef Filtered out by `drop-usages`: usage: ACTION_KEYS uses ActionDef
  scores  Properties 50%
  Properties  50%  0/4 shared agree in type  (4↔4 properties)
    type differs  where: function ≠ WhereEntry[]?, except: function ≠ WhereEntry[]?, of: function ≠ string?, scopeAccess: function ≠ ScopeAccessor[]?
  **Fix** — No action needed beyond the note.
- **Resolved** — `Resolved` looks like `MoveAsk`, but not closely enough to call it a copy — 0.49 (50%).
  scores  Properties 57%
  Properties  57%  2/2 shared agree in type  (2↔7 properties)
    shared  node: string?, path: string
    only B  what, to, why, plural, name
  **Fix** — No action needed beyond the note.
- **theme** — `theme` looks like `DefaultTheme`, but not closely enough to call it a copy — 0.49 (49%).
  scores  Properties 50%
  Properties  50%  0/4 shared agree in type  (4↔4 properties)
    type differs  color: {bg:string;panel:string;panelAlt:string;border:string;borderStrong:string;text:string;textDim:string;textFaint:string;accent:string;structure:string;codeRole:string;invariant:string;danger:string;ok:string;warn:string} ≠ AppTheme["color"], font: {mono:string;sans:string} ≠ AppTheme["font"], radius: {sm:string;md:string;lg:string} ≠ AppTheme["radius"], space: function ≠ AppTheme["space"]
  **Fix** — No action needed beyond the note.
- **BindingFact** — `BindingFact` looks like `ConstructorParam`, but not closely enough to call it a copy — 0.49 (49%).
  scores  Properties 57%
  Properties  57%  2/2 shared agree in type  (3↔3 properties)
    shared  name: string?, type: string?
    only A  typeFile
    only B  decorators
  **Fix** — No action needed beyond the note.
- **Arch** — `Arch` looks like `arch`, but not closely enough to call it a copy — 0.49 (49%).
  scores  Properties 40%
  Properties  40%  1/2 shared agree in type  (9↔2 properties)
    shared  nodes: ArchNodes
    type differs  codeRoles: CodeRoles ≠ {action:{};storeModel:{}}
    only A  invariants, aliases, raw, repoRoot, similarity, depthCache, similarCache
  **Fix** — No action needed beyond the note.
- **ArchChild** — `ArchChild` looks like `RawChildSpec`, but not closely enough to call it a copy — 0.49 (49%).
  scores  Properties 52%
  Properties  52%  5/5 shared agree in type  (11↔7 properties)
    shared  name: string?, required: boolean, forbidden: boolean, query: QueryFilter?, report: ReportValue
    only A  nodeSlug, re, captures, folder, roles, slug
    only B  node, role
  **Fix** — No action needed beyond the note.
- **OverviewMeta** — `OverviewMeta` looks like `OverviewInput`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 48%
  Properties  48%  4/4 shared agree in type  (6↔9 properties)
    shared  repoRoot: string, architecturePath: string, generatedAt: string, orphans: string[]
    only A  repoName, filesScanned
    only B  arch, findings, files, repoFiles, project
  **Fix** — No action needed beyond the note.
- **Unplaceable** — `Unplaceable` looks like `Mention`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 57%
  Properties  57%  2/2 shared agree in type  (3↔3 properties)
    shared  kind: string, targetRole: string
    only A  who
    only B  targetPaths
  **Fix** — No action needed beyond the note.
- **NodeSummary** — `NodeSummary` looks like `a`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 55%
  Properties  55%  4/5 shared agree in type  (14↔5 properties)
    shared  slug: string, name: string, paths: string[], fileCount: number
    type differs  parents: string[] ≠ undefined[]
    only A  isFile, children, report, files, lineCount, exampleFile, sample, roles, closed
  **Fix** — No action needed beyond the note.
- **arch** — `arch` looks like `ARCH`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 39%  ·  Values 0%
  Properties  39%  0/2 shared agree in type  (2↔3 properties)
    type differs  nodes: ArchNodes ≠ ({slug:string;name:string;children:string[]}|{slug:string;name:string;parent:string;children:string[]}|{slug:string;name:string;parent:string;children:string[];role:string}|{slug:string;name:string;parent:string;role:string})[], codeRoles: {action:{};storeModel:{}} ≠ ({slug:string;infer:{kind:{own:{is:{equals:string}}}}[];actions:{import:{where:{role:string}[]}}}|{slug:string;infer:{kind:{own:{is:{in:string[]}}}}[]})[]
    only B  invariants
  Values  0%  1 value path(s) compared
    ≠ nodes: buildTree([ { slug: "root", name: ".", children: ["src"] }, { slug: "src", name: "src", parent: "root", children: ["{kebab-case}"] }, { slug: "feature", name: "{kebab-case}", parent: "src", children: ["actions", "store.ts"] }, { slug: "actions", name: "actions", parent: "feature", role: "action" }, { slug: "store", name: "store.ts", parent: "feature", role: "storeModel" }, ]) ↔ undefined
    only B  codeRoles.[0].slug, codeRoles.[0].infer[0].kind.own.is.equals, codeRoles.[0].actions.import.where[0].role, codeRoles.[1].slug, codeRoles.[1].infer[0].kind.own.is.in[0], invariants
  **Fix** — No action needed beyond the note.
- **ARCH** — `ARCH` looks like `ARCH`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 39%  ·  Values 2%
  Properties  39%  0/2 shared agree in type  (2↔3 properties)
    type differs  nodes: ({slug:string;name:string;children:(string|{node:string})[]}|{slug:string;name:string;parent:string;role:string})[] ≠ ({slug:string;name:string;children:string[]}|{slug:string;name:string;parent:string;children:string[]}|{slug:string;name:string;parent:string;children:string[];role:string}|{slug:string;name:string;parent:string;role:string})[], codeRoles: ({slug:string;infer:{calls:{any:{action:{equals:string}}}}[];actions:{declare:{where:string[]};export:{where:string[]}}}|{slug:string;infer:{assignments:{any:{module:{location:{role:string}}}}}[];actions:{declare:{where:string[]};export:{where:string[]}}})[] ≠ ({slug:string;infer:{kind:{own:{is:{equals:string}}}}[];actions:{import:{where:{role:string}[]}}}|{slug:string;infer:{kind:{own:{is:{in:string[]}}}}[]})[]
    only B  invariants
  Values  2%  9 value path(s) compared
    shared  codeRoles[0].slug = storeModel
    ≠ nodes[0].slug: src ↔ root
    ≠ nodes[0].name: src ↔ .
    ≠ nodes[0].children[0]: undefined ↔ src
    ≠ nodes[1].slug: store ↔ src
    ≠ nodes[1].name: store.ts ↔ src
    ≠ nodes[1].parent: src ↔ root
    ≠ codeRoles[0].infer[0].calls.any.action.equals: model ↔ VariableDeclaration
    ≠ codeRoles[1].slug: action ↔ pureFunction
    only A  nodes[0].children[1], nodes[1].role, codeRoles[0].actions.declare, codeRoles[0].actions.export, codeRoles[1].infer[0].assignments.any.module.location.role, codeRoles[1].actions
    only B  nodes[1].children, nodes[2], nodes[3], codeRoles[0].actions.import, codeRoles[1].infer[0].kind.own.is.in.[0], invariants
  **Fix** — No action needed beyond the note.
- **arch** — `arch` looks like `ARCH`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 39%  ·  Values 0%
  Properties  39%  0/2 shared agree in type  (2↔3 properties)
    type differs  nodes: { roleHomes: { [k: string]: any; }; } ≠ ({slug:string;name:string;children:string[]}|{slug:string;name:string;parent:string;children:string[]}|{slug:string;name:string;parent:string;children:string[];role:string}|{slug:string;name:string;parent:string;role:string})[], codeRoles: {storeModel:{actions:{import:{type:string;where:any[]}}};action:{actions:{call:{type:string;where:any[]};mutate:{type:string;where:any[]}}}} ≠ ({slug:string;infer:{kind:{own:{is:{equals:string}}}}[];actions:{import:{where:{role:string}[]}}}|{slug:string;infer:{kind:{own:{is:{in:string[]}}}}[]})[]
    only B  invariants
  Values  0%  1 value path(s) compared
    ≠ nodes: treeOf({ storeModel: ["store", "root-store"], action: ["actions"] }, nodes) ↔ undefined
    only A  codeRoles.storeModel.actions.import, codeRoles.action.actions.call, codeRoles.action.actions.mutate
    only B  codeRoles.[0].slug, codeRoles.[0].infer[0].kind.own.is.equals, codeRoles.[0].actions.import.where[0].role, codeRoles.[1].slug, codeRoles.[1].infer[0].kind.own.is.in[0], invariants
  **Fix** — No action needed beyond the note.
- **ARCH** — `ARCH` looks like `ARCH`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 39%  ·  Values 3%
  Properties  39%  0/2 shared agree in type  (3↔2 properties)
    type differs  nodes: ({slug:string;name:string;children:string[]}|{slug:string;name:string;parent:string;children:string[]}|{slug:string;name:string;parent:string;children:string[];role:string}|{slug:string;name:string;parent:string;role:string})[] ≠ {slug:string;name:string;children:string[]}[], codeRoles: ({slug:string;infer:{kind:{own:{is:{equals:string}}}}[];actions:{import:{where:{role:string}[]}}}|{slug:string;infer:{kind:{own:{is:{in:string[]}}}}[]})[] ≠ ({slug:string;name:string;infer:{css:{templates:{any:{declarations:{any:{rule:{matches:string};prop:{in:string[]}}}}}}}[]}|{slug:string;name:string;infer:{css:{templates:{any:{declarations:{any:{vars:{length:{gt:number}}}}}}}}[]}|{slug:string;name:string;infer:{css:{templates:{length:{gt:number}}}}[]})[]
    only A  invariants
  Values  3%  6 value path(s) compared
    shared  nodes[0].slug = root, nodes[0].name = .
    ≠ nodes[0].children[0]: src ↔ **
    ≠ codeRoles[0].slug: storeModel ↔ styleInversion
    ≠ codeRoles[0].infer[0].kind.own.is.equals: VariableDeclaration ↔ undefined
    ≠ codeRoles[1].slug: pureFunction ↔ cssVariable
    only A  nodes[1], nodes[2], nodes[3], codeRoles[0].actions, codeRoles[1].infer[0].kind.own.is.in.[0], invariants
    only B  codeRoles[0].infer[1], codeRoles[0].name, codeRoles[1].infer[0].css.templates.any.declarations.any.vars.length.gt, codeRoles[1].name, codeRoles[2]
  **Fix** — No action needed beyond the note.
- **ArchNode** — `ArchNode` looks like `RawNode`, but not closely enough to call it a copy — 0.47 (47%).
  scores  Properties 47%
  Properties  47%  4/5 shared agree in type  (15↔6 properties)
    shared  slug: string, name: string, parent: string|string[]?, report: ReportValue?
    type differs  children: ArchChild[] ≠ RawChild[]?
    only A  parents, roles, required, variants, path, re, prefixRe, prefixNames, literalLen, isFile
    only B  role
  **Fix** — No action needed beyond the note.
- **NodeSummary** — `NodeSummary` looks like `b`, but not closely enough to call it a copy — 0.47 (47%).
  scores  Properties 55%
  Properties  55%  4/5 shared agree in type  (14↔5 properties)
    shared  slug: string, name: string, paths: string[], fileCount: number
    type differs  parents: string[] ≠ undefined[]
    only A  isFile, children, report, files, lineCount, exampleFile, sample, roles, closed
  **Fix** — No action needed beyond the note.
- **CountGroup** — `CountGroup` looks like `Count`, but not closely enough to call it a copy — 0.47 (47%).
  scores  Properties 46%
  Properties  46%  2/2 shared agree in type  (2↔2 properties)
    shared  key: string, count: number
  **Fix** — No action needed beyond the note.
- **WhereEntry** — `WhereEntry` looks like `RoleHome`, but not closely enough to call it a copy — 0.46 (46%).
  scores  Properties 53%
  Properties  53%  2/2 shared agree in type  (9↔2 properties)
    shared  node: string?, template: string?
    only A  type, role, same, via, glob, query, re
  **Fix** — No action needed beyond the note.
- **TextFinding** — `TextFinding` looks like `TitleArgs`, but not closely enough to call it a copy — 0.46 (46%).
  scores  Properties 52%
  Properties  52%  4/4 shared agree in type  (11↔5 properties)
    shared  message: string, role: string?, node: string?, rule: string
    only A  file, fix, what, line, token, singularToken, targetPath
    only B  invariant
  **Fix** — No action needed beyond the note.
- **Invariant** — `Invariant` looks like `InvariantSummary`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 44%
  Properties  44%  1/7 shared agree in type  (8↔9 properties)
    shared  id: string
    type differs  where: WhereEntry[] ≠ string[], ignore: WhereEntry[] ≠ string[], when: QueryFilter? ≠ string[], infer: QueryFilter[] ≠ InvariantRule[], report: ReportValue ≠ string?, dedupeBy: WhereEntry[] ≠ string[]
    only A  children
    only B  node, findingCount
  **Fix** — No action needed beyond the note.
- **CtxPlan** — `CtxPlan` looks like `Plan`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 44%
  Properties  44%  1/5 shared agree in type  (5↔9 properties)
    shared  remove: boolean?
    type differs  before: {node:string?;paths:string[]}? ≠ PlanPlace?, after: {node:string?;paths:string[]}? ≠ PlanPlace?, relation: FieldValue? ≠ PlanRelation?, repair: FieldValue? ≠ Repair?
    only B  role, target, allowedImporters, allowedGlobs
  **Fix** — No action needed beyond the note.
- **NodeSummary** — `NodeSummary` looks like `PlaceBox`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 53%
  Properties  53%  5/5 shared agree in type  (14↔6 properties)
    shared  slug: string, name: string, paths: string[], parents: string[], children: string[]
    only A  isFile, report, files, fileCount, lineCount, exampleFile, sample, roles, closed
    only B  file
  **Fix** — No action needed beyond the note.
- **CollectOptions** — `CollectOptions` looks like `ResolveContext`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 51%
  Properties  51%  1/3 shared agree in type  (5↔3 properties)
    shared  repoRoot: string
    type differs  repoFiles: string[]? ≠ readonly string[]?, aliases: AliasMap? ≠ Aliases?
    only A  rel, candidates
  **Fix** — No action needed beyond the note.
- **inv** — `inv` looks like `perCandidate`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 52%  ·  Values 44%
  Properties  52%  1/2 shared agree in type  (4↔2 properties)
    shared  id: string
    type differs  infer: {lines:{gt:number}}[] ≠ {bodyStatements:{equals:number}}[]
    only A  where, report
  Values  44%  2 value path(s) compared
    shared  infer[0].lines.gt = 0
    ≠ id: x ↔ y
    only A  where, report
  **Fix** — No action needed beyond the note.
- **hostFile** — `hostFile` looks like `plainFile`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 46%  ·  Values 33%
  Properties  46%  2/2 shared agree in type  (2↔2 properties)
    shared  imports: {source:string;named:undefined[];line:number;resolved:null}[], path: {dir:string}
  Values  33%  4 value path(s) compared
    shared  imports[0].line = 1, imports[0].resolved = null
    ≠ imports[0].source: vscode ↔ path
    ≠ path.dir: packages/vscode-extension ↔ packages/utils
  **Fix** — No action needed beyond the note.
- **MemberFact** — `MemberFact` looks like `BindingFact`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (5↔3 properties)
    shared  name: string?, type: string?
    only A  is, value, members
    only B  typeFile
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `FacetContext`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 43%
  Properties  43%  3/3 shared agree in type  (13↔4 properties)
    shared  rel: string, sf: SourceFile?, repoRoot: string?
    only A  abs, dir, basename, aliases, arch, roles, roleCtx, facts, repoFiles, dedupe
    only B  text
  **Fix** — No action needed beyond the note.
- **Resolved** — `Resolved` looks like `Destination`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 51%
  Properties  51%  2/2 shared agree in type  (2↔11 properties)
    shared  node: string?, path: string
    only B  role, confidence, tier, reason, signals, contributions, evidence, thresholds, weights
  **Fix** — No action needed beyond the note.
- **DescribeOptions** — `DescribeOptions` looks like `Walk`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 52%
  Properties  52%  1/2 shared agree in type  (2↔4 properties)
    shared  setValue: string?
    type differs  ignore: readonly string[]? ≠ Set<string>
    only B  trail, out
  **Fix** — No action needed beyond the note.
- **inv** — `inv` looks like `or`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 52%  ·  Values 9%
  Properties  52%  1/2 shared agree in type  (4↔2 properties)
    shared  id: string
    type differs  infer: {lines:{gt:number}}[] ≠ {or:({lines:{gt:number}}|{lines:{lt:number}})[]}[]
    only A  where, report
  Values  9%  1 value path(s) compared
    shared  id = x
    only A  where, infer[0].lines.gt, report
    only B  infer[0].or.[0].lines.gt, infer[0].or.[1].lines.lt
  **Fix** — No action needed beyond the note.
- **inv** — `inv` looks like `xor`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 52%  ·  Values 9%
  Properties  52%  1/2 shared agree in type  (4↔2 properties)
    shared  id: string
    type differs  infer: {lines:{gt:number}}[] ≠ {xor:({lines:{gt:number}}|{lines:{lt:number}})[]}[]
    only A  where, report
  Values  9%  1 value path(s) compared
    shared  id = x
    only A  where, infer[0].lines.gt, report
    only B  infer[0].xor.[0].lines.gt, infer[0].xor.[1].lines.lt
  **Fix** — No action needed beyond the note.
- **AssignmentFact** — `AssignmentFact` looks like `WriteInfo`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 50%
  Properties  50%  4/4 shared agree in type  (12↔5 properties)
    shared  target: string, method: string?, module: string?, onThis: boolean?
    only A  line, value, via, performed, type, param, local, relation
    only B  mutate
  **Fix** — No action needed beyond the note.
- **ReadFact** — `ReadFact` looks like `Edge`, but not closely enough to call it a copy — 0.44 (44%).
  scores  Properties 50%
  Properties  50%  3/3 shared agree in type  (4↔8 properties)
    shared  what: string, line: number, piece: string?
    only A  module
    only B  path, external, fact, role, action
  **Fix** — No action needed beyond the note.
- **Destination** — `Destination` looks like `Place`, but not closely enough to call it a copy — 0.44 (44%).
  scores  Properties 51%
  Properties  51%  2/2 shared agree in type  (4↔3 properties)
    shared  path: string?, folder: boolean
    only A  slug, template
    only B  concrete
  **Fix** — No action needed beyond the note.
- **ReportObject** — `ReportObject` looks like `Repair`, but not closely enough to call it a copy — 0.43 (44%).
  scores  Properties 49%
  Properties  49%  3/4 shared agree in type  (9↔5 properties)
    shared  path: string?, to: string[]?, from: string?
    type differs  code: string? ≠ RepairCode|string
    only A  description, message, fix, ask, place
    only B  text
  **Fix** — No action needed beyond the note.
- **Place** — `Place` looks like `Spot`, but not closely enough to call it a copy — 0.43 (43%).
  scores  Properties 51%
  Properties  51%  2/2 shared agree in type  (3↔4 properties)
    shared  path: string, folder: boolean
    only A  concrete
    only B  role, file
  **Fix** — No action needed beyond the note.
- **View** — `View` looks like `Box`, but not closely enough to call it a copy — 0.43 (43%).
  scores  Properties 51%
  Properties  51%  2/2 shared agree in type  (3↔4 properties)
    shared  x: number, y: number
    only A  s
    only B  w, h
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `FileVarsCtx`, but not closely enough to call it a copy — 0.43 (43%).
  scores  Properties 45%
  Properties  45%  2/3 shared agree in type  (13↔3 properties)
    shared  rel: string, basename: string?
    type differs  facts: RunFacts? ≠ {location:{path:string}?}?
    only A  abs, dir, sf, repoRoot, aliases, arch, roles, roleCtx, repoFiles, dedupe
  **Fix** — No action needed beyond the note.
- **AccessEdge** — `AccessEdge` looks like `e`, but not closely enough to call it a copy — 0.42 (42%).
  scores  Properties 49%
  Properties  49%  3/3 shared agree in type  (20↔3 properties)
    shared  kind: string, kinds: string[], scope: string[]
    only A  from, to, fromPath, toPath, actor, actorPath, actorRoles, actorRole, subject, subjectPath, fromRoles, same, via, target, broken, brokenCount, option
  **Fix** — No action needed beyond the note.
- **RuleState** — `RuleState` looks like `OverviewInput`, but not closely enough to call it a copy — 0.42 (42%).
  scores  Properties 48%
  Properties  48%  3/3 shared agree in type  (4↔9 properties)
    shared  arch: Arch, project: Project, repoFiles: string[]
    only A  dedupe
    only B  findings, orphans, files, repoRoot, architecturePath, generatedAt
  **Fix** — No action needed beyond the note.
- **RoleDef** — `RoleDef` looks like `RawNode`, but not closely enough to call it a copy — 0.42 (42%).
  scores  Properties 47%
  Properties  47%  3/3 shared agree in type  (5↔6 properties)
    shared  slug: string, name: string, report: ReportValue
    only A  infer, actions
    only B  parent, children, role
  **Fix** — No action needed beyond the note.
- **CssNode** — `CssNode` looks like `ConstructorParam`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (5↔3 properties)
    shared  type: string, name: string?
    only A  value, unit, children
    only B  decorators
  **Fix** — No action needed beyond the note.
- **FileFacts** — `FileFacts` looks like `facts`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 39%
  Properties  39%  0/5 shared agree in type  (8↔5 properties)
    type differs  imports: ImportFact[] ≠ ({source:string;resolved:string;line:number}|{source:string;resolved:string;line:number;typeOnly:boolean})[], exports: ExportFact[] ≠ {from:string;line:number}[], location: Place ≠ {path:string;piece:null}, reads: ReadFact[] ≠ {module:string;what:string;line:number}[], candidates: Candidate[] ≠ {lines:number[];exported:boolean;name:string;calls:{action:string;module:string}[];assignments:({via:string;target:string;value:string;module:string;line:number;relation:string}|{via:string;target:string;value:null;onThis:boolean;line:number;relation:string}|{via:string;target:string;value:string;line:number;local:boolean;relation:null}|{via:string;target:string;value:string;line:number;param:boolean;relation:string})[]}[]
    only A  lines, kind, roles
  **Fix** — No action needed beyond the note.
- **RoleDef** — `RoleDef` looks like `Definition`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 48%
  Properties  48%  1/2 shared agree in type  (5↔2 properties)
    shared  name: string
    type differs  infer: QueryFilter[] ≠ QueryFilter
    only A  slug, report, actions
  **Fix** — No action needed beyond the note.
- **facts** — `facts` looks like `bare`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 46%  ·  Values 30%
  Properties  46%  2/2 shared agree in type  (2↔2 properties)
    shared  lines: number, scopeChains: {via:string;chain:string[];line:number}[]
  Values  30%  4 value path(s) compared
    shared  lines = 10, scopeChains[0].via = getRoot, scopeChains[0].chain[0] = grammar, scopeChains[0].line = 4
    only A  scopeChains[1], scopeChains[2]
  **Fix** — No action needed beyond the note.
- **named** — `named` looks like `ns`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 46%  ·  Values 20%
  Properties  46%  2/2 shared agree in type  (2↔2 properties)
    shared  lines: number, exports: {kind:string;named:string[];from:string;source:string;line:number}[]
  Values  20%  6 value path(s) compared
    shared  lines = 5, exports[0].line = 2
    ≠ exports[0].kind: named ↔ namespace
    ≠ exports[0].named[0]: x ↔ ns
    ≠ exports[0].from: apps/backend/a/mod.ts ↔ apps/backend/a/all.ts
    ≠ exports[0].source: ./mod ↔ ./all
  **Fix** — No action needed beyond the note.
- **MemberFact** — `MemberFact` looks like `ConstructorParam`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (5↔3 properties)
    shared  name: string?, type: string?
    only A  is, value, members
    only B  decorators
  **Fix** — No action needed beyond the note.
- **Destination** — `Destination` looks like `Scored`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 47%
  Properties  47%  2/3 shared agree in type  (11↔3 properties)
    shared  confidence: number, evidence: string[]
    type differs  contributions: Record<string,number> ≠ Weights
    only A  role, node, path, tier, reason, signals, thresholds, weights
  **Fix** — No action needed beyond the note.
- **Arch** — `Arch` looks like `ARCH`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 30%
  Properties  30%  0/3 shared agree in type  (9↔3 properties)
    type differs  nodes: ArchNodes ≠ ({slug:string;name:string;children:string[]}|{slug:string;name:string;parent:string;children:string[]}|{slug:string;name:string;parent:string;children:string[];role:string}|{slug:string;name:string;parent:string;role:string})[], codeRoles: CodeRoles ≠ ({slug:string;infer:{kind:{own:{is:{equals:string}}}}[];actions:{import:{where:{role:string}[]}}}|{slug:string;infer:{kind:{own:{is:{in:string[]}}}}[]})[], invariants: Invariant[] ≠ {id:string;where:string;infer:{lines:{gt:number};report:{message:string;fix:string}}[]}[]
    only A  aliases, raw, repoRoot, similarity, depthCache, similarCache
  **Fix** — No action needed beyond the note.
- **CssNode** — `CssNode` looks like `BindingFact`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (5↔3 properties)
    shared  type: string, name: string?
    only A  value, unit, children
    only B  typeFile
  **Fix** — No action needed beyond the note.
- **DocumentOptions** — `DocumentOptions` looks like `DocumentFacts`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 39%
  Properties  39%  2/2 shared agree in type  (3↔9 properties)
    shared  exprs: TemplateExpr[]?, syntax: string?
    only A  parse
    only B  parsed, rules, declarations, comments, leading, literals, vars
  **Fix** — No action needed beyond the note.
- **ArchVariant** — `ArchVariant` looks like `ArchNode`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 41%
  Properties  41%  4/4 shared agree in type  (6↔15 properties)
    shared  path: string, re: RegExp, literalLen: number, isFile: boolean
    only A  names, claims
    only B  slug, name, parent, parents, children, roles, report, required, variants, prefixRe, prefixNames
  **Fix** — No action needed beyond the note.
- **Invariant** — `Invariant` looks like `inv`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 44%
  Properties  44%  1/4 shared agree in type  (8↔4 properties)
    shared  id: string
    type differs  where: WhereEntry[] ≠ string[], infer: QueryFilter[] ≠ {lines:{gt:number}}[], report: ReportValue ≠ string
    only A  ignore, when, dedupeBy, children
  **Fix** — No action needed beyond the note.
- **ArchChild** — `ArchChild` looks like `ArchNode`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 40%
  Properties  40%  6/6 shared agree in type  (11↔15 properties)
    shared  name: string?, re: RegExp, required: boolean, report: ReportValue, roles: string[], slug: string?
    only A  nodeSlug, captures, folder, forbidden, query
    only B  parent, parents, children, variants, path, prefixRe, prefixNames, literalLen, isFile
  **Fix** — No action needed beyond the note.
- **View** — `View` looks like `Drag`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (3↔5 properties)
    shared  x: number, y: number
    only A  s
    only B  vx, vy, moved
  **Fix** — No action needed beyond the note.
- **Misfit** — `Misfit` looks like `Located`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 46%
  Properties  46%  2/2 shared agree in type  (2↔2 properties)
    shared  name: string, line: number
  **Fix** — No action needed beyond the note.
- **RoleNode** — `RoleNode` looks like `NodeSummary`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 42%
  Properties  42%  4/4 shared agree in type  (6↔14 properties)
    shared  slug: string, name: string, paths: string[], fileCount: number
    only A  places, note
    only B  isFile, parents, children, report, files, lineCount, exampleFile, sample, roles, closed
  **Fix** — No action needed beyond the note.
- **SCREENS** — `SCREENS` looks like `counters`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 44%  ·  Values 0%
  Properties  44%  0/4 shared agree in type  (5↔4 properties)
    type differs  tree: ({ data, params }: ScreenProps) => React.JSX.Element ≠ number, graph: ({ data, params }: ScreenProps) => React.JSX.Element ≠ number, invariants: ({ data }: ScreenProps) => React.JSX.Element ≠ number, findings: ({ data, params }: ScreenProps) => React.JSX.Element ≠ number
    only A  summary
  Values  0%  4 value path(s) compared
    ≠ tree: TreeScreen ↔ stats.nodes
    ≠ graph: GraphScreen ↔ stats.roles
    ≠ invariants: InvariantsScreen ↔ stats.invariants
    ≠ findings: FindingsScreen ↔ stats.findings
    only A  summary
  **Fix** — No action needed beyond the note.
- **TemplateExpr** — `TemplateExpr` looks like `at`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 45%
  Properties  45%  1/2 shared agree in type  (4↔2 properties)
    shared  text: string
    type differs  line: number ≠ object
    only A  index, offset
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `CollectOptions`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 43%
  Properties  43%  3/4 shared agree in type  (13↔5 properties)
    shared  rel: string, repoRoot: string?, repoFiles: string[]?
    type differs  aliases: Record<string,string>? ≠ AliasMap?
    only A  abs, dir, basename, sf, arch, roles, roleCtx, facts, dedupe
    only B  candidates
  **Fix** — No action needed beyond the note.
- **arch2** — `arch2` looks like `ARCH`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 39%  ·  Values 0%
  Properties  39%  0/2 shared agree in type  (2↔3 properties)
    type differs  nodes: { roleHomes: { [k: string]: any; }; } ≠ ({slug:string;name:string;children:string[]}|{slug:string;name:string;parent:string;children:string[]}|{slug:string;name:string;parent:string;children:string[];role:string}|{slug:string;name:string;parent:string;role:string})[], codeRoles: {store:{actions:{import:{type:string;where:any[]}}};actions:{actions:{import:{type:string;where:any[]}}}} ≠ ({slug:string;infer:{kind:{own:{is:{equals:string}}}}[];actions:{import:{where:{role:string}[]}}}|{slug:string;infer:{kind:{own:{is:{in:string[]}}}}[]})[]
    only B  invariants
  Values  0%  1 value path(s) compared
    ≠ nodes: treeOf({ store: ["store", "root"], actions: ["actions"] }, nodes2) ↔ undefined
    only A  codeRoles.store.actions.import, codeRoles.actions.actions.import
    only B  codeRoles.[0].slug, codeRoles.[0].infer[0].kind.own.is.equals, codeRoles.[0].actions.import.where[0].role, codeRoles.[1].slug, codeRoles.[1].infer[0].kind.own.is.in[0], invariants
  **Fix** — No action needed beyond the note.
- **FindingItem** — `FindingItem` looks like `TextFinding`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 40%
  Properties  40%  4/4 shared agree in type  (7↔11 properties)
    shared  line: number?, message: string?, fix: string?, role: string?
    only A  key, report, data
    only B  file, what, node, rule, token, singularToken, targetPath
  **Fix** — No action needed beyond the note.
- **RoleNode** — `RoleNode` looks like `RoleHome`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 35%
  Properties  35%  2/2 shared agree in type  (6↔4 properties)
    shared  slug: string, paths: string[]
    only A  name, places, note, fileCount
    only B  label, labels
  **Fix** — No action needed beyond the note.
- **RawArch** — `RawArch` looks like `ARCH`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 35%
  Properties  35%  0/3 shared agree in type  (6↔3 properties)
    type differs  nodes: RawNodes? ≠ ({slug:string;name:string;children:string[]}|{slug:string;name:string;parent:string;children:string[]}|{slug:string;name:string;parent:string;children:string[];role:string}|{slug:string;name:string;parent:string;role:string})[], codeRoles: RawCodeRoles? ≠ ({slug:string;infer:{kind:{own:{is:{equals:string}}}}[];actions:{import:{where:{role:string}[]}}}|{slug:string;infer:{kind:{own:{is:{in:string[]}}}}[]})[], invariants: FieldValue[]? ≠ {id:string;where:string;infer:{lines:{gt:number};report:{message:string;fix:string}}[]}[]
    only A  file, aliases, report
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `ResolveContext`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 36%
  Properties  36%  1/3 shared agree in type  (13↔3 properties)
    shared  repoRoot: string?
    type differs  aliases: Record<string,string>? ≠ Aliases?, repoFiles: string[]? ≠ readonly string[]?
    only A  abs, rel, dir, basename, sf, arch, roles, roleCtx, facts, dedupe
  **Fix** — No action needed beyond the note.
- **Arch** — `Arch` looks like `ARCH`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 27%
  Properties  27%  0/2 shared agree in type  (9↔2 properties)
    type differs  nodes: ArchNodes ≠ ({slug:string;name:string;children:(string|{node:string})[]}|{slug:string;name:string;parent:string;role:string})[], codeRoles: CodeRoles ≠ ({slug:string;infer:{calls:{any:{action:{equals:string}}}}[];actions:{declare:{where:string[]};export:{where:string[]}}}|{slug:string;infer:{assignments:{any:{module:{location:{role:string}}}}}[];actions:{declare:{where:string[]};export:{where:string[]}}})[]
    only A  invariants, aliases, raw, repoRoot, similarity, depthCache, similarCache
  **Fix** — No action needed beyond the note.
- **Arch** — `Arch` looks like `arch`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 27%
  Properties  27%  0/2 shared agree in type  (9↔2 properties)
    type differs  nodes: ArchNodes ≠ { roleHomes: { [k: string]: any; }; }, codeRoles: CodeRoles ≠ {storeModel:{actions:{import:{type:string;where:any[]}}};action:{actions:{call:{type:string;where:any[]};mutate:{type:string;where:any[]}}}}
    only A  invariants, aliases, raw, repoRoot, similarity, depthCache, similarCache
  **Fix** — No action needed beyond the note.
- **Arch** — `Arch` looks like `ARCH`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 27%
  Properties  27%  0/2 shared agree in type  (9↔2 properties)
    type differs  nodes: ArchNodes ≠ {slug:string;name:string;children:string[]}[], codeRoles: CodeRoles ≠ ({slug:string;name:string;infer:{css:{templates:{any:{declarations:{any:{rule:{matches:string};prop:{in:string[]}}}}}}}[]}|{slug:string;name:string;infer:{css:{templates:{any:{declarations:{any:{vars:{length:{gt:number}}}}}}}}[]}|{slug:string;name:string;infer:{css:{templates:{length:{gt:number}}}}[]})[]
    only A  invariants, aliases, raw, repoRoot, similarity, depthCache, similarCache
  **Fix** — No action needed beyond the note.
- **Invariant** — `Invariant` looks like `inv2`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 41%
  Properties  41%  1/2 shared agree in type  (8↔2 properties)
    shared  id: string
    type differs  infer: QueryFilter[] ≠ {scopeChains:{any:{chain:{contains:string}}}}[]
    only A  where, ignore, when, report, dedupeBy, children
  **Fix** — No action needed beyond the note.
- **Invariant** — `Invariant` looks like `inv3`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 41%
  Properties  41%  1/2 shared agree in type  (8↔2 properties)
    shared  id: string
    type differs  infer: QueryFilter[] ≠ {scopeChains:{any:{via:{equals:string}}}}[]
    only A  where, ignore, when, report, dedupeBy, children
  **Fix** — No action needed beyond the note.
- **EnrichedFinding** — `EnrichedFinding` looks like `TitleArgs`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 43%
  Properties  43%  4/4 shared agree in type  (21↔5 properties)
    shared  rule: string, message: string, role: string?, invariant: string?
    only A  file, line, what, key, dedupeKey, category, title, engineMessage, fixOptions, errorType, ownerNode, nodeRoles, ownerPaths, violation, boundary, plan, story
    only B  node
  **Fix** — No action needed beyond the note.
- **FindingItem** — `FindingItem` looks like `ConfigIssue`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 42%
  Properties  42%  2/2 shared agree in type  (7↔3 properties)
    shared  key: string?, message: string?
    only A  report, line, data, fix, role
    only B  path
  **Fix** — No action needed beyond the note.
- **RawChildSpec** — `RawChildSpec` looks like `RawNode`, but not closely enough to call it a copy — 0.37 (37%).
  scores  Properties 38%
  Properties  38%  3/3 shared agree in type  (7↔6 properties)
    shared  name: string?, role: string|string[]?, report: ReportValue?
    only A  node, required, forbidden, query
    only B  slug, parent, children
  **Fix** — No action needed beyond the note.
- **Invariant** — `Invariant` looks like `perCandidate`, but not closely enough to call it a copy — 0.37 (37%).
  scores  Properties 41%
  Properties  41%  1/2 shared agree in type  (8↔2 properties)
    shared  id: string
    type differs  infer: QueryFilter[] ≠ {bodyStatements:{equals:number}}[]
    only A  where, ignore, when, report, dedupeBy, children
  **Fix** — No action needed beyond the note.
- **GraphViolation** — `GraphViolation` looks like `DeclInfo`, but not closely enough to call it a copy — 0.36 (37%).
  scores  Properties 42%
  Properties  42%  2/2 shared agree in type  (7↔3 properties)
    shared  kind: string, file: string
    only A  from, to, role, line, title
    only B  node
  **Fix** — No action needed beyond the note.
- **EnrichedFinding** — `EnrichedFinding` looks like `TextFinding`, but not closely enough to call it a copy — 0.36 (36%).
  scores  Properties 36%
  Properties  36%  6/6 shared agree in type  (21↔11 properties)
    shared  file: string, line: number, what: string?, rule: string, message: string, role: string?
    only A  key, dedupeKey, category, title, engineMessage, fixOptions, errorType, ownerNode, nodeRoles, ownerPaths, invariant, violation, boundary, plan, story
    only B  fix, node, token, singularToken, targetPath
  **Fix** — No action needed beyond the note.
- **Invariant** — `Invariant` looks like `or`, but not closely enough to call it a copy — 0.36 (36%).
  scores  Properties 41%
  Properties  41%  1/2 shared agree in type  (8↔2 properties)
    shared  id: string
    type differs  infer: QueryFilter[] ≠ {or:({lines:{gt:number}}|{lines:{lt:number}})[]}[]
    only A  where, ignore, when, report, dedupeBy, children
  **Fix** — No action needed beyond the note.
- **Invariant** — `Invariant` looks like `xor`, but not closely enough to call it a copy — 0.36 (36%).
  scores  Properties 41%
  Properties  41%  1/2 shared agree in type  (8↔2 properties)
    shared  id: string
    type differs  infer: QueryFilter[] ≠ {xor:({lines:{gt:number}}|{lines:{lt:number}})[]}[]
    only A  where, ignore, when, report, dedupeBy, children
  **Fix** — No action needed beyond the note.
- **InvariantSummary** — `InvariantSummary` looks like `perCandidate`, but not closely enough to call it a copy — 0.36 (36%).
  scores  Properties 40%
  Properties  40%  1/2 shared agree in type  (9↔2 properties)
    shared  id: string
    type differs  infer: InvariantRule[] ≠ {bodyStatements:{equals:number}}[]
    only A  node, where, ignore, when, dedupeBy, report, findingCount
  **Fix** — No action needed beyond the note.
- **arch** — `arch` looks like `arch2`, but not closely enough to call it a copy — 0.35 (36%).
  scores  Properties 35%  ·  Values 0%
  Properties  35%  1/2 shared agree in type  (2↔2 properties)
    shared  nodes: { roleHomes: { [k: string]: any; }; }
    type differs  codeRoles: {storeModel:{actions:{import:{type:string;where:any[]}}};action:{actions:{call:{type:string;where:any[]};mutate:{type:string;where:any[]}}}} ≠ {store:{actions:{import:{type:string;where:any[]}}};actions:{actions:{import:{type:string;where:any[]}}}}
  Values  0%  2 value path(s) compared
    ≠ nodes: treeOf({ storeModel: ["store", "root-store"], action: ["actions"] }, nodes) ↔ treeOf({ store: ["store", "root"], actions: ["actions"] }, nodes2)
    ≠ codeRoles.storeModel.actions.import: where({ type: "role", role: "storeModel" }, { type: "role", role: "action", same: true }, roleWhere("test")) ↔ where({ type: "role", role: "store" })
    only A  codeRoles.action.actions.call, codeRoles.action.actions.mutate
    only B  codeRoles.action.actions.import
  **Fix** — No action needed beyond the note.
- **DecisionCtx** — `DecisionCtx` looks like `CTX`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 35%
  Properties  35%  1/3 shared agree in type  (10↔3 properties)
    shared  file: string
    type differs  ownerNode: CtxOwner? ≠ {slug:string}, places: Places ≠ object
    only A  finding, key, violation, plan, nodes, arch, invariant
  **Fix** — No action needed beyond the note.
- **InvariantSummary** — `InvariantSummary` looks like `inv2`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 40%
  Properties  40%  1/2 shared agree in type  (9↔2 properties)
    shared  id: string
    type differs  infer: InvariantRule[] ≠ {scopeChains:{any:{chain:{contains:string}}}}[]
    only A  node, where, ignore, when, dedupeBy, report, findingCount
  **Fix** — No action needed beyond the note.
- **InvariantSummary** — `InvariantSummary` looks like `inv3`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 40%
  Properties  40%  1/2 shared agree in type  (9↔2 properties)
    shared  id: string
    type differs  infer: InvariantRule[] ≠ {scopeChains:{any:{via:{equals:string}}}}[]
    only A  node, where, ignore, when, dedupeBy, report, findingCount
  **Fix** — No action needed beyond the note.
- **Destination** — `Destination` looks like `Spot`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 40%
  Properties  40%  2/2 shared agree in type  (4↔4 properties)
    shared  path: string?, folder: boolean
    only A  slug, template
    only B  role, file
  **Fix** — No action needed beyond the note.
- **SCALAR_OPS** — `SCALAR_OPS` looks like `scalarHandlers`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 34%  ·  Values 0%
  Properties  34%  0/9 shared agree in type  (9↔19 properties)
    type differs  gt: string ≠ function, gte: string ≠ function, lt: string ≠ function, lte: string ≠ function, equals: string ≠ function, in: string ≠ function, not: string ≠ function, isSet: string ≠ function, matches: string ≠ function
    only B  isNull, isEmpty, notIn, contains, startsWith, endsWith, location, or, and, xor
  Values  0%  9 value path(s) compared
    ≠ gt: > ↔ ƒ
    ≠ gte: ≥ ↔ ƒ
    ≠ lt: < ↔ ƒ
    ≠ lte: ≤ ↔ ƒ
    ≠ equals: = ↔ ƒ
    ≠ in: in ↔ ƒ
    ≠ not: ≠ ↔ ƒ
    ≠ isSet: is set ↔ ƒ
    ≠ matches: matches ↔ ƒ
    only B  isNull, isEmpty, notIn, contains, startsWith, endsWith, location, or, and, xor
  **Fix** — No action needed beyond the note.
- **CssNode** — `CssNode` looks like `MemberFact`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 41%
  Properties  41%  2/3 shared agree in type  (5↔5 properties)
    shared  type: string, name: string?
    type differs  value: string? ≠ number|string?
    only A  unit, children
    only B  is, members
  **Fix** — No action needed beyond the note.
- **ReportObject** — `ReportObject` looks like `StructureCode`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 40%
  Properties  40%  1/3 shared agree in type  (9↔3 properties)
    shared  ask: string?
    type differs  message: string? ≠ fn<StructureFacts>:string, fix: ReportFix|string? ≠ fn<StructureFacts>:string
    only A  description, code, path, place, to, from
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `FileVars`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 35%
  Properties  35%  2/2 shared agree in type  (13↔3 properties)
    shared  dir: string?, basename: string?
    only A  abs, rel, sf, repoRoot, aliases, arch, roles, roleCtx, facts, repoFiles, dedupe
    only B  path
  **Fix** — No action needed beyond the note.
- **inv2** — `inv2` looks like `inv3`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 35%
  Properties  35%  1/2 shared agree in type  (2↔2 properties)
    shared  id: string
    type differs  infer: {scopeChains:{any:{chain:{contains:string}}}}[] ≠ {scopeChains:{any:{via:{equals:string}}}}[]
  **Fix** — No action needed beyond the note.

## Aliases / inheritance (10)

| Entity | Location | Reuses | Location |
| --- | --- | --- | --- |
| QueryFilter | `entities/architecture.ts:21` | FieldValue | `utils/field.ts:21` |
| RunFacts | `entities/context.ts:16` | Facts | `entities/kinds.ts:40` |
| PlanPlace | `entities/enriched-finding.ts:16` | Place | `entities/facts.ts:229` |
| PlanPlace | `entities/enriched-finding.ts:16` | Place | `entities/place.ts:7` |
| PlanPlace | `entities/enriched-finding.ts:16` | Place | `entities/location/homes.ts:26` |
| StoryBase | `entities/story.ts:39` | UnknownRoleStory | `entities/story.ts:62` |
| StoryBase | `entities/story.ts:39` | FileContentsStory | `entities/story.ts:65` |
| ConfigValue | `report/configErrors.ts:15` | FieldValue | `utils/field.ts:21` |
| Box | `report/user-report/src/utils/layout/types.ts:21` | Rect | `report/user-report/src/utils/layout/types.ts:31` |
| ConfigValue | `utils/configs.ts:23` | FieldValue | `utils/field.ts:21` |

## Cross-file copies (2)

### facts · StructureFacts

2 entities describe the same shape across files. Nothing shared exists yet, so the fix is one shared type — weakest link 0.86 (86%).

| Entity | Location | Kind |
| --- | --- | --- |
| facts | `tests/report/errorTypes.test.ts:154` | object |
| StructureFacts | `entities/structure-facts.ts:8` | type |

**Fix** — Extract a shared type for the shared members and have both `facts` and `StructureFacts` use it.

### a · b

2 entities describe the same shape across files. Nothing shared exists yet, so the fix is one shared type — weakest link 0.85 (85%).

| Entity | Location | Kind |
| --- | --- | --- |
| a | `tests/report/access-graph.test.ts:188` | object |
| b | `tests/report/access-graph.test.ts:189` | object |

**Fix** — Extract a shared type for the shared members and have both `a` and `b` use it.

## Duplicate trees (26)

### Duplicates of WhereEntry

- WhereEntry `entities/architecture.ts:49`
  - RoleHome `entities/architecture.ts:106`
### Duplicates of Walk

- Walk `report/user-report/shared/describe.ts:30`
  - DescribeOptions `report/user-report/shared/describe.ts:26`
### Duplicates of Unplaceable

- Unplaceable `entities/access-graph.ts:39`
  - Loop `report/user-report/src/components/access-graph/NodeBox.tsx:31`
### Duplicates of TemplateExpr

- TemplateExpr `css/template.ts:15`
  - at `css/values.ts:70`
### Duplicates of SCREENS

- SCREENS `report/user-report/src/App.tsx:12`
  - counters `report/user-report/src/components/Shell.tsx:82`
### Duplicates of scalarHandlers

- scalarHandlers `entities/queries.ts:112`
  - SCALAR_OPS `entities/operators.ts:19`
### Duplicates of RoleDef

- RoleDef `entities/architecture.ts:76`
  - Definition `utils/classify.ts:16`
### Duplicates of ReportObject

- ReportObject `entities/architecture.ts:31`
  - StructureCode `report/errorTypes/codes/structure.ts:11`
### Duplicates of REPAIR_WORDS

- REPAIR_WORDS `report/user-report/src/graph/representation/repair-words.ts:10`
  - __exported_asks `report/asks.ts:81`
### Duplicates of RawArch

- RawArch `entities/architecture.ts:218`
  - ARCH `tests/report/overview.test.ts:14`
    - arch `tests/code-roles/connector.test.ts:38`
    - arch `tests/report/access-graph.test.ts:40`
    - ARCH `tests/finally-follow-architecture/writes.test.ts:55`
    - ARCH `tests/report/role-example-marks.test.ts:18`
    - arch2 `tests/report/access-graph.test.ts:142`
### Duplicates of Plan

- Plan `entities/enriched-finding.ts:18`
  - CtxPlan `entities/decision-ctx.ts:30`
### Duplicates of Places

- Places `entities/decision-ctx.ts:19`
  - places `tests/report/errorTypes.test.ts:38`
### Duplicates of NodeSummary

- NodeSummary `entities/overview-summaries.ts:49`
  - a `tests/report/access-graph.test.ts:188`
  - b `tests/report/access-graph.test.ts:189`
### Duplicates of MoveAsk

- MoveAsk `report/asks.ts:33`
  - Resolved `entities/location.ts:74`
### Duplicates of Leaf

- Leaf `entities/facts.ts:226`
  - item `tests/entities/queries.test.ts:43`
### Duplicates of Invariant

- Invariant `entities/architecture.ts:86`
  - inv `tests/invariants/invariants.test.ts:26`
    - inv2 `tests/invariants/invariants.test.ts:62`
    - inv3 `tests/invariants/invariants.test.ts:65`
    - or `tests/invariants/invariants.test.ts:136`
    - perCandidate `tests/invariants/invariants.test.ts:116`
    - xor `tests/invariants/invariants.test.ts:138`
### Duplicates of FileFacts

- FileFacts `entities/facts.ts:252`
  - facts `tests/entities/kinds.test.ts:16`
    - empty `tests/entities/kinds.test.ts:84`
  - named `tests/invariants/invariants.test.ts:200`
  - ns `tests/invariants/invariants.test.ts:206`
  - plain `tests/invariants/invariants.test.ts:197`
  - star `tests/invariants/invariants.test.ts:203`
### Duplicates of FileContext

- FileContext `entities/context.ts:18`
  - FileVarsCtx `invariants/name.ts:10`
### Duplicates of facts

- facts `tests/report/errorTypes.test.ts:154`
  - StructureFacts `entities/structure-facts.ts:8`
### Duplicates of Destination

- Destination `entities/story.ts:24`
  - Scored `report/errorTypes/destinations.ts:115`
### Duplicates of DecisionCtx

- DecisionCtx `entities/decision-ctx.ts:51`
  - ctx `tests/report/errorTypes.test.ts:127`
  - CTX `tests/report/errorTypes.test.ts:52`
### Duplicates of CollectOptions

- CollectOptions `entities/ast/file-facts.ts:20`
  - ResolveContext `utils/imports.ts:97`
### Duplicates of CandidateArgs

- CandidateArgs `report/errorTypes/destinations.ts:114`
  - Tuning `report/errorTypes/destinations.ts:156`
### Duplicates of Candidate

- Candidate `entities/facts.ts:196`
  - scope `tests/entities/queries.test.ts:86`
### Duplicates of ActionAsk

- ActionAsk `report/user-report/data/graph-edges.ts:55`
  - Outgoing `report/user-report/src/components/role-detail/cards.tsx:22`
### Duplicates of AccessEdge

- AccessEdge `entities/access-graph.ts:14`
  - e `tests/report/layout.test.ts:85`

## Shared-entity candidates (48)

- **a** `tests/report/access-graph.test.ts:188` ↔ **b** `tests/report/access-graph.test.ts:189` (1)
  - shared: slug, name, paths, fileCount, parents — extract a shared type for slug, name, paths, fileCount, parents
- **RoleNode** `entities/access-graph.ts:57` ↔ **a** `tests/report/access-graph.test.ts:188` (0.663)
  - shared: slug, name, paths, fileCount — extract a shared type for slug, name, paths, fileCount
- **RoleNode** `entities/access-graph.ts:57` ↔ **b** `tests/report/access-graph.test.ts:189` (0.663)
  - shared: slug, name, paths, fileCount — extract a shared type for slug, name, paths, fileCount
- **PlaceBox** `report/user-report/src/graph/representation/contract.ts:26` ↔ **a** `tests/report/access-graph.test.ts:188` (0.58)
  - shared: slug, name, paths, parents — extract a shared type for slug, name, paths, parents
- **PlaceBox** `report/user-report/src/graph/representation/contract.ts:26` ↔ **b** `tests/report/access-graph.test.ts:189` (0.58)
  - shared: slug, name, paths, parents — extract a shared type for slug, name, paths, parents
- **Unplaceable** `entities/access-graph.ts:39` ↔ **Mention** `entities/access-graph.ts:43` (0.567)
  - shared: kind, targetRole — extract a shared type for kind, targetRole
- **BindingFact** `entities/facts.ts:108` ↔ **ConstructorParam** `entities/facts.ts:139` (0.567)
  - shared: name, type — extract a shared type for name, type
- **Destination** `entities/location/homes.ts:24` ↔ **Place** `entities/location/homes.ts:26` (0.507)
  - shared: path, folder — extract a shared type for path, folder
- **Place** `entities/location/homes.ts:26` ↔ **Spot** `entities/tree/entries.ts:24` (0.507)
  - shared: path, folder — extract a shared type for path, folder
- **View** `report/user-report/src/components/access-graph/useZoomPan.ts:19` ↔ **Box** `report/user-report/src/utils/layout/types.ts:21` (0.507)
  - shared: x, y — extract a shared type for x, y
- **ACTION_KEYS** `code-roles/roles.ts:93` ↔ **ActionDef** `entities/architecture.ts:68` (0.5)
  - shared: where, except, of, scopeAccess — extract a shared type for where, except, of, scopeAccess
- **theme** `report/user-report/src/theme.ts:7` ↔ **DefaultTheme** `report/user-report/src/theme.ts:41` (0.5)
  - shared: color, font, radius, space — extract a shared type for color, font, radius, space
- **RoleDef** `entities/architecture.ts:76` ↔ **RawNode** `entities/architecture.ts:197` (0.465)
  - shared: slug, name, report — extract a shared type for slug, name, report
- **Misfit** `pipeline-roles.ts:19` ↔ **Located** `entities/facts.ts:17` (0.463)
  - shared: name, line — extract a shared type for name, line
- **CountGroup** `entities/overview-data.ts:18` ↔ **Count** `utils/count.ts:10` (0.463)
  - shared: key, count — extract a shared type for key, count
- **hostFile** `tests/code-roles/classify.test.ts:165` ↔ **plainFile** `tests/code-roles/classify.test.ts:166` (0.463)
  - shared: imports, path — extract a shared type for imports, path
- **facts** `tests/invariants/invariants.test.ts:50` ↔ **bare** `tests/invariants/invariants.test.ts:68` (0.463)
  - shared: lines, scopeChains — extract a shared type for lines, scopeChains
- **named** `tests/invariants/invariants.test.ts:200` ↔ **ns** `tests/invariants/invariants.test.ts:206` (0.463)
  - shared: lines, exports — extract a shared type for lines, exports
- **Invariant** `entities/architecture.ts:86` ↔ **InvariantSummary** `entities/overview-summaries.ts:69` (0.44)
  - shared: id, where, ignore, when, infer, report, dedupeBy — extract a shared type for id, where, ignore, when, infer, report, dedupeBy
- **CssNode** `css/css-tree.ts:17` ↔ **MemberFact** `entities/facts.ts:22` (0.414)
  - shared: type, name, value — extract a shared type for type, name, value
- **inv2** `tests/invariants/invariants.test.ts:62` ↔ **inv3** `tests/invariants/invariants.test.ts:65` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **inv2** `tests/invariants/invariants.test.ts:62` ↔ **perCandidate** `tests/invariants/invariants.test.ts:116` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **inv2** `tests/invariants/invariants.test.ts:62` ↔ **or** `tests/invariants/invariants.test.ts:136` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **inv2** `tests/invariants/invariants.test.ts:62` ↔ **xor** `tests/invariants/invariants.test.ts:138` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **inv3** `tests/invariants/invariants.test.ts:65` ↔ **perCandidate** `tests/invariants/invariants.test.ts:116` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **inv3** `tests/invariants/invariants.test.ts:65` ↔ **or** `tests/invariants/invariants.test.ts:136` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **inv3** `tests/invariants/invariants.test.ts:65` ↔ **xor** `tests/invariants/invariants.test.ts:138` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **perCandidate** `tests/invariants/invariants.test.ts:116` ↔ **or** `tests/invariants/invariants.test.ts:136` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **perCandidate** `tests/invariants/invariants.test.ts:116` ↔ **xor** `tests/invariants/invariants.test.ts:138` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **or** `tests/invariants/invariants.test.ts:136` ↔ **xor** `tests/invariants/invariants.test.ts:138` (0.347)
  - shared: id, infer — extract a shared type for id, infer
- **plain** `tests/invariants/invariants.test.ts:197` ↔ **named** `tests/invariants/invariants.test.ts:200` (0.347)
  - shared: lines, exports — extract a shared type for lines, exports
- **plain** `tests/invariants/invariants.test.ts:197` ↔ **star** `tests/invariants/invariants.test.ts:203` (0.347)
  - shared: lines, exports — extract a shared type for lines, exports
- **plain** `tests/invariants/invariants.test.ts:197` ↔ **ns** `tests/invariants/invariants.test.ts:206` (0.347)
  - shared: lines, exports — extract a shared type for lines, exports
- **named** `tests/invariants/invariants.test.ts:200` ↔ **star** `tests/invariants/invariants.test.ts:203` (0.347)
  - shared: lines, exports — extract a shared type for lines, exports
- **star** `tests/invariants/invariants.test.ts:203` ↔ **ns** `tests/invariants/invariants.test.ts:206` (0.347)
  - shared: lines, exports — extract a shared type for lines, exports
- **arch** `tests/report/access-graph.test.ts:40` ↔ **arch2** `tests/report/access-graph.test.ts:142` (0.347)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **TitleArgs** `report/user-report/data/finding-title.ts:22` ↔ **accepted** `tests/config/invalid-config.test.ts:368` (0.3)
  - shared: invariant, role, node — extract a shared type for invariant, role, node
- **InvariantRule** `entities/overview-summaries.ts:67` ↔ **StructureCode** `report/errorTypes/codes/structure.ts:11` (0.283)
  - shared: message, fix — extract a shared type for message, fix
- **MatchedRange** `entities/overview-summaries.ts:18` ↔ **StoryBase** `entities/story.ts:39` (0.253)
  - shared: from, to — extract a shared type for from, to
- **arch** `tests/code-roles/connector.test.ts:38` ↔ **ARCH** `tests/finally-follow-architecture/writes.test.ts:55` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **arch** `tests/code-roles/connector.test.ts:38` ↔ **arch** `tests/report/access-graph.test.ts:40` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **arch** `tests/code-roles/connector.test.ts:38` ↔ **arch2** `tests/report/access-graph.test.ts:142` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **arch** `tests/code-roles/connector.test.ts:38` ↔ **ARCH** `tests/report/role-example-marks.test.ts:18` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **ARCH** `tests/finally-follow-architecture/writes.test.ts:55` ↔ **arch** `tests/report/access-graph.test.ts:40` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **ARCH** `tests/finally-follow-architecture/writes.test.ts:55` ↔ **arch2** `tests/report/access-graph.test.ts:142` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **ARCH** `tests/finally-follow-architecture/writes.test.ts:55` ↔ **ARCH** `tests/report/role-example-marks.test.ts:18` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **arch** `tests/report/access-graph.test.ts:40` ↔ **ARCH** `tests/report/role-example-marks.test.ts:18` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles
- **arch2** `tests/report/access-graph.test.ts:142` ↔ **ARCH** `tests/report/role-example-marks.test.ts:18` (0.231)
  - shared: nodes, codeRoles — extract a shared type for nodes, codeRoles

## Refactor suggestions (2)

- **shared-type** — 2 entities share only properties (seen, dest, duplicate, homeHere, roles, held, named, asDir) — extract a shared type/interface for the common fields.
  - entities: facts, StructureFacts
  - members: seen, dest, duplicate, homeHere, roles, held, named, asDir
- **shared-type** — 2 entities share only properties (slug, name, paths, fileCount, parents) — extract a shared type/interface for the common fields.
  - entities: a, b
  - members: slug, name, paths, fileCount, parents

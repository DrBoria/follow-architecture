# Entity similarity report

Scanned 256 file(s), found 391 entities.

Found 0 duplicate pair(s), 3 extraction candidate pair(s), and 65 weakly-similar pair(s) (after filtering out 1 match(es)).

## Strong extraction candidates (extract ≤ confidence < duplicate) (3)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `extract:css/core/pieces.ts#Span=>entities/findings.ts#FindingHighlight` | Span | `css/core/pieces.ts:17` | FindingHighlight | `entities/findings.ts:36` | 0.60 | Properties | Extract a shared type for the shared members and have both `Span` and `FindingHighlight` use it. |
| `extract:css/core/css-tree.ts#TypeSyntaxNode=>css/core/css-tree.ts#TypeDefinition` | TypeSyntaxNode | `css/core/css-tree.ts:54` | TypeDefinition | `css/core/css-tree.ts:65` | 0.58 | Properties | Extract a shared type for the shared members and have both `TypeSyntaxNode` and `TypeDefinition` use it. |
| `extract:css/core/pieces.ts#Span=>css/resolve/substitute.ts#VariableToken` | Span | `css/core/pieces.ts:17` | VariableToken | `css/resolve/substitute.ts:21` | 0.52 | Properties | Extract a shared type for the shared members and have both `Span` and `VariableToken` use it. |

### Why each one matched

- **Span** — `Span` and `FindingHighlight` share a large part of their shape — 0.60 (60%). A shared type is worth extracting.
  scores  Properties 70%
  Properties  70%  2/2 shared agree in type  (2↔4 properties)
    shared  start: number, end: number
    only B  text, kind
  **Fix** — Extract a shared type for the shared members and have both `Span` and `FindingHighlight` use it.
- **TypeSyntaxNode** — `TypeSyntaxNode` and `TypeDefinition` share a large part of their shape — 0.58 (58%). A shared type is worth extracting.
  scores  Properties 64%
  Properties  64%  2/2 shared agree in type  (5↔2 properties)
    shared  name: string?, syntax: TypeSyntaxNode?
    only A  type, terms, term
  **Fix** — Extract a shared type for the shared members and have both `TypeSyntaxNode` and `TypeDefinition` use it.
- **Span** — `Span` and `VariableToken` share a large part of their shape — 0.52 (52%). A shared type is worth extracting.
  scores  Properties 60%
  Properties  60%  2/2 shared agree in type  (2↔6 properties)
    shared  start: number, end: number
    only B  kind, name, fallback, broken
  **Fix** — Extract a shared type for the shared members and have both `Span` and `VariableToken` use it.

## Weak similarity (similar ≤ confidence < extract) (66)

| Id | Entity A | Location | Entity B | Location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `similar:entities/access-graph.ts#Unplaceable=>report/user-report/src/components/access-graph/NodeBox.tsx#Loop` | Unplaceable | `entities/access-graph.ts:39` | Loop | `report/user-report/src/components/access-graph/NodeBox.tsx:31` | 0.50 | Properties | No action needed beyond the note. |
| `dropped:entities/architecture.ts#ActionDef=>code-roles/roles.ts#ACTION_KEYS` | ActionDef | `entities/architecture.ts:68` | ACTION_KEYS | `code-roles/roles.ts:93` | 0.50 | Properties | No action needed beyond the note. |
| `similar:entities/location.ts#Resolved=>report/asks.ts#MoveAsk` | Resolved | `entities/location.ts:74` | MoveAsk | `report/asks.ts:33` | 0.49 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/theme.ts#theme=>report/user-report/src/theme.ts#DefaultTheme` | theme | `report/user-report/src/theme.ts:7` | DefaultTheme | `report/user-report/src/theme.ts:41` | 0.49 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#BindingFact=>entities/facts.ts#ConstructorParam` | BindingFact | `entities/facts.ts:108` | ConstructorParam | `entities/facts.ts:139` | 0.49 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchChild=>entities/architecture.ts#RawChildSpec` | ArchChild | `entities/architecture.ts:123` | RawChildSpec | `entities/architecture.ts:185` | 0.49 | Properties | No action needed beyond the note. |
| `similar:entities/overview-data.ts#OverviewMeta=>entities/overview.ts#OverviewInput` | OverviewMeta | `entities/overview-data.ts:20` | OverviewInput | `entities/overview.ts:20` | 0.48 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#Unplaceable=>entities/access-graph.ts#Mention` | Unplaceable | `entities/access-graph.ts:39` | Mention | `entities/access-graph.ts:43` | 0.48 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#Invariant=>entities/overview-summaries.ts#InvariantSummary` | Invariant | `entities/architecture.ts:86` | InvariantSummary | `entities/overview-summaries.ts:69` | 0.48 | Properties | No action needed beyond the note. |
| `similar:css/core/pieces.ts#Branch=>css/resolve/answers.ts#ValueAnswer` | Branch | `css/core/pieces.ts:32` | ValueAnswer | `css/resolve/answers.ts:21` | 0.47 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchNode=>entities/architecture.ts#RawNode` | ArchNode | `entities/architecture.ts:138` | RawNode | `entities/architecture.ts:197` | 0.47 | Properties | No action needed beyond the note. |
| `similar:entities/overview-data.ts#CountGroup=>utils/count.ts#Count` | CountGroup | `entities/overview-data.ts:18` | Count | `utils/count.ts:10` | 0.47 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#WhereEntry=>entities/architecture.ts#RoleHome` | WhereEntry | `entities/architecture.ts:49` | RoleHome | `entities/architecture.ts:106` | 0.46 | Properties | No action needed beyond the note. |
| `similar:report/render-report.ts#TextFinding=>report/user-report/data/finding-title.ts#TitleArgs` | TextFinding | `report/render-report.ts:16` | TitleArgs | `report/user-report/data/finding-title.ts:22` | 0.46 | Properties | No action needed beyond the note. |
| `similar:entities/decision-ctx.ts#CtxPlan=>entities/enriched-finding.ts#Plan` | CtxPlan | `entities/decision-ctx.ts:30` | Plan | `entities/enriched-finding.ts:19` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/overview-summaries.ts#NodeSummary=>report/user-report/src/graph/representation/contract.ts#PlaceBox` | NodeSummary | `entities/overview-summaries.ts:49` | PlaceBox | `report/user-report/src/graph/representation/contract.ts:26` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/ast/file-facts.ts#CollectOptions=>utils/imports.ts#ResolveContext` | CollectOptions | `entities/ast/file-facts.ts:20` | ResolveContext | `utils/imports.ts:97` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#MemberFact=>entities/facts.ts#BindingFact` | MemberFact | `entities/facts.ts:22` | BindingFact | `entities/facts.ts:108` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/location.ts#Resolved=>entities/story.ts#Destination` | Resolved | `entities/location.ts:74` | Destination | `entities/story.ts:24` | 0.45 | Properties | No action needed beyond the note. |
| `similar:report/user-report/shared/describe.ts#DescribeOptions=>report/user-report/shared/describe.ts#Walk` | DescribeOptions | `report/user-report/shared/describe.ts:26` | Walk | `report/user-report/shared/describe.ts:30` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#AssignmentFact=>entities/kinds.ts#WriteInfo` | AssignmentFact | `entities/facts.ts:117` | WriteInfo | `entities/kinds.ts:100` | 0.45 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#ReadFact=>entities/kinds.ts#Edge` | ReadFact | `entities/facts.ts:265` | Edge | `entities/kinds.ts:43` | 0.44 | Properties | No action needed beyond the note. |
| `similar:css/core/pieces.ts#BranchProblem=>entities/findings.ts#FindingHighlight` | BranchProblem | `css/core/pieces.ts:23` | FindingHighlight | `entities/findings.ts:36` | 0.44 | Properties | No action needed beyond the note. |
| `similar:css/index.ts#fact=>entities/facts.ts#CssTemplateFact` | fact | `css/index.ts:112` | CssTemplateFact | `entities/facts.ts:151` | 0.44 | Properties | No action needed beyond the note. |
| `similar:entities/location/homes.ts#Destination=>entities/location/homes.ts#Place` | Destination | `entities/location/homes.ts:24` | Place | `entities/location/homes.ts:26` | 0.44 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ReportObject=>entities/repair.ts#Repair` | ReportObject | `entities/architecture.ts:31` | Repair | `entities/repair.ts:25` | 0.43 | Properties | No action needed beyond the note. |
| `similar:entities/findings.ts#FindingHighlight=>entities/ast/comments.ts#CommentSpan` | FindingHighlight | `entities/findings.ts:36` | CommentSpan | `entities/ast/comments.ts:33` | 0.43 | Properties | No action needed beyond the note. |
| `similar:entities/location/homes.ts#Place=>entities/tree/entries.ts#Spot` | Place | `entities/location/homes.ts:26` | Spot | `entities/tree/entries.ts:24` | 0.43 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/components/access-graph/useZoomPan.ts#View=>report/user-report/src/utils/layout/types.ts#Box` | View | `report/user-report/src/components/access-graph/useZoomPan.ts:19` | Box | `report/user-report/src/utils/layout/types.ts:21` | 0.43 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>invariants/name.ts#FileVarsCtx` | FileContext | `entities/context.ts:19` | FileVarsCtx | `invariants/name.ts:10` | 0.42 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#RoleDef=>entities/architecture.ts#RawNode` | RoleDef | `entities/architecture.ts:76` | RawNode | `entities/architecture.ts:197` | 0.42 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#RoleDef=>utils/classify.ts#Definition` | RoleDef | `entities/architecture.ts:76` | Definition | `utils/classify.ts:16` | 0.41 | Properties | No action needed beyond the note. |
| `similar:entities/facts.ts#MemberFact=>entities/facts.ts#ConstructorParam` | MemberFact | `entities/facts.ts:22` | ConstructorParam | `entities/facts.ts:139` | 0.41 | Properties | No action needed beyond the note. |
| `similar:entities/story.ts#Destination=>report/errorTypes/destinations.ts#Scored` | Destination | `entities/story.ts:24` | Scored | `report/errorTypes/destinations.ts:115` | 0.41 | Properties | No action needed beyond the note. |
| `similar:css/core/css-tree.ts#TypeSyntaxNode=>entities/facts.ts#BindingFact` | TypeSyntaxNode | `css/core/css-tree.ts:54` | BindingFact | `entities/facts.ts:108` | 0.40 | Properties | No action needed beyond the note. |
| `similar:css/core/pieces.ts#BranchProblem=>entities/facts.ts#ArgumentFact` | BranchProblem | `css/core/pieces.ts:23` | ArgumentFact | `entities/facts.ts:88` | 0.40 | Properties | No action needed beyond the note. |
| `similar:css/core/css-tree.ts#TypeSyntaxNode=>entities/facts.ts#ConstructorParam` | TypeSyntaxNode | `css/core/css-tree.ts:54` | ConstructorParam | `entities/facts.ts:139` | 0.40 | Properties | No action needed beyond the note. |
| `similar:css/resolve/substitute.ts#VariableToken=>entities/findings.ts#FindingHighlight` | VariableToken | `css/resolve/substitute.ts:21` | FindingHighlight | `entities/findings.ts:36` | 0.40 | Properties | No action needed beyond the note. |
| `similar:css/styled/document.ts#DocumentOptions=>css/styled/document.ts#DocumentFacts` | DocumentOptions | `css/styled/document.ts:240` | DocumentFacts | `css/styled/document.ts:245` | 0.40 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchVariant=>entities/architecture.ts#ArchNode` | ArchVariant | `entities/architecture.ts:113` | ArchNode | `entities/architecture.ts:138` | 0.40 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ArchChild=>entities/architecture.ts#ArchNode` | ArchChild | `entities/architecture.ts:123` | ArchNode | `entities/architecture.ts:138` | 0.40 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/components/access-graph/useZoomPan.ts#View=>report/user-report/src/components/access-graph/useZoomPan.ts#Drag` | View | `report/user-report/src/components/access-graph/useZoomPan.ts:19` | Drag | `report/user-report/src/components/access-graph/useZoomPan.ts:60` | 0.40 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#RoleNode=>entities/overview-summaries.ts#NodeSummary` | RoleNode | `entities/access-graph.ts:57` | NodeSummary | `entities/overview-summaries.ts:49` | 0.39 | Properties | No action needed beyond the note. |
| `similar:report/user-report/src/App.tsx#SCREENS=>report/user-report/src/components/Shell.tsx#counters` | SCREENS | `report/user-report/src/App.tsx:12` | counters | `report/user-report/src/components/Shell.tsx:82` | 0.39 | Properties | No action needed beyond the note. |
| `similar:css/core/values.ts#at=>css/styled/template.ts#TemplateExpr` | at | `css/core/values.ts:70` | TemplateExpr | `css/styled/template.ts:15` | 0.39 | Properties | No action needed beyond the note. |
| `similar:css/index.ts#fact=>entities/facts.ts#JsxElementFact` | fact | `css/index.ts:112` | JsxElementFact | `entities/facts.ts:177` | 0.39 | Properties | No action needed beyond the note. |
| `similar:css/core/css-tree.ts#CssNode=>entities/facts.ts#ConstructorParam` | CssNode | `css/core/css-tree.ts:25` | ConstructorParam | `entities/facts.ts:139` | 0.39 | Properties | No action needed beyond the note. |
| `similar:entities/findings.ts#FindingItem=>report/render-report.ts#TextFinding` | FindingItem | `entities/findings.ts:19` | TextFinding | `report/render-report.ts:16` | 0.39 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>entities/ast/file-facts.ts#CollectOptions` | FileContext | `entities/context.ts:19` | CollectOptions | `entities/ast/file-facts.ts:20` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>frameworks/facet.ts#FacetContext` | FileContext | `entities/context.ts:19` | FacetContext | `frameworks/facet.ts:23` | 0.38 | Properties | No action needed beyond the note. |
| `similar:css/core/css-tree.ts#CssNode=>entities/facts.ts#BindingFact` | CssNode | `css/core/css-tree.ts:25` | BindingFact | `entities/facts.ts:108` | 0.38 | Properties | No action needed beyond the note. |
| `similar:css/core/scope-types.ts#ProviderLiteral=>report/asks.ts#MoveAsk` | ProviderLiteral | `css/core/scope-types.ts:15` | MoveAsk | `report/asks.ts:33` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#RoleNode=>entities/overview-summaries.ts#RoleHome` | RoleNode | `entities/access-graph.ts:57` | RoleHome | `entities/overview-summaries.ts:30` | 0.38 | Properties | No action needed beyond the note. |
| `similar:entities/findings.ts#FindingItem=>utils/configs.ts#ConfigIssue` | FindingItem | `entities/findings.ts:19` | ConfigIssue | `utils/configs.ts:38` | 0.38 | Properties | No action needed beyond the note. |
| `similar:css/core/scope-types.ts#ProviderLiteral=>entities/architecture.ts#RawChildSpec` | ProviderLiteral | `css/core/scope-types.ts:15` | RawChildSpec | `entities/architecture.ts:185` | 0.37 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#RawChildSpec=>entities/architecture.ts#RawNode` | RawChildSpec | `entities/architecture.ts:185` | RawNode | `entities/architecture.ts:197` | 0.37 | Properties | No action needed beyond the note. |
| `similar:entities/context.ts#FileContext=>utils/imports.ts#ResolveContext` | FileContext | `entities/context.ts:19` | ResolveContext | `utils/imports.ts:97` | 0.37 | Properties | No action needed beyond the note. |
| `similar:entities/enriched-finding.ts#EnrichedFinding=>report/user-report/data/finding-title.ts#TitleArgs` | EnrichedFinding | `entities/enriched-finding.ts:49` | TitleArgs | `report/user-report/data/finding-title.ts:22` | 0.37 | Properties | No action needed beyond the note. |
| `similar:css/core/pieces.ts#BranchProblem=>entities/kinds.ts#fact` | BranchProblem | `css/core/pieces.ts:23` | fact | `entities/kinds.ts:152` | 0.37 | Properties | No action needed beyond the note. |
| `similar:entities/access-graph.ts#GraphViolation=>entities/ast/resolve.ts#DeclInfo` | GraphViolation | `entities/access-graph.ts:46` | DeclInfo | `entities/ast/resolve.ts:20` | 0.36 | Properties | No action needed beyond the note. |
| `similar:css/core/pieces.ts#Branch=>css/resolve/theme-value.ts#ProviderReading` | Branch | `css/core/pieces.ts:32` | ProviderReading | `css/resolve/theme-value.ts:15` | 0.36 | Properties | No action needed beyond the note. |
| `similar:entities/enriched-finding.ts#EnrichedFinding=>report/render-report.ts#TextFinding` | EnrichedFinding | `entities/enriched-finding.ts:49` | TextFinding | `report/render-report.ts:16` | 0.36 | Properties | No action needed beyond the note. |
| `similar:entities/location/homes.ts#Destination=>entities/tree/entries.ts#Spot` | Destination | `entities/location/homes.ts:24` | Spot | `entities/tree/entries.ts:24` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/operators.ts#SCALAR_OPS=>entities/queries.ts#scalarHandlers` | SCALAR_OPS | `entities/operators.ts:19` | scalarHandlers | `entities/queries.ts:112` | 0.35 | Properties | No action needed beyond the note. |
| `similar:css/core/pieces.ts#BranchProblem=>entities/facts.ts#Candidate` | BranchProblem | `css/core/pieces.ts:23` | Candidate | `entities/facts.ts:211` | 0.35 | Properties | No action needed beyond the note. |
| `similar:entities/architecture.ts#ReportObject=>report/errorTypes/codes/structure.ts#StructureCode` | ReportObject | `entities/architecture.ts:31` | StructureCode | `report/errorTypes/codes/structure.ts:11` | 0.35 | Properties | No action needed beyond the note. |

### Why each one matched

- **Unplaceable** — `Unplaceable` looks like `Loop`, but not closely enough to call it a copy — 0.50 (50%).
  scores  Properties 58%
  Properties  58%  1/2 shared agree in type  (3↔2 properties)
    shared  kind: string
    type differs  who: string ≠ string[]
    only A  targetRole
  **Fix** — No action needed beyond the note.
- **ActionDef** — `ActionDef` and `ACTION_KEYS` were filtered out — usage: ACTION_KEYS uses ActionDef Filtered out by `drop-usages`: usage: ACTION_KEYS uses ActionDef
  scores  Properties 50%
  Properties  50%  0/4 shared agree in type  (4↔4 properties)
    type differs  where: WhereEntry[]? ≠ function, except: WhereEntry[]? ≠ function, of: string? ≠ function, scopeAccess: ScopeAccessor[]? ≠ function
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
- **Invariant** — `Invariant` looks like `InvariantSummary`, but not closely enough to call it a copy — 0.48 (48%).
  scores  Properties 47%
  Properties  47%  1/7 shared agree in type  (8↔8 properties)
    shared  id: string
    type differs  where: WhereEntry[] ≠ string[], ignore: WhereEntry[] ≠ string[], when: QueryFilter? ≠ string[], infer: QueryFilter[] ≠ InvariantRule[], report: ReportValue ≠ string?, dedupeBy: WhereEntry[] ≠ string[]
    only A  children
    only B  findingCount
  **Fix** — No action needed beyond the note.
- **Branch** — `Branch` looks like `ValueAnswer`, but not closely enough to call it a copy — 0.47 (48%).
  scores  Properties 54%
  Properties  54%  3/4 shared agree in type  (7↔5 properties)
    shared  problems: BranchProblem[], directive: boolean?, dynamic: boolean?
    type differs  absent: {provider:string;text:string}[]? ≠ string[]?
    only A  text, provider, media
    only B  values
  **Fix** — No action needed beyond the note.
- **ArchNode** — `ArchNode` looks like `RawNode`, but not closely enough to call it a copy — 0.47 (47%).
  scores  Properties 47%
  Properties  47%  4/5 shared agree in type  (15↔6 properties)
    shared  slug: string, name: string, parent: string|string[]?, report: ReportValue?
    type differs  children: ArchChild[] ≠ RawChild[]?
    only A  parents, roles, required, variants, path, re, prefixRe, prefixNames, literalLen, isFile
    only B  role
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
- **MemberFact** — `MemberFact` looks like `BindingFact`, but not closely enough to call it a copy — 0.45 (45%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (5↔3 properties)
    shared  name: string?, type: string?
    only A  is, value, members
    only B  typeFile
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
- **BranchProblem** — `BranchProblem` looks like `FindingHighlight`, but not closely enough to call it a copy — 0.44 (44%).
  scores  Properties 51%
  Properties  51%  2/2 shared agree in type  (3↔4 properties)
    shared  kind: string, text: string?
    only A  name
    only B  start, end
  **Fix** — No action needed beyond the note.
- **fact** — `fact` looks like `CssTemplateFact`, but not closely enough to call it a copy — 0.44 (44%).
  scores  Properties 46%
  Properties  46%  2/4 shared agree in type  (4↔9 properties)
    shared  tag: string, line: number
    type differs  startLine: object ≠ number?, comment: { text: string; line: number; } ≠ {text:string;line:number?}?
    only B  declarations, rules, literals, vars, exprs
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
- **FindingHighlight** — `FindingHighlight` looks like `CommentSpan`, but not closely enough to call it a copy — 0.43 (44%).
  scores  Properties 51%
  Properties  51%  2/2 shared agree in type  (4↔3 properties)
    shared  end: number, kind: string
    only A  text, start
    only B  pos
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
- **FileContext** — `FileContext` looks like `FileVarsCtx`, but not closely enough to call it a copy — 0.42 (42%).
  scores  Properties 44%
  Properties  44%  2/3 shared agree in type  (14↔3 properties)
    shared  rel: string, basename: string?
    type differs  facts: RunFacts? ≠ {location:{path:string}?}?
    only A  abs, dir, sf, repoRoot, aliases, arch, roles, roleCtx, repoFiles, dedupe, providersFor
  **Fix** — No action needed beyond the note.
- **RoleDef** — `RoleDef` looks like `RawNode`, but not closely enough to call it a copy — 0.42 (42%).
  scores  Properties 47%
  Properties  47%  3/3 shared agree in type  (5↔6 properties)
    shared  slug: string, name: string, report: ReportValue
    only A  infer, actions
    only B  parent, children, role
  **Fix** — No action needed beyond the note.
- **RoleDef** — `RoleDef` looks like `Definition`, but not closely enough to call it a copy — 0.41 (41%).
  scores  Properties 48%
  Properties  48%  1/2 shared agree in type  (5↔2 properties)
    shared  name: string
    type differs  infer: QueryFilter[] ≠ QueryFilter
    only A  slug, report, actions
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
- **TypeSyntaxNode** — `TypeSyntaxNode` looks like `BindingFact`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (5↔3 properties)
    shared  type: string?, name: string?
    only A  terms, term, syntax
    only B  typeFile
  **Fix** — No action needed beyond the note.
- **BranchProblem** — `BranchProblem` looks like `ArgumentFact`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (3↔5 properties)
    shared  kind: string, text: string?
    only A  name
    only B  index, root, type
  **Fix** — No action needed beyond the note.
- **TypeSyntaxNode** — `TypeSyntaxNode` looks like `ConstructorParam`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 47%
  Properties  47%  2/2 shared agree in type  (5↔3 properties)
    shared  type: string?, name: string?
    only A  terms, term, syntax
    only B  decorators
  **Fix** — No action needed beyond the note.
- **VariableToken** — `VariableToken` looks like `FindingHighlight`, but not closely enough to call it a copy — 0.40 (40%).
  scores  Properties 46%
  Properties  46%  2/3 shared agree in type  (6↔4 properties)
    shared  start: number, end: number
    type differs  kind: "css"|"scss" ≠ string
    only A  name, fallback, broken
    only B  text
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
- **at** — `at` looks like `TemplateExpr`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 45%
  Properties  45%  1/2 shared agree in type  (2↔4 properties)
    shared  text: string
    type differs  line: object ≠ number
    only B  index, offset
  **Fix** — No action needed beyond the note.
- **fact** — `fact` looks like `JsxElementFact`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 40%
  Properties  40%  2/2 shared agree in type  (4↔4 properties)
    shared  tag: string, line: number
    only A  startLine, comment
    only B  attributes, spreads
  **Fix** — No action needed beyond the note.
- **CssNode** — `CssNode` looks like `ConstructorParam`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 44%
  Properties  44%  2/2 shared agree in type  (6↔3 properties)
    shared  type: string, name: string?
    only A  value, unit, children, loc
    only B  decorators
  **Fix** — No action needed beyond the note.
- **FindingItem** — `FindingItem` looks like `TextFinding`, but not closely enough to call it a copy — 0.39 (39%).
  scores  Properties 40%
  Properties  40%  4/4 shared agree in type  (7↔11 properties)
    shared  line: number?, message: string?, fix: string?, role: string?
    only A  key, report, data
    only B  file, what, node, rule, token, singularToken, targetPath
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `CollectOptions`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 42%
  Properties  42%  3/4 shared agree in type  (14↔5 properties)
    shared  rel: string, repoRoot: string?, repoFiles: string[]?
    type differs  aliases: Record<string,string>? ≠ AliasMap?
    only A  abs, dir, basename, sf, arch, roles, roleCtx, facts, dedupe, providersFor
    only B  candidates
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `FacetContext`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 35%
  Properties  35%  3/3 shared agree in type  (14↔5 properties)
    shared  rel: string, sf: SourceFile?, repoRoot: string?
    only A  abs, dir, basename, aliases, arch, roles, roleCtx, facts, repoFiles, dedupe, providersFor
    only B  text, importMap
  **Fix** — No action needed beyond the note.
- **CssNode** — `CssNode` looks like `BindingFact`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 44%
  Properties  44%  2/2 shared agree in type  (6↔3 properties)
    shared  type: string, name: string?
    only A  value, unit, children, loc
    only B  typeFile
  **Fix** — No action needed beyond the note.
- **ProviderLiteral** — `ProviderLiteral` looks like `MoveAsk`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 43%
  Properties  43%  1/2 shared agree in type  (2↔7 properties)
    shared  name: string
    type differs  node: ObjectLiteralExpression ≠ string?
    only B  what, to, why, plural, path
  **Fix** — No action needed beyond the note.
- **RoleNode** — `RoleNode` looks like `RoleHome`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 35%
  Properties  35%  2/2 shared agree in type  (6↔4 properties)
    shared  slug: string, paths: string[]
    only A  name, places, note, fileCount
    only B  label, labels
  **Fix** — No action needed beyond the note.
- **FindingItem** — `FindingItem` looks like `ConfigIssue`, but not closely enough to call it a copy — 0.38 (38%).
  scores  Properties 42%
  Properties  42%  2/2 shared agree in type  (7↔3 properties)
    shared  key: string?, message: string?
    only A  report, line, data, fix, role
    only B  path
  **Fix** — No action needed beyond the note.
- **ProviderLiteral** — `ProviderLiteral` looks like `RawChildSpec`, but not closely enough to call it a copy — 0.37 (37%).
  scores  Properties 43%
  Properties  43%  1/2 shared agree in type  (2↔7 properties)
    shared  name: string
    type differs  node: ObjectLiteralExpression ≠ string?
    only B  role, required, forbidden, query, report
  **Fix** — No action needed beyond the note.
- **RawChildSpec** — `RawChildSpec` looks like `RawNode`, but not closely enough to call it a copy — 0.37 (37%).
  scores  Properties 38%
  Properties  38%  3/3 shared agree in type  (7↔6 properties)
    shared  name: string?, role: string|string[]?, report: ReportValue?
    only A  node, required, forbidden, query
    only B  slug, parent, children
  **Fix** — No action needed beyond the note.
- **FileContext** — `FileContext` looks like `ResolveContext`, but not closely enough to call it a copy — 0.37 (37%).
  scores  Properties 35%
  Properties  35%  1/3 shared agree in type  (14↔3 properties)
    shared  repoRoot: string?
    type differs  aliases: Record<string,string>? ≠ Aliases?, repoFiles: string[]? ≠ readonly string[]?
    only A  abs, rel, dir, basename, sf, arch, roles, roleCtx, facts, dedupe, providersFor
  **Fix** — No action needed beyond the note.
- **EnrichedFinding** — `EnrichedFinding` looks like `TitleArgs`, but not closely enough to call it a copy — 0.37 (37%).
  scores  Properties 42%
  Properties  42%  4/4 shared agree in type  (22↔5 properties)
    shared  rule: string, message: string, role: string?, invariant: string?
    only A  file, line, what, key, dedupeKey, category, title, engineMessage, fixOptions, errorType, ownerNode, nodeRoles, ownerPaths, violation, boundary, plan, story, highlight
    only B  node
  **Fix** — No action needed beyond the note.
- **BranchProblem** — `BranchProblem` looks like `fact`, but not closely enough to call it a copy — 0.37 (37%).
  scores  Properties 42%
  Properties  42%  2/2 shared agree in type  (3↔7 properties)
    shared  kind: string, name: string?
    only A  text
    only B  form, names, source, resolved, reExport
  **Fix** — No action needed beyond the note.
- **GraphViolation** — `GraphViolation` looks like `DeclInfo`, but not closely enough to call it a copy — 0.36 (37%).
  scores  Properties 42%
  Properties  42%  2/2 shared agree in type  (7↔3 properties)
    shared  kind: string, file: string
    only A  from, to, role, line, title
    only B  node
  **Fix** — No action needed beyond the note.
- **Branch** — `Branch` looks like `ProviderReading`, but not closely enough to call it a copy — 0.36 (36%).
  scores  Properties 42%
  Properties  42%  2/2 shared agree in type  (7↔3 properties)
    shared  text: string, dynamic: boolean?
    only A  provider, media, problems, directive, absent
    only B  origin
  **Fix** — No action needed beyond the note.
- **EnrichedFinding** — `EnrichedFinding` looks like `TextFinding`, but not closely enough to call it a copy — 0.36 (36%).
  scores  Properties 35%
  Properties  35%  6/6 shared agree in type  (22↔11 properties)
    shared  file: string, line: number, what: string?, rule: string, message: string, role: string?
    only A  key, dedupeKey, category, title, engineMessage, fixOptions, errorType, ownerNode, nodeRoles, ownerPaths, invariant, violation, boundary, plan, story, highlight
    only B  fix, node, token, singularToken, targetPath
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
- **BranchProblem** — `BranchProblem` looks like `Candidate`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 39%
  Properties  39%  2/3 shared agree in type  (3↔25 properties)
    shared  name: string?, text: string?
    type differs  kind: string ≠ KindFact?
    only B  location, lines, returns, calls, branches, assignments, parameters, exported, mutable, references, implementations, members, staticBlocks, extends, implements, constructorParams, hasConstructor, role, parentRole, css, framework, file
  **Fix** — No action needed beyond the note.
- **ReportObject** — `ReportObject` looks like `StructureCode`, but not closely enough to call it a copy — 0.35 (35%).
  scores  Properties 40%
  Properties  40%  1/3 shared agree in type  (9↔3 properties)
    shared  ask: string?
    type differs  message: string? ≠ fn<StructureFacts>:string, fix: ReportFix|string? ≠ fn<StructureFacts>:string
    only A  description, code, path, place, to, from
  **Fix** — No action needed beyond the note.

## Aliases / inheritance (12)

| Entity | Location | Reuses | Location |
| --- | --- | --- | --- |
| QueryFilter | `entities/architecture.ts:21` | FieldValue | `utils/field.ts:21` |
| RunFacts | `entities/context.ts:17` | Facts | `entities/kinds.ts:40` |
| PlanPlace | `entities/enriched-finding.ts:17` | Place | `entities/facts.ts:244` |
| PlanPlace | `entities/enriched-finding.ts:17` | Place | `entities/place.ts:7` |
| PlanPlace | `entities/enriched-finding.ts:17` | Place | `entities/location/homes.ts:26` |
| Link | `entities/facts.ts:188` | RenderLink | `entities/facts.ts:192` |
| RenderLink | `entities/facts.ts:192` | Link | `report/user-report/src/utils/layout/types.ts:28` |
| StoryBase | `entities/story.ts:39` | UnknownRoleStory | `entities/story.ts:62` |
| StoryBase | `entities/story.ts:39` | FileContentsStory | `entities/story.ts:65` |
| ConfigValue | `report/configErrors.ts:15` | FieldValue | `utils/field.ts:21` |
| Box | `report/user-report/src/utils/layout/types.ts:21` | Rect | `report/user-report/src/utils/layout/types.ts:31` |
| ConfigValue | `utils/configs.ts:23` | FieldValue | `utils/field.ts:21` |

## Duplicate trees (21)

### Duplicates of WhereEntry

- WhereEntry `entities/architecture.ts:49`
  - RoleHome `entities/architecture.ts:106`
### Duplicates of Walk

- Walk `report/user-report/shared/describe.ts:30`
  - DescribeOptions `report/user-report/shared/describe.ts:26`
### Duplicates of Unplaceable

- Unplaceable `entities/access-graph.ts:39`
  - Loop `report/user-report/src/components/access-graph/NodeBox.tsx:31`
### Duplicates of TypeSyntaxNode

- TypeSyntaxNode `css/core/css-tree.ts:54`
  - TypeDefinition `css/core/css-tree.ts:65`
### Duplicates of TemplateExpr

- TemplateExpr `css/styled/template.ts:15`
  - at `css/core/values.ts:70`
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
### Duplicates of RawChildSpec

- RawChildSpec `entities/architecture.ts:185`
  - ProviderLiteral `css/core/scope-types.ts:15`
### Duplicates of Plan

- Plan `entities/enriched-finding.ts:19`
  - CtxPlan `entities/decision-ctx.ts:30`
### Duplicates of MoveAsk

- MoveAsk `report/asks.ts:33`
  - Resolved `entities/location.ts:74`
### Duplicates of FindingHighlight

- FindingHighlight `entities/findings.ts:36`
  - CssLocation `css/core/css-tree.ts:19`
  - Span `css/core/pieces.ts:17`
### Duplicates of FileContext

- FileContext `entities/context.ts:19`
  - FileVarsCtx `invariants/name.ts:10`
### Duplicates of Destination

- Destination `entities/story.ts:24`
  - Scored `report/errorTypes/destinations.ts:115`
### Duplicates of CssTemplateFact

- CssTemplateFact `entities/facts.ts:151`
  - fact `css/index.ts:112`
### Duplicates of CollectOptions

- CollectOptions `entities/ast/file-facts.ts:20`
  - ResolveContext `utils/imports.ts:97`
### Duplicates of CandidateArgs

- CandidateArgs `report/errorTypes/destinations.ts:114`
  - Tuning `report/errorTypes/destinations.ts:156`
### Duplicates of Candidate

- Candidate `entities/facts.ts:211`
  - BranchProblem `css/core/pieces.ts:23`
### Duplicates of ActionAsk

- ActionAsk `report/user-report/data/graph-edges.ts:55`
  - Outgoing `report/user-report/src/components/role-detail/cards.tsx:22`

## Shared-entity candidates (16)

- **Unplaceable** `entities/access-graph.ts:39` ↔ **Mention** `entities/access-graph.ts:43` (0.567)
  - shared: kind, targetRole — extract a shared type for kind, targetRole
- **BindingFact** `entities/facts.ts:108` ↔ **ConstructorParam** `entities/facts.ts:139` (0.567)
  - shared: name, type — extract a shared type for name, type
- **BranchProblem** `css/core/pieces.ts:23` ↔ **FindingHighlight** `entities/findings.ts:36` (0.507)
  - shared: kind, text — extract a shared type for kind, text
- **FindingHighlight** `entities/findings.ts:36` ↔ **CommentSpan** `entities/ast/comments.ts:33` (0.507)
  - shared: end, kind — extract a shared type for end, kind
- **Destination** `entities/location/homes.ts:24` ↔ **Place** `entities/location/homes.ts:26` (0.507)
  - shared: path, folder — extract a shared type for path, folder
- **Place** `entities/location/homes.ts:26` ↔ **Spot** `entities/tree/entries.ts:24` (0.507)
  - shared: path, folder — extract a shared type for path, folder
- **View** `report/user-report/src/components/access-graph/useZoomPan.ts:19` ↔ **Box** `report/user-report/src/utils/layout/types.ts:21` (0.507)
  - shared: x, y — extract a shared type for x, y
- **ActionDef** `entities/architecture.ts:68` ↔ **ACTION_KEYS** `code-roles/roles.ts:93` (0.5)
  - shared: where, except, of, scopeAccess — extract a shared type for where, except, of, scopeAccess
- **theme** `report/user-report/src/theme.ts:7` ↔ **DefaultTheme** `report/user-report/src/theme.ts:41` (0.5)
  - shared: color, font, radius, space — extract a shared type for color, font, radius, space
- **Invariant** `entities/architecture.ts:86` ↔ **InvariantSummary** `entities/overview-summaries.ts:69` (0.467)
  - shared: id, where, ignore, when, infer, report, dedupeBy — extract a shared type for id, where, ignore, when, infer, report, dedupeBy
- **RoleDef** `entities/architecture.ts:76` ↔ **RawNode** `entities/architecture.ts:197` (0.465)
  - shared: slug, name, report — extract a shared type for slug, name, report
- **CountGroup** `entities/overview-data.ts:18` ↔ **Count** `utils/count.ts:10` (0.463)
  - shared: key, count — extract a shared type for key, count
- **CssNode** `css/core/css-tree.ts:25` ↔ **MemberFact** `entities/facts.ts:22` (0.387)
  - shared: type, name, value — extract a shared type for type, name, value
- **InvariantRule** `entities/overview-summaries.ts:67` ↔ **StructureCode** `report/errorTypes/codes/structure.ts:11` (0.283)
  - shared: message, fix — extract a shared type for message, fix
- **MatchedRange** `entities/overview-summaries.ts:18` ↔ **StoryBase** `entities/story.ts:39` (0.253)
  - shared: from, to — extract a shared type for from, to
- **CssLocation** `css/core/css-tree.ts:19` ↔ **Span** `css/core/pieces.ts:17` (0.231)
  - shared: start, end — extract a shared type for start, end

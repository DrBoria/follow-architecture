# Utility duplicates (function-level funnel)

Scanned 274 app file(s), 2367 app util(s) against 2231 canonical util(s).

Found 2 duplicate util(s) and 63 similar util(s).

## Duplicate (confidence ≥ threshold) (2)

| Id | Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `duplicate:pipeline-facts.ts#withFacets=>entities/ast/depth.ts#read` | withFacets | `pipeline-facts.ts:68` | read | `entities/ast/depth.ts:110` | 0.79 | Structure | Replace the local body with a call to `read` from `entities/ast/depth.ts`. |
| `duplicate:pipeline.ts#filterNamesCodeRole=>entities/queries.ts#contains` | filterNamesCodeRole | `pipeline.ts:31` | contains | `entities/queries.ts:145` | 0.76 | Structure | Replace the local body with a call to `contains` from `entities/queries.ts`. |

### Why each one matched

- **withFacets** — `withFacets` repeats the canonical `read` — 0.79 (79%) confidence that this is the same logic.
  scores  Signature 56%  ·  Structure 97%  ·  AST 98%  ·  Control flow 70%
  Signature  params · 0%  #1 candidates only on the local side  #2 run only on the local side
    types · 0%
    name sites  prop 0:71,72,73,74,75,76,78,79↔1:119  var-decl 0:69,80↔1:111,112,113,114,115
    return Candidate[] ≡ Candidate[]
  Structure  0.47 · 47%  bin · 33% 0:73,76,78↔1:114  call · 67% 0:70,78,79,80↔1:111,112,113,114,115,119  for-of 0:80↔1:  member · 83% 0:71,73,74,76,78,80↔1:111,113,114,115,119  new 0:76↔1:  object · 50% 0:70,76,78,79↔1:114,119  prop · 13% 0:71,72,73,74,75,76,78,79↔1:119  return 0:82↔1:121
    only local: for-of 1, new 1
  AST  call:attachFrameworkFacts L 78 ↔ R 119 · 67%  object:object L 78 ↔ R 119 · 62%  prop:sf L 78 ↔ R 119  prop:text L 78 ↔ R 119  prop:repoRoot L 78 ↔ R 119 · 50%  member:v L 78 ↔ R 119  prop:importMap L 78 ↔ R 119  return:return L 82 ↔ R 121  prop:rel L 78 ↔ R 119
  Control flow  0.7  /call ×1, call/object ×1, call>object/prop ×4, call>object>prop/member ×1, call>object/prop ×1, /return ×1
    local  1 /var-destr · 2 /call · 3 call/object · 4 call>object/prop · 5 call>object>prop/member · 6 call>object/prop · 7 call>object/prop · 8 call>object>prop/bin · 9 call>object>prop>bin/bin → call>object>prop>bin>bin/member · call>object>prop>bin>bin/member · call>object/prop · call>object>prop/member · call>object/prop · call>object/prop · call>object>prop/bin · call>object>prop>bin/member · call>object>prop>bin/object · call>object>prop>bin>object/prop · call>object>prop>bin>object>prop/new · call>object>prop>bin>object/prop · call>object>prop>bin>object>prop/new · /call · call/object · call>object/prop · call>object>prop/member · call>object/prop · call>object/prop · call>object/prop · call>object>prop/bin · call>object>prop>bin/member · call>object>prop>bin/member · call>object/prop · /call · call/object · call>object/prop · /for-of · for-of/call · for-of>call/member · for-of>call>member/member · for-of>call>member>member/member · /return
    canonical  1 /const · 2 const/call · 3 const>call/member · 4 /const · 5 const/call · 6 /const · 7 const/call · 8 const>call/member · 9 /const → const/call · const>call/member · const>call/bin · const>call>bin/member · const>call>bin/object · const>call/member · /const · const/call · const>call/member · /call · call/object · call>object/prop · call>object/prop · call>object/prop · call>object/prop · call>object>prop/member · call>object/prop · /return
  **Fix** — Replace the local body with a call to `read` from `entities/ast/depth.ts`.
- **filterNamesCodeRole** — `filterNamesCodeRole` repeats the canonical `contains` — 0.76 (76%) confidence that this is the same logic.
  scores  Signature 44%  ·  Structure 92%  ·  AST 93%  ·  Control flow 83%
  Signature  params · 33%  #2 e only on the canonical side  #3 s only on the canonical side
    types · 33%
    name sites  param 0:31↔1:145
    return boolean ≡ boolean
  Structure  0.69 · 69%  bin · 33% 0:32,34,36↔1:147  call 0:32,33,36↔1:146,147,148  if · 67% 0:32,33,34↔1:147,148  return · 75% 0:32,33,34,36↔1:147,148,149
  AST  if:if L 32 ↔ R 147 · 78%  bin:=== L 32 ↔ R 147  return:return L 32 ↔ R 147 · 60%  call:includes L 32 ↔ R 147 · 50%  if:if L 33 ↔ R 148  return:return L 33 ↔ R 148  return:return L 36 ↔ R 149
  Control flow  0.83  /if ×1, if/bin ×1, if/return ×1, if>return/call ×1, /if ×1, if/call ×1, if/return ×1, if>return/call ×1, /return ×1
    local  1 /if · 2 if/bin · 3 if/return · 4 if>return/call · 5 /if · 6 if/call · 7 if/return · 8 if>return/call · 9 /if → if/bin · if>bin/bin · if>bin/bin · if/return · /return · return>call/call · return/call
    canonical  1 /const · 2 const/call · 3 /if · 4 if/bin · 5 if/return · 6 if>return/call · 7 if>return>call/call · 8 /if · 9 if/call → if/return · if>return/call · /return
  **Fix** — Replace the local body with a call to `contains` from `entities/queries.ts`.

## Similar (below duplicate threshold) (63)

| Id | Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `similar:pipeline-unroled.ts#wrapperShape#anon@69=>entities/kinds.ts#renamedCall#anon@173` | wrapperShape#anon@69 | `pipeline-unroled.ts:69` | renamedCall#anon@173 | `entities/kinds.ts:173` | 0.76 | Signature | Replace the local body with a call to `renamedCall#anon@173` from `entities/kinds.ts`. |
| `similar:pipeline-unroled.ts#reexportOnly=>nodes/finally/relations.ts#collectKind` | reexportOnly | `pipeline-unroled.ts:181` | collectKind | `nodes/finally/relations.ts:57` | 0.75 | Structure | Replace the local body with a call to `collectKind` from `nodes/finally/relations.ts`. |
| `similar:pipeline-unroled.ts#wrapperShape#anon@69=>entities/kinds.ts#callsOf#anon@70#anon@72` | wrapperShape#anon@69 | `pipeline-unroled.ts:69` | callsOf#anon@70#anon@72 | `entities/kinds.ts:72` | 0.74 | Control flow | Replace the local body with a call to `callsOf#anon@70#anon@72` from `entities/kinds.ts`. |
| `similar:pipeline-unroled.ts#unroledFindings#anon@163=>entities/kinds.ts#lineOf` | unroledFindings#anon@163 | `pipeline-unroled.ts:163` | lineOf | `entities/kinds.ts:63` | 0.74 | Control flow | Replace the local body with a call to `lineOf` from `entities/kinds.ts`. |
| `similar:pipeline-unroled.ts#declaredRolesOf=>nodes/finally/relations-edge.ts#targetRolesOf` | declaredRolesOf | `pipeline-unroled.ts:38` | targetRolesOf | `nodes/finally/relations-edge.ts:40` | 0.74 | Structure | Replace the local body with a call to `targetRolesOf` from `nodes/finally/relations-edge.ts`. |
| `similar:pipeline-facts.ts#withFacets=>code-roles/project.ts#classifyFile` | withFacets | `pipeline-facts.ts:68` | classifyFile | `code-roles/project.ts:86` | 0.74 | Structure | Replace the local body with a call to `classifyFile` from `code-roles/project.ts`. |
| `similar:pipeline-facts.ts#collectFacts=>entities/ast/depth.ts#read` | collectFacts | `pipeline-facts.ts:91` | read | `entities/ast/depth.ts:110` | 0.74 | Structure | Replace the local body with a call to `read` from `entities/ast/depth.ts`. |
| `similar:main.ts#buildArchitecture=>entities/ast/assignments-tagged.ts#taggedWriteOf` | buildArchitecture | `main.ts:56` | taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | 0.74 | Structure | Replace the local body with a call to `taggedWriteOf` from `entities/ast/assignments-tagged.ts`. |
| `similar:config-state.ts#buildState=>entities/ast/file-imports.ts#statementImport` | buildState | `config-state.ts:60` | statementImport | `entities/ast/file-imports.ts:20` | 0.73 | Structure | Replace the local body with a call to `statementImport` from `entities/ast/file-imports.ts`. |
| `similar:pipeline-unroled.ts#declaredRolesOf=>frameworks/react/index.ts#namesOfParameter` | declaredRolesOf | `pipeline-unroled.ts:38` | namesOfParameter | `frameworks/react/index.ts:98` | 0.73 | Structure | Replace the local body with a call to `namesOfParameter` from `frameworks/react/index.ts`. |
| `similar:pipeline-unroled.ts#checkUnroled=>css/resolve/resolve.ts#collectProblems` | checkUnroled | `pipeline-unroled.ts:217` | collectProblems | `css/resolve/resolve.ts:57` | 0.73 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |
| `similar:pipeline-facts.ts#buildFileContext=>report/user-report/src/graph/decision.ts#buildProblemView` | buildFileContext | `pipeline-facts.ts:23` | buildProblemView | `report/user-report/src/graph/decision.ts:54` | 0.73 | Structure | Replace the local body with a call to `buildProblemView` from `report/user-report/src/graph/decision.ts`. |
| `similar:main.ts#buildArchitecture=>report/user-report/data/graph.ts#buildAccessGraph` | buildArchitecture | `main.ts:56` | buildAccessGraph | `report/user-report/data/graph.ts:84` | 0.72 | Structure | Replace the local body with a call to `buildAccessGraph` from `report/user-report/data/graph.ts`. |
| `similar:pipeline-unroled.ts#wrapperShape=>entities/location.ts#boxOfPlace` | wrapperShape | `pipeline-unroled.ts:68` | boxOfPlace | `entities/location.ts:109` | 0.72 | Structure | Replace the local body with a call to `boxOfPlace` from `entities/location.ts`. |
| `similar:pipeline-facts.ts#withFacets=>report/user-report/data/role-examples.ts#classifiedFile` | withFacets | `pipeline-facts.ts:68` | classifiedFile | `report/user-report/data/role-examples.ts:30` | 0.72 | Structure | Replace the local body with a call to `classifiedFile` from `report/user-report/data/role-examples.ts`. |
| `similar:pipeline-unroled.ts#declarationShape=>report/user-report/data/invariants.ts#reportMessage` | declarationShape | `pipeline-unroled.ts:75` | reportMessage | `report/user-report/data/invariants.ts:23` | 0.72 | Structure | Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`. |
| `similar:pipeline-unroled.ts#aliasShape=>entities/location.ts#boxOfPlace` | aliasShape | `pipeline-unroled.ts:60` | boxOfPlace | `entities/location.ts:109` | 0.72 | Structure | Replace the local body with a call to `boxOfPlace` from `entities/location.ts`. |
| `similar:config-rule.ts#create=>report/errorTypes/vocabulary/phrases.ts#exportText` | create | `config-rule.ts:71` | exportText | `report/errorTypes/vocabulary/phrases.ts:49` | 0.72 | Structure | Replace the local body with a call to `exportText` from `report/errorTypes/vocabulary/phrases.ts`. |
| `similar:config-report.ts#recordFindings=>css/index.ts#materialiseResolution` | recordFindings | `config-report.ts:117` | materialiseResolution | `css/index.ts:76` | 0.71 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| `similar:config-rule.ts#skipped#anon@34=>nodes/similar.ts#filesIn#anon@48` | skipped#anon@34 | `config-rule.ts:34` | filesIn#anon@48 | `nodes/similar.ts:48` | 0.71 | Structure | Replace the local body with a call to `filesIn#anon@48` from `nodes/similar.ts`. |
| `similar:pipeline-unroled.ts#shapeOf=>css/tailwind/tailwind.ts#utilityValue` | shapeOf | `pipeline-unroled.ts:88` | utilityValue | `css/tailwind/tailwind.ts:85` | 0.71 | Structure | Replace the local body with a call to `utilityValue` from `css/tailwind/tailwind.ts`. |
| `similar:pipeline-facts.ts#buildFileContext=>nodes/children.ts#folderContents` | buildFileContext | `pipeline-facts.ts:23` | folderContents | `nodes/children.ts:20` | 0.71 | Structure | Replace the local body with a call to `folderContents` from `nodes/children.ts`. |
| `similar:pipeline-unroled.ts#noRole=>css/core/syntax-check.ts#mathFunctionNames` | noRole | `pipeline-unroled.ts:115` | mathFunctionNames | `css/core/syntax-check.ts:53` | 0.70 | Structure | Replace the local body with a call to `mathFunctionNames` from `css/core/syntax-check.ts`. |
| `similar:pipeline-unroled.ts#shapeOf=>entities/kinds.ts#writePath` | shapeOf | `pipeline-unroled.ts:88` | writePath | `entities/kinds.ts:106` | 0.70 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| `similar:pipeline-unroled.ts#noRole=>report/user-report/src/components/code-preview/CodePanel.tsx#CodePanel#anon@79` | noRole | `pipeline-unroled.ts:115` | CodePanel#anon@79 | `report/user-report/src/components/code-preview/CodePanel.tsx:79` | 0.70 | Structure | Replace the local body with a call to `CodePanel#anon@79` from `report/user-report/src/components/code-preview/CodePanel.tsx`. |
| `similar:pipeline-unroled.ts#wrapperShape=>report/user-report/data/invariants.ts#reportMessage` | wrapperShape | `pipeline-unroled.ts:68` | reportMessage | `report/user-report/data/invariants.ts:23` | 0.70 | Structure | Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`. |
| `similar:pipeline-roles.ts#misfitFinding=>entities/tree/entries.ts#structureFactsFor` | misfitFinding | `pipeline-roles.ts:64` | structureFactsFor | `entities/tree/entries.ts:60` | 0.70 | Structure | Replace the local body with a call to `structureFactsFor` from `entities/tree/entries.ts`. |
| `similar:pipeline-unroled.ts#ownChildOf#anon@31=>nodes/finally/relations.ts#judgedEdge#anon@42` | ownChildOf#anon@31 | `pipeline-unroled.ts:31` | judgedEdge#anon@42 | `nodes/finally/relations.ts:42` | 0.70 | Structure | Replace the local body with a call to `judgedEdge#anon@42` from `nodes/finally/relations.ts`. |
| `similar:config-rule.ts#skipped=>entities/ast/calls.ts#isReceiverOnly` | skipped | `config-rule.ts:32` | isReceiverOnly | `entities/ast/calls.ts:150` | 0.70 | Structure | Replace the local body with a call to `isReceiverOnly` from `entities/ast/calls.ts`. |
| `similar:config-state.ts#buildState=>css/resolve/expression.ts#staticMapAnswer` | buildState | `config-state.ts:60` | staticMapAnswer | `css/resolve/expression.ts:199` | 0.70 | Structure | Replace the local body with a call to `staticMapAnswer` from `css/resolve/expression.ts`. |
| `similar:pipeline-unroled.ts#declarationOf=>report/user-report/data/role-marks.ts#declarationMark` | declarationOf | `pipeline-unroled.ts:46` | declarationMark | `report/user-report/data/role-marks.ts:24` | 0.70 | Structure | Replace the local body with a call to `declarationMark` from `report/user-report/data/role-marks.ts`. |
| `similar:pipeline-unroled.ts#declarationOf=>invariants/name.ts#fileVars` | declarationOf | `pipeline-unroled.ts:46` | fileVars | `invariants/name.ts:13` | 0.70 | Structure | Replace the local body with a call to `fileVars` from `invariants/name.ts`. |
| `similar:pipeline-unroled.ts#fileFinding=>invariants/index.ts#checkInvariant` | fileFinding | `pipeline-unroled.ts:192` | checkInvariant | `invariants/index.ts:281` | 0.69 | Structure | Replace the local body with a call to `checkInvariant` from `invariants/index.ts`. |
| `similar:pipeline-unroled.ts#checkUnroled=>entities/tree/entries.ts#reportUndeclared` | checkUnroled | `pipeline-unroled.ts:217` | reportUndeclared | `entities/tree/entries.ts:97` | 0.69 | Structure | Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`. |
| `similar:pipeline-unroled.ts#aliasShape=>nodes/finally/relations-group.ts#ownerRoleOf` | aliasShape | `pipeline-unroled.ts:60` | ownerRoleOf | `nodes/finally/relations-group.ts:48` | 0.69 | Structure | Replace the local body with a call to `ownerRoleOf` from `nodes/finally/relations-group.ts`. |
| `similar:pipeline-unroled.ts#fileFinding=>invariants/vars.ts#collectScalars` | fileFinding | `pipeline-unroled.ts:192` | collectScalars | `invariants/vars.ts:79` | 0.69 | Structure | Replace the local body with a call to `collectScalars` from `invariants/vars.ts`. |
| `similar:main.ts#checkBuilt=>code-roles/roles.ts#checkRoleKeys` | checkBuilt | `main.ts:41` | checkRoleKeys | `code-roles/roles.ts:162` | 0.69 | Structure | Replace the local body with a call to `checkRoleKeys` from `code-roles/roles.ts`. |
| `similar:config-report.ts#recordFindings#anon@123=>report/user-report/src/components/access-graph/useZoomPan.ts#onPointerUp` | recordFindings#anon@123 | `config-report.ts:123` | onPointerUp | `report/user-report/src/components/access-graph/useZoomPan.ts:93` | 0.69 | Control flow | Replace the local body with a call to `onPointerUp` from `report/user-report/src/components/access-graph/useZoomPan.ts`. |
| `similar:config-rule.ts#skipped=>entities/location/where.ts#matchesRole` | skipped | `config-rule.ts:32` | matchesRole | `entities/location/where.ts:74` | 0.69 | Structure | Replace the local body with a call to `matchesRole` from `entities/location/where.ts`. |
| `similar:pipeline.ts#filterNamesCodeRole=>invariants/index.ts#namesResolution` | filterNamesCodeRole | `pipeline.ts:31` | namesResolution | `invariants/index.ts:225` | 0.69 | Structure | Replace the local body with a call to `namesResolution` from `invariants/index.ts`. |
| `similar:config-state.ts#archOf=>entities/location.ts#archOf` | archOf | `config-state.ts:48` | archOf | `entities/location.ts:40` | 0.69 | Structure | Replace the local body with a call to `archOf` from `entities/location.ts`. |
| `similar:pipeline-unroled.ts#onlyValuePieces=>utils/pattern.ts#allMatch` | onlyValuePieces | `pipeline-unroled.ts:190` | allMatch | `utils/pattern.ts:89` | 0.68 | Control flow | Replace the local body with a call to `allMatch` from `utils/pattern.ts`. |
| `similar:config-state.ts#archOf=>invariants/index.ts#reportOf` | archOf | `config-state.ts:48` | reportOf | `invariants/index.ts:143` | 0.68 | Structure | Replace the local body with a call to `reportOf` from `invariants/index.ts`. |
| `similar:pipeline-unroled.ts#ownChildOf#anon@31=>entities/tree/entries.ts#findChild#anon@34` | ownChildOf#anon@31 | `pipeline-unroled.ts:31` | findChild#anon@34 | `entities/tree/entries.ts:34` | 0.68 | Structure | Replace the local body with a call to `findChild#anon@34` from `entities/tree/entries.ts`. |
| `similar:pipeline-unroled.ts#declarationShape=>report/user-report/src/utils/format.ts#accessorSignature` | declarationShape | `pipeline-unroled.ts:75` | accessorSignature | `report/user-report/src/utils/format.ts:40` | 0.68 | Structure | Replace the local body with a call to `accessorSignature` from `report/user-report/src/utils/format.ts`. |
| `similar:pipeline-unroled.ts#whyUnroled=>report/errorTypes/codes/structure.ts#choose` | whyUnroled | `pipeline-unroled.ts:98` | choose | `report/errorTypes/codes/structure.ts:74` | 0.68 | Structure | Replace the local body with a call to `choose` from `report/errorTypes/codes/structure.ts`. |
| `similar:config-report.ts#installExitHook=>report/user-report/src/screens/TreeScreen.tsx#useExpanded#anon@55` | installExitHook | `config-report.ts:83` | useExpanded#anon@55 | `report/user-report/src/screens/TreeScreen.tsx:55` | 0.68 | Structure | Replace the local body with a call to `useExpanded#anon@55` from `report/user-report/src/screens/TreeScreen.tsx`. |
| `similar:config-state.ts#findRepoRoot=>report/user-report/src/generate/infer.ts#inferToYaml` | findRepoRoot | `config-state.ts:28` | inferToYaml | `report/user-report/src/generate/infer.ts:44` | 0.67 | Structure | Replace the local body with a call to `inferToYaml` from `report/user-report/src/generate/infer.ts`. |
| `similar:pipeline.ts#filterNamesCodeRole=>invariants/index.ts#reportOf` | filterNamesCodeRole | `pipeline.ts:31` | reportOf | `invariants/index.ts:143` | 0.67 | Structure | Replace the local body with a call to `reportOf` from `invariants/index.ts`. |
| `similar:config-rule.ts#skipped#anon@34=>entities/tree/build.ts#applyClaimsToSharers#anon@192` | skipped#anon@34 | `config-rule.ts:34` | applyClaimsToSharers#anon@192 | `entities/tree/build.ts:192` | 0.67 | Structure | Replace the local body with a call to `applyClaimsToSharers#anon@192` from `entities/tree/build.ts`. |
| `similar:config-report.ts#recordFindings=>report/user-report/shared/describe.ts#walkEntry` | recordFindings | `config-report.ts:117` | walkEntry | `report/user-report/shared/describe.ts:50` | 0.67 | Structure | Replace the local body with a call to `walkEntry` from `report/user-report/shared/describe.ts`. |
| `similar:pipeline-roles.ts#whyOf=>report/user-report/data/invariants.ts#reportMessage` | whyOf | `pipeline-roles.ts:49` | reportMessage | `report/user-report/data/invariants.ts:23` | 0.67 | Structure | Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`. |
| `similar:pipeline-facts.ts#collectFacts=>code-roles/project.ts#classifyFile` | collectFacts | `pipeline-facts.ts:91` | classifyFile | `code-roles/project.ts:86` | 0.67 | Structure | Replace the local body with a call to `classifyFile` from `code-roles/project.ts`. |
| `similar:pipeline-roles.ts#misfitsOf=>code-roles/connector.ts#byName` | misfitsOf | `pipeline-roles.ts:35` | byName | `code-roles/connector.ts:62` | 0.66 | Structure | Replace the local body with a call to `byName` from `code-roles/connector.ts`. |
| `similar:main.ts#loadArchitecture=>css/core/scope.ts#scopeFromProject` | loadArchitecture | `main.ts:131` | scopeFromProject | `css/core/scope.ts:167` | 0.66 | Structure | Replace the local body with a call to `scopeFromProject` from `css/core/scope.ts`. |
| `similar:pipeline.ts#checkFile=>css/index.ts#templateFacts` | checkFile | `pipeline.ts:56` | templateFacts | `css/index.ts:100` | 0.66 | Structure | Replace the local body with a call to `templateFacts` from `css/index.ts`. |
| `similar:main.ts#loadArchitecture=>invariants/index.ts#reportOf` | loadArchitecture | `main.ts:131` | reportOf | `invariants/index.ts:143` | 0.66 | Structure | Replace the local body with a call to `reportOf` from `invariants/index.ts`. |
| `similar:args.ts#parseArgs=>entities/ast/file-exports.ts#statementExport` | parseArgs | `args.ts:72` | statementExport | `entities/ast/file-exports.ts:31` | 0.66 | Structure | Replace the local body with a call to `statementExport` from `entities/ast/file-exports.ts`. |
| `similar:pipeline.ts#checkFile=>report/user-report/data/graph-roles.ts#actionRoleEdges` | checkFile | `pipeline.ts:56` | actionRoleEdges | `report/user-report/data/graph-roles.ts:52` | 0.66 | Structure | Replace the local body with a call to `actionRoleEdges` from `report/user-report/data/graph-roles.ts`. |
| `similar:config-report.ts#installExitHook=>report/user-report/shared/describe.ts#walk` | installExitHook | `config-report.ts:83` | walk | `report/user-report/shared/describe.ts:83` | 0.66 | Structure | Replace the local body with a call to `walk` from `report/user-report/shared/describe.ts`. |
| `similar:main.ts#checkBuilt=>css/index.ts#materialiseResolution` | checkBuilt | `main.ts:41` | materialiseResolution | `css/index.ts:76` | 0.66 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| `similar:config-report.ts#writeBucket=>nodes/finally/required.ts#foreignFolder` | writeBucket | `config-report.ts:51` | foreignFolder | `nodes/finally/required.ts:39` | 0.65 | Structure | Replace the local body with a call to `foreignFolder` from `nodes/finally/required.ts`. |
| `similar:config-report.ts#writeBucket=>nodes/finally/relations-group.ts#tokenOf` | writeBucket | `config-report.ts:51` | tokenOf | `nodes/finally/relations-group.ts:70` | 0.65 | Structure | Replace the local body with a call to `tokenOf` from `nodes/finally/relations-group.ts`. |

### Why each one matched

- **wrapperShape#anon@69** — `wrapperShape#anon@69` looks like the canonical `renamedCall#anon@173`, but not closely enough to call it a copy — 0.76 (76%).
  scores  Signature 68%  ·  Structure 53%  ·  AST 98%  ·  Control flow 100%
  ! The body is too small (6 nodes) to be called a duplicate on shape alone.
  Signature  params
    types
    name words · 25% anon
    name sites  param 0:69↔1:173
    return boolean ≡ boolean
  Structure  1  bin 0:69↔1:173  member 0:69↔1:173  unary 0:69↔1:173
  AST  bin:&& L 69 ↔ R 173  member:v L 69 ↔ R 173  unary:54 L 69 ↔ R 173  member:v L 69 ↔ R 173
  Control flow  1  /bin ×1, bin/member ×1, bin/unary ×1, bin>unary/member ×1
    local  1 /bin · 2 bin/member · 3 bin/unary · 4 bin>unary/member
    canonical  1 /bin · 2 bin/member · 3 bin/unary · 4 bin>unary/member
  **Fix** — Replace the local body with a call to `renamedCall#anon@173` from `entities/kinds.ts`.
- **reexportOnly** — `reexportOnly` looks like the canonical `collectKind`, but not closely enough to call it a copy — 0.75 (75%).
  scores  Signature 44%  ·  Structure 90%  ·  AST 100%  ·  Control flow 74%
  Signature  params · 0%  #1 object≠string  #2 actionDecls only on the canonical side  #3 jctx only on the canonical side
    types · 0%  #1 { ctx:FileContext; }≠string
    name sites  callback-param 0:184↔1:61,62  param,type-prop 0:181↔1:57  var-decl 0:182↔1:58,59,60,61
    return boolean ≡ boolean
  Structure  0.5 · 50%  array 0:182↔1:59  bin 0:182,184↔1:59,64  call · 33% 0:184↔1:60,61,62  member · 67% 0:182,184↔1:59,62,64  object 0:↔1:61,62  prop 0:↔1:61,62  return 0:184↔1:64
    only canonical: object 2, prop 2
  AST  var:const L 182 ↔ R 59 · 88%  bin:?? L 182 ↔ R 59 · 83%  member:v L 182 ↔ R 59 · 75%  member:v L 182 ↔ R 59 · 67%  array:array L 182 ↔ R 59  bin:> L 184 ↔ R 64  member:v L 184 ↔ R 64  return:return L 184 ↔ R 64
  Control flow  0.74  /const ×1, const/bin ×1, const>bin/member ×1, const>bin>member/member ×1, const>bin/array ×1, /return ×1, return/bin ×1
    local  1 /const · 2 const/bin · 3 const>bin/member · 4 const>bin>member/member · 5 const>bin>member>member/member · 6 const>bin/array · 7 /return → return/bin · return>bin/bin · return>bin>bin/member · return>bin/call
    canonical  1 /var-destr · 2 /const · 3 const/bin · 4 const>bin/member · 5 const>bin>member/member · 6 const>bin/array · 7 /const → const/call · /const · const/call · /call · call/call · /return · return/bin · return>bin/member
  **Fix** — Replace the local body with a call to `collectKind` from `nodes/finally/relations.ts`.
- **wrapperShape#anon@69** — `wrapperShape#anon@69` looks like the canonical `callsOf#anon@70#anon@72`, but not closely enough to call it a copy — 0.74 (74%).
  scores  Signature 62%  ·  Structure 53%  ·  AST 98%  ·  Control flow 100%
  Signature  params
    types
    name words · 17% anon
    name sites  param 0:69↔1:72
    return boolean ≡ boolean
  Structure  1  bin 0:69↔1:72  member 0:69↔1:72  unary 0:69↔1:72
  AST  bin:&& L 69 ↔ R 72  member:v L 69 ↔ R 72  unary:54 L 69 ↔ R 72  member:v L 69 ↔ R 72
  Control flow  1  /bin ×1, bin/member ×1, bin/unary ×1, bin>unary/member ×1
    local  1 /bin · 2 bin/member · 3 bin/unary · 4 bin>unary/member
    canonical  1 /bin · 2 bin/member · 3 bin/unary · 4 bin>unary/member
  **Fix** — Replace the local body with a call to `callsOf#anon@70#anon@72` from `entities/kinds.ts`.
- **unroledFindings#anon@163** — `unroledFindings#anon@163` looks like the canonical `lineOf`, but not closely enough to call it a copy — 0.74 (74%).
  scores  Signature 62%  ·  Structure 53%  ·  AST 97%  ·  Control flow 100%
  Signature  params
    types
    name sites  param 0:163↔1:63
    return number ≡ number
  Structure  1  bin 0:163↔1:63  index 0:163↔1:63  member 0:163↔1:63
  AST  bin:?? L 163 ↔ R 63  index:index L 163 ↔ R 63  member:v L 163 ↔ R 63
  Control flow  1  /bin ×1, bin/index ×1, bin>index/member ×1
    local  1 /bin · 2 bin/index · 3 bin>index/member
    canonical  1 /bin · 2 bin/index · 3 bin>index/member
  **Fix** — Replace the local body with a call to `lineOf` from `entities/kinds.ts`.
- **declaredRolesOf** — `declaredRolesOf` looks like the canonical `targetRolesOf`, but not closely enough to call it a copy — 0.74 (74%).
  scores  Signature 47%  ·  Structure 97%  ·  AST 97%  ·  Control flow 56%
  Signature  params · 67%  #3 other≠boolean
    types · 0%  #1 NodeMatch≠Edge  #2 ArchChild≠JudgeCtx  #3 Arch≠boolean
    name words · 67% roles,of
    name sites  param 0:38↔1:40
    return string[] ≡ string[]
  Structure  0.63 · 63%  array · 50% 0:41,43↔1:42  bin 0:41,43↔1:  call 0:39,41↔1:41,44  cond 0:43↔1:44  if · 50% 0:40↔1:41,42  member 0:40,41,43↔1:41,42,44  return · 67% 0:40,43↔1:41,42,44  unary 0:↔1:41
    only local: bin 2  only canonical: unary 1
  AST  if:if L 40 ↔ R 42 · 71%  member:v L 40 ↔ R 42  return:return L 40 ↔ R 42 · 50%  return:return L 43 ↔ R 44 · 50%  member:v L 43 ↔ R 44  member:v L 43 ↔ R 44  cond:cond L 43 ↔ R 44
  Control flow  0.56  /if ×1, if/member ×1, if/return ×1, /return ×1, return/cond ×1
    local  1 /const · 2 const/call · 3 /if · 4 if/member · 5 if/return → /const · const>call/bin · const>call>bin/member · const>call>bin>member/member · const>call>bin/array · const/call · /return · return/cond · return>cond/bin · return>cond>bin/member · return>cond>bin>member/member · return>cond>bin/array · return>cond/array
    canonical  1 /if · 2 if/unary · 3 if/return · 4 if>return/call · 5 if>return>call/member → if>return>call/member · /if · if/member · if/return · if>return/array · if>return>array/member · /return · return>cond/member · return>cond>member/member · return/cond · return>cond/member · return>cond/call · return>cond>call/member · return>cond>call/member
  **Fix** — Replace the local body with a call to `targetRolesOf` from `nodes/finally/relations-edge.ts`.
- **withFacets** — `withFacets` looks like the canonical `classifyFile`, but not closely enough to call it a copy — 0.74 (74%).
  scores  Signature 44%  ·  Structure 99%  ·  AST 78%  ·  Control flow 76%
  Signature  params · 50%  #1 date≠other
    types · 0%  #1 Candidate[]≠SourceFile  #2 { ctx:FileContext; sf:SourceFile; text:string; project:Project; arch:Arch; repoFiles:string[]; importMap:ReadonlyMap<string,string>; }≠{ arch:Arch; repoFiles:string[]; }
    name sites  param,type-prop 0:68↔1:86  prop 0:71,72,73,74,75,76,78,79↔1:92,93,94  var-decl 0:69,80↔1:87,88,89,90,91,94
    return Candidate[] ≡ Candidate[]
  Structure  0.58 · 58%  array 0:↔1:94  bin 0:73,76,78↔1:87,90,94  call · 50% 0:70,78,79,80↔1:88,89,90,91,92,93,94,96  for-of 0:80↔1:  member · 67% 0:71,73,74,76,78,80↔1:87,90,94,96  new 0:76↔1:  object 0:70,76,78,79↔1:90,92,93,94  prop · 38% 0:71,72,73,74,75,76,78,79↔1:92,93,94  return 0:82↔1:96
    only local: for-of 1, new 1  only canonical: array 1
  AST  call:attachFrameworkFacts L 78 ↔ R 92 · 53%  prop:sf L 78 ↔ R 92  prop:text L 78 ↔ R 92  prop:importMap L 78 ↔ R 92  object:object L 78 ↔ R 92  prop:rel L 78 ↔ R 92  prop:repoRoot L 78 ↔ R 92  return:return L 82 ↔ R 96
  Control flow  0.76  /call ×1, call/object ×1, call>object/prop ×5, /call ×1, call/object ×1, call>object/prop ×1, /return ×1
    local  1 /var-destr · 2 /call · 3 call/object · 4 call>object/prop · 5 call>object>prop/member · 6 call>object/prop · 7 call>object/prop · 8 call>object>prop/bin · 9 call>object>prop>bin/bin · 10 call>object>prop>bin>bin/member · 11 call>object>prop>bin>bin/member → call>object/prop · call>object>prop/member · call>object/prop · call>object/prop · call>object>prop/bin · call>object>prop>bin/member · call>object>prop>bin/object · call>object>prop>bin>object/prop · call>object>prop>bin>object>prop/new · call>object>prop>bin>object/prop · call>object>prop>bin>object>prop/new · /call · call/object · call>object/prop · call>object>prop/member · call>object/prop · call>object/prop · call>object/prop · call>object>prop/bin · call>object>prop>bin/member · call>object>prop>bin/member · call>object/prop · /call · call/object · call>object/prop · /for-of · for-of/call · for-of>call/member · for-of>call>member/member · for-of>call>member>member/member · /return
    canonical  1 /const · 2 const/bin · 3 const>bin/member · 4 const>bin>member/member · 5 /const · 6 const/call · 7 const>call/call · 8 /const · 9 const/call · 10 /const · 11 const/call → const>call/bin · const>call>bin/member · const>call>bin>member/member · const>call>bin/object · const>call/member · /const · const/call · /call · call/object · call>object/prop · call>object/prop · call>object/prop · call>object/prop · call>object/prop · /call · call/object · call>object/prop · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/bin · const>call>object>prop>bin/member · const>call>object>prop>bin>member/member · const>call>object>prop>bin/object · const>call>object/prop · const>call>object/prop · const>call>object>prop/array · /return · return/member · return>member/call · return>member>call/member · return>member>call>member/member · return>member>call/member
  **Fix** — Replace the local body with a call to `classifyFile` from `code-roles/project.ts`.
- **collectFacts** — `collectFacts` looks like the canonical `read`, but not closely enough to call it a copy — 0.74 (74%).
  scores  Signature 25%  ·  Structure 98%  ·  AST 100%  ·  Control flow 83%
  Signature  params · 0%  #1 args only on the local side
    types · 0%
    name sites  prop 0:95,100,101,104↔1:119  var-decl 0:92,93,94,95,96,100,101,102↔1:111,112,113,114,115
    return { ctx:FileContext; candidates:Candidate[]; fileFacts:FileFacts; } ≠ Candidate[]
  Structure  0.58 · 58%  array 0:101↔1:  bin · 25% 0:96,100,101,102↔1:114  call 0:93,94,95,96,100,101↔1:111,112,113,114,115,119  for-of 0:102↔1:  member · 80% 0:96,100,101,102↔1:111,113,114,115,119  object · 50% 0:95,100,101,104↔1:114,119  prop · 25% 0:95,100,101,104↔1:119  return 0:104↔1:121
    only local: array 1, for-of 1
  AST  var:const L 93 ↔ R 112  call:readFileSync L 93 ↔ R 112  var:const L 94 ↔ R 113 · 86%  call:loadSourceFile L 94 ↔ R 113 · 80%  var:const L 96 ↔ R 114 · 83%  call:importNameModules L 96 ↔ R 114 · 80%  bin:?? L 96 ↔ R 114 · 75%  member:v L 96 ↔ R 114  member:v L 96 ↔ R 114  var:const L 92 ↔ R 111  var:const L 100 ↔ R 115  return:return L 104 ↔ R 121
  Control flow  0.83  /const ×1, const/call ×1, /const ×1, const/call ×1, /const ×1, const/call ×1, /const ×1, const/call ×1, const>call/bin ×1, const>call>bin/member ×1, const>call/member ×1, /const ×1, const/call ×1, /return ×1
    local  1 /const · 2 /const · 3 const/call · 4 /const · 5 const/call · 6 /const · 7 const/call · 8 const>call/object · 9 const>call>object/prop · 10 const>call>object/prop · 11 const>call>object/prop · 12 /const · 13 const/call · 14 const>call/bin → const>call>bin/member · const>call/member · /const · const/call · const>call/call · const>call>call/member · const>call>call/bin · const>call>call>bin/member · const>call/object · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · /const · const/call · const>call/object · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/bin · const>call>object>prop>bin/member · const>call>object/prop · const>call>object>prop/array · /for-of · for-of/bin · for-of>bin/member · /return · return/object · return>object/prop · return>object/prop · return>object/prop
    canonical  1 /const · 2 const/call · 3 const>call/member · 4 /const · 5 const/call · 6 /const · 7 const/call · 8 const>call/member · 9 /const · 10 const/call · 11 const>call/member · 12 const>call/bin · 13 const>call>bin/member · 14 const>call>bin/object → const>call/member · /const · const/call · const>call/member · /call · call/object · call>object/prop · call>object/prop · call>object/prop · call>object/prop · call>object>prop/member · call>object/prop · /return
  **Fix** — Replace the local body with a call to `read` from `entities/ast/depth.ts`.
- **buildArchitecture** — `buildArchitecture` looks like the canonical `taggedWriteOf`, but not closely enough to call it a copy — 0.74 (74%).
  scores  Signature 25%  ·  Structure 100%  ·  AST 94%  ·  Control flow 87%
  Signature  params · 0%  #1 other≠generic  #2 ctx only on the canonical side
    types · 0%  #1 ArchSections≠Node<ts.Node>
    name sites  param 0:56↔1:180  prop 0:64,65,66,67,69↔1:190,193  var-decl 0:58,60,61,62,63↔1:181,183,185,186,187,188,189,190,191
    return Arch ≠ AssignmentFact
  Structure  0.59 · 59%  array 0:62↔1:  bin 0:62,67↔1:191,193  call · 78% 0:57,59,60,61,62,67,71↔1:181,183,186,187,188,189,190,191,193  cond · 33% 0:60↔1:186,187,188  if 0:57,59↔1:182,184  member · 63% 0:59,60,61,62,67↔1:181,183,186,187,188,189,190,191  new 0:62↔1:  object · 67% 0:60,63,67↔1:190,193  prop · 40% 0:64,65,66,67,69↔1:190,193  return · 33% 0:73↔1:182,184,193  throw 0:57,59↔1:  unary 0:57,59↔1:182,184
    only local: array 1, new 1, throw 2
  AST  unary:54 L 57 ↔ R 182 · 67%  var:const L 58 ↔ R 183 · 50%  unary:54 L 59 ↔ R 184 · 50%  var:const L 60 ↔ R 186 · 67%  cond:cond L 60 ↔ R 186 · 57%  member:v L 60 ↔ R 186  if:if L 57 ↔ R 182  if:if L 59 ↔ R 184  var:const L 61 ↔ R 181  var:const L 62 ↔ R 190  var:const L 63 ↔ R 191  return:return L 73 ↔ R 193
  Control flow  0.87  /if ×1, if/unary ×1, /const ×1, /if ×1, if/unary ×1, /const ×1, const/cond ×1, const>cond/call ×1, const>cond>call/member ×1, /const ×1, const/call ×1, const>call/member ×1, /const ×1, const/call ×1, /const ×1, /return ×1
    local  1 /if · 2 if/unary · 3 if>unary/call · 4 if/throw · 5 if>throw/call · 6 /const · 7 /if · 8 if/unary · 9 if>unary/member · 10 if>unary>member/call · 11 if/throw · 12 if>throw/call · 13 /const · 14 const>cond/member · 15 const/cond · 16 const>cond/call → const>cond>call/member · const>cond/object · /const · const/call · const>call/member · /const · const/call · const>call/bin · const>call>bin/member · const>call>bin/array · const>call/call · /const · const/object · const>object/prop · const>object/prop · const>object/prop · const>object/prop · const>object>prop/call · const>object>prop>call/bin · const>object>prop>call>bin/member · const>object>prop>call>bin/object · const>object/prop · /call · /return
    canonical  1 /const · 2 const/call · 3 const>call/member · 4 /if · 5 if/unary · 6 if/return · 7 /const · 8 const/call · 9 const>call/member · 10 /if · 11 if/unary · 12 if/return · 13 /var-destr · 14 /const · 15 const/cond · 16 const>cond/call → const>cond>call/member · /const · const/cond · const>cond/call · const>cond>call/member · /const · const/cond · const>cond/call · const>cond>call/call · const>cond>call/member · /const · const/call · const>call/member · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object/prop · /const · const/bin · const>bin/bin · const>bin>bin/member · const>bin>bin/member · const>bin/call · /return · return/object · return>object/prop · return>object/prop · return>object/prop · return>object/prop · return>object>prop/bin · return>object>prop>bin/bin · return>object/prop · return>object>prop/call
  **Fix** — Replace the local body with a call to `taggedWriteOf` from `entities/ast/assignments-tagged.ts`.
- **buildState** — `buildState` looks like the canonical `statementImport`, but not closely enough to call it a copy — 0.73 (73%).
  scores  Signature 42%  ·  Structure 98%  ·  AST 80%  ·  Control flow 77%
  Signature  params · 50%  #1 string≠other
    types · 0%  #1 string≠ImportDeclaration  #2 RuleOptions≠ResolveCtx
    name sites  callback-param 0:76↔1:23  param 0:60↔1:20  prop 0:75,76↔1:23  var-decl 0:61,67,68,75,76↔1:21,23,24,26
    return RuleState ≠ ImportFact
  Structure  0.5 · 50%  array 0:67,68↔1:  bin 0:64,67,68,72↔1:23,25,27,28  call · 57% 0:61,75,76,77↔1:21,23,24,25,26,27,28  cond 0:72↔1:  if 0:↔1:25,27  member · 75% 0:64,67,68,72↔1:25,27,28  new 0:67,68,76↔1:  object · 50% 0:75,76↔1:23  prop · 50% 0:75,76↔1:23  return 0:78↔1:30
    only local: array 2, cond 1, new 3  only canonical: if 2
  AST  bin:= L 64 ↔ R 28 · 50%  member:v L 64 ↔ R 28  return:return L 78 ↔ R 30  var:const L 61 ↔ R 21  var:const L 67 ↔ R 23  var:const L 68 ↔ R 26  var:const L 75 ↔ R 24
  Control flow  0.77  /const ×1, const/call ×1, /const ×1, const/object ×1, const>object/prop ×2, const>object>prop/call ×1, const>object/prop ×1, const>object>prop/call ×1, const>object/prop ×1, /return ×1
    local  1 /const · 2 const/call · 3 /bin · 4 bin/member · 5 /const · 6 const/array · 7 const>array/new · 8 const>array>new/array · 9 const>array>new>array/bin · 10 const>array>new>array>bin/member · 11 const>array>new>array>bin/array → /const · const/array · const>array/new · const>array>new/array · const>array>new>array/bin · const>array>new>array>bin/member · const>array>new>array>bin/array · /bin · bin/member · bin>cond/bin · bin/cond · bin>cond/member · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · /const · const/object · const>object/prop · const>object/prop · const>object>prop/call · const>object/prop · const>object>prop/call · const>object/prop · const>object>prop/new · /call · /return
    canonical  1 /const · 2 const/call · 3 /const · 4 const/object · 5 const>object/prop · 6 const>object/prop · 7 const>object/prop · 8 const>object>prop/call · 9 const>object/prop · 10 const>object>prop>call/call · 11 const>object>prop/call → const>object/prop · const>object>prop/call · const>object/prop · /const · const/call · /if · if/bin · if>bin/member · if>bin/call · /const · const/call · /if · if/bin · if>bin/member · if>bin/call · /bin · bin/member · bin/call · bin>call/call · /return
  **Fix** — Replace the local body with a call to `statementImport` from `entities/ast/file-imports.ts`.
- **declaredRolesOf** — `declaredRolesOf` looks like the canonical `namesOfParameter`, but not closely enough to call it a copy — 0.73 (73%).
  scores  Signature 44%  ·  Structure 99%  ·  AST 95%  ·  Control flow 57%
  Signature  params · 33%  #2 own only on the local side  #3 arch only on the local side
    types · 0%  #1 NodeMatch≠ParameterFact
    name words · 33% of
    name sites  callback-param 0:41↔1:100  param 0:38↔1:98
    return string[] ≡ string[]
  Structure  0.8 · 80%  array 0:41,43↔1:100,103  bin · 50% 0:41,43↔1:99  call · 67% 0:39,41↔1:99,100,103  cond · 50% 0:43↔1:100,103  if 0:40↔1:99  member 0:40,41,43↔1:99,100,103  return 0:40,43↔1:100,103
  AST  member:v L 40 ↔ R 99  return:return L 43 ↔ R 103 · 67%  cond:cond L 43 ↔ R 103 · 63%  array:array L 43 ↔ R 103  member:v L 43 ↔ R 103  if:if L 40 ↔ R 99
  Control flow  0.57  /if ×1, if/return ×1, /return ×1, return/cond ×1, return>cond/array ×1
    local  1 /const · 2 const/call · 3 /if · 4 if/member · 5 if/return → /const · const>call/bin · const>call>bin/member · const>call>bin>member/member · const>call>bin/array · const/call · /return · return/cond · return>cond/bin · return>cond>bin/member · return>cond>bin>member/member · return>cond>bin/array · return>cond/array
    canonical  1 /if · 2 if/bin · 3 if>bin/call · 4 if>bin>call/member · 5 if>bin/member → if>bin>member/member · if/return · if>return>call/member · if>return/call · /return · return>cond/member · return/cond · return>cond/array · return>cond>array/call · return>cond>array>call/member · return>cond/array
  **Fix** — Replace the local body with a call to `namesOfParameter` from `frameworks/react/index.ts`.
- **checkUnroled** — `checkUnroled` looks like the canonical `collectProblems`, but not closely enough to call it a copy — 0.73 (73%).
  scores  Signature 44%  ·  Structure 90%  ·  AST 93%  ·  Control flow 72%
  Signature  params · 33%  #1 date≠other  #3 sink only on the canonical side
    types · 0%  #1 readonly Candidate[]≠Branch  #2 { present:readonly string[]; ctx:FileContext; arch:Arch; project:Project; repoFiles:string[]; out:Finding[]; }≠{ rawValue:string; noProviderRole:boolean; }
    name sites  param,type-prop 0:217↔1:57  prop 0:225,226↔1:59,61,65  var-decl 0:218,219,223,224,225↔1:58,59,61
    return void ≡ void
  Structure  0.5 · 50%  array 0:↔1:61  bin · 33% 0:226↔1:59,61,65  call · 80% 0:219,223,224,225,226↔1:58,59,61,65  for-of 0:↔1:59,61  if · 50% 0:226↔1:60,65  member · 40% 0:223,226↔1:58,59,60,61,65  object · 67% 0:225,226↔1:59,61,65  prop · 67% 0:225,226↔1:59,61,65  return 0:↔1:60  unary 0:226↔1:65
    only canonical: array 1, for-of 2, return 1
  AST  bin:&& L 226 ↔ R 65 · 60%  unary:54 L 226 ↔ R 65  member:v L 226 ↔ R 65  unary:54 L 226 ↔ R 65  var:const L 219 ↔ R 58  if:if L 226 ↔ R 65
  Control flow  0.72  /const ×1, const/call ×1, /if ×1, if/bin ×1, if>bin/unary ×1, if>bin>unary/member ×1, if/call ×1, if>call/object ×1, if>call>object/prop ×2
    local  1 /var-destr · 2 /const · 3 const/call · 4 /const · 5 const/call · 6 const>call/call · 7 const>call>call/member · 8 const>call/call · 9 /const · 10 const/call → const>call/call · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · /if · if/bin · if>bin/unary · if>bin>unary/member · if>bin/unary · if/call · if>call/object · if>call>object/prop · if>call>object/prop · if>call>object/prop · if>call>object/prop
    canonical  1 /const · 2 const/call · 3 const>call/member · 4 /for-of · 5 for-of/member · 6 for-of/call · 7 for-of>call/object · 8 for-of>call>object/prop · 9 for-of>call>object>prop/call · 10 for-of>call>object>prop>call/member → for-of>call>object/prop · for-of>call>object>prop/bin · for-of>call>object>prop>bin/member · for-of>call>object>prop>bin/bin · for-of>call>object>prop>bin>bin/member · for-of>call>object/prop · for-of>call>object>prop/member · for-of>call/member · for-of>call/member · /if · if/member · if>member/member · if/return · /for-of · for-of/bin · for-of>bin/member · for-of>bin/array · for-of/call · for-of>call/object · for-of>call>object/prop · for-of>call>object/prop · for-of>call>object>prop/member · for-of>call>object/prop · for-of>call>object>prop/member · for-of>call/member · for-of>call/member · /if · if/bin · if>bin/bin · if>bin>bin/unary · if>bin>bin/unary · if>bin>bin>unary/member · if>bin/unary · if>bin>unary/member · if/call · if>call/object · if>call>object/prop · if>call>object/prop · if>call>object>prop/member · if>call/member · if>call/member
  **Fix** — Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`.
- **buildFileContext** — `buildFileContext` looks like the canonical `buildProblemView`, but not closely enough to call it a copy — 0.73 (73%).
  scores  Signature 25%  ·  Structure 98%  ·  AST 89%  ·  Control flow 89%
  Signature  params · 0%  #1 string≠object  #2 arch only on the local side  #3 load only on the local side
    types · 0%  #1 string≠{ finding:EnrichedFinding; story:Story; nodes:NodeSummary[]; }
    name words · 33% build
    name sites  param,type-prop 0:23↔1:54  prop 0:28,29,30,31,32,33,34,37,38,39,40,41,44↔1:58,66,67,68,69,70,71,72  var-decl 0:24,25↔1:55,58,59,60,61,62,63
    return FileContext ≠ ProblemView
  Structure  0.63 · 63%  array · 33% 0:38↔1:58,61,68  bin · 67% 0:24,34↔1:58,61,62  call · 60% 0:25,30,31↔1:59,60,63,69,70  member · 71% 0:24,30,31,32,34,41,44↔1:58,61,62,66,67  object · 67% 0:27,34↔1:58,62,65  prop · 62% 0:28,29,30,31,32,33,34,37,38,39,40,41,44↔1:58,66,67,68,69,70,71,72  return 0:27↔1:65
  AST  var:const L 24 ↔ R 61 · 83%  bin:?? L 24 ↔ R 61 · 75%  member:v L 24 ↔ R 61  var:const L 25 ↔ R 60  return:return L 27 ↔ R 65  object:object L 27 ↔ R 65
  Control flow  0.89  /const ×1, const/bin ×1, const>bin/member ×1, /const ×1, const/call ×1, /return ×1, return/object ×1, return>object/prop ×2, return>object>prop/member ×1, return>object/prop ×1, return>object>prop/array ×1, return>object/prop ×4
    local  1 /const · 2 const/bin · 3 const>bin/member · 4 /const · 5 const/call · 6 /return · 7 return/object · 8 return>object/prop · 9 return>object/prop · 10 return>object/prop · 11 return>object>prop>call/member · 12 return>object>prop/call · 13 return>object/prop · 14 return>object>prop>call/member · 15 return>object>prop/call · 16 return>object/prop → return>object>prop/member · return>object/prop · return>object/prop · return>object>prop/bin · return>object>prop>bin/member · return>object>prop>bin/object · return>object/prop · return>object/prop · return>object>prop/array · return>object/prop · return>object/prop · return>object/prop · return>object>prop/member · return>object/prop · return>object>prop/member
    canonical  1 /var-destr · 2 /const · 3 const/object · 4 const>object/prop · 5 const>object/prop · 6 const>object/prop · 7 const>object/prop · 8 const>object>prop/bin · 9 const>object>prop>bin/member · 10 const>object>prop>bin/array · 11 /const · 12 const/call · 13 /const · 14 const/call · 15 /const · 16 const/bin → const>bin/member · const>bin/array · /const · const/bin · const>bin/member · const>bin/object · /const · const/call · /return · return/object · return>object/prop · return>object>prop/member · return>object/prop · return>object>prop/member · return>object/prop · return>object>prop/array · return>object/prop · return>object>prop/call · return>object/prop · return>object>prop/call · return>object/prop · return>object/prop
  **Fix** — Replace the local body with a call to `buildProblemView` from `report/user-report/src/graph/decision.ts`.
- **buildArchitecture** — `buildArchitecture` looks like the canonical `buildAccessGraph`, but not closely enough to call it a copy — 0.72 (72%).
  scores  Signature 39%  ·  Structure 96%  ·  AST 86%  ·  Control flow 74%
  Signature  params
    types · 0%  #1 ArchSections≠GraphAsk
    name words · 33% build
    name sites  callback-param 0:62↔1:87  param 0:56↔1:84  prop 0:64,65,66,67,69↔1:97,98,99,100,101,102,103,104,105  var-decl 0:58,60,61,62,63↔1:85,86,87,88,90,91,92,93,94
    return Arch ≠ AccessGraph
  Structure  0.46 · 46%  array · 50% 0:62↔1:87,93  bin · 50% 0:62,67↔1:93  call · 64% 0:57,59,60,61,62,67,71↔1:87,88,90,91,92,93,94,98,103,104,105  cond 0:60↔1:  if 0:57,59↔1:  member · 40% 0:59,60,61,62,67↔1:86,87  new 0:62↔1:87  object · 33% 0:60,63,67↔1:96  prop · 56% 0:64,65,66,67,69↔1:97,98,99,100,101,102,103,104,105  return 0:73↔1:96  throw 0:57,59↔1:  unary 0:57,59↔1:
    only local: cond 1, if 2, throw 2, unary 2
  AST  var:const L 58 ↔ R 90 · 75%  var:const L 61 ↔ R 86 · 80%  member:v L 61 ↔ R 86  var:const L 60 ↔ R 92  var:const L 62 ↔ R 88  var:const L 63 ↔ R 94  return:return L 73 ↔ R 96
  Control flow  0.74  /const ×3, const/call ×1, /const ×1, const/call ×1, const>call/bin ×1, const>call>bin/array ×1, /const ×1, /return ×1
    local  1 /if · 2 if/unary · 3 if>unary/call · 4 if/throw · 5 if>throw/call · 6 /const · 7 /if · 8 if/unary · 9 if>unary/member · 10 if>unary>member/call → if/throw · if>throw/call · /const · const>cond/member · const/cond · const>cond/call · const>cond>call/member · const>cond/object · /const · const/call · const>call/member · /const · const/call · const>call/bin · const>call>bin/member · const>call>bin/array · const>call/call · /const · const/object · const>object/prop · const>object/prop · const>object/prop · const>object/prop · const>object>prop/call · const>object>prop>call/bin · const>object>prop>call>bin/member · const>object>prop>call>bin/object · const>object/prop · /call · /return
    canonical  1 /var-destr · 2 /const · 3 const/member · 4 /const · 5 const/new · 6 const>new/call · 7 /const · 8 const/call · 9 /const · 10 const/call → /var-destr · var-destr/call · /const · const/call · /const · const/call · const>call/bin · const>call>bin/array · /const · const/call · /return · return/object · return>object/prop · return>object/prop · return>object>prop/call · return>object/prop · return>object/prop · return>object/prop · return>object/prop · return>object/prop · return>object>prop/call · return>object/prop · return>object>prop/call · return>object/prop · return>object>prop/call
  **Fix** — Replace the local body with a call to `buildAccessGraph` from `report/user-report/data/graph.ts`.
- **wrapperShape** — `wrapperShape` looks like the canonical `boxOfPlace`, but not closely enough to call it a copy — 0.72 (72%).
  scores  Signature 50%  ·  Structure 94%  ·  AST 93%  ·  Control flow 51%
  Signature  params · 0%  #1 date≠other  #2 path only on the canonical side
    types · 0%  #1 Candidate≠Arch
    name sites  param 0:68↔1:109
    return string ≡ string
  Structure  0.54 · 54%  array 0:69↔1:  bin · 50% 0:69,72↔1:111  call 0:69↔1:111  cond 0:72↔1:  if 0:70↔1:110  member · 50% 0:69,72↔1:111  return 0:70,72↔1:110,111  template 0:72↔1:  unary · 50% 0:69,70↔1:110
    only local: array 1, cond 1, template 1
  AST  if:if L 70 ↔ R 110  unary:54 L 70 ↔ R 110  return:return L 70 ↔ R 110  return:return L 72 ↔ R 111
  Control flow  0.51  /if ×1, if/unary ×1, if/return ×1, /return ×1
    local  1 /const · 2 const>call/bin · 3 const>call>bin/member · 4 const>call>bin/array → const/call · /if · if/unary · if/return · /return · return/template · return>template/bin · return>template>bin/member · return>template>cond/member · return>template/cond · return>template>cond/template · return>template>cond>template/member
    canonical  1 /if · 2 if/unary · 3 if/return · 4 /return → return/bin · return>bin/member · return>bin>member/call · return>bin>member>call/call
  **Fix** — Replace the local body with a call to `boxOfPlace` from `entities/location.ts`.
- **withFacets** — `withFacets` looks like the canonical `classifiedFile`, but not closely enough to call it a copy — 0.72 (72%).
  scores  Signature 70%  ·  Structure 98%  ·  AST 94%  ·  Control flow 12%
  Signature  params · 50%  #1 date≠string
    types · 0%  #1 Candidate[]≠string  #2 { ctx:FileContext; sf:SourceFile; text:string; project:Project; arch:Arch; repoFiles:string[]; importMap:ReadonlyMap<string,string>; }≠{ arch:Arch; repoRoot:string; repoFiles:string[]; project:Project; }
    name sites  param,type-prop 0:68↔1:30  prop 0:71,72,73,74,75,76,78,79↔1:37,38,39  var-decl 0:69,80↔1:31,32,34,35,36,39,40
    return Candidate[] ≡ Candidate[]
  Structure  0.53 · 53%  array 0:↔1:39,43  bin · 75% 0:73,76,78↔1:35,39,40,41  call · 50% 0:70,78,79,80↔1:32,34,35,36,37,38,39,41  for-of 0:80↔1:40  member · 67% 0:71,73,74,76,78,80↔1:35,39,40,41  new 0:76↔1:  object · 80% 0:70,76,78,79↔1:35,37,38,39,41  prop · 38% 0:71,72,73,74,75,76,78,79↔1:37,38,39  return · 50% 0:82↔1:41,43  try 0:↔1:33
    only local: new 1  only canonical: array 2, try 1
  AST  var-destr:var-destr L 69 ↔ R 31  call:attachCssFacts L 79 ↔ R 38  object:object L 79 ↔ R 38  prop:sf L 79 ↔ R 38
  Control flow  0.12  /var-destr ×1
    local  1 /var-destr → /call · call/object · call>object/prop · call>object>prop/member · call>object/prop · call>object/prop · call>object>prop/bin · call>object>prop>bin/bin · call>object>prop>bin>bin/member · call>object>prop>bin>bin/member · call>object/prop · call>object>prop/member · call>object/prop · call>object/prop · call>object>prop/bin · call>object>prop>bin/member · call>object>prop>bin/object · call>object>prop>bin>object/prop · call>object>prop>bin>object>prop/new · call>object>prop>bin>object/prop · call>object>prop>bin>object>prop/new · /call · call/object · call>object/prop · call>object>prop/member · call>object/prop · call>object/prop · call>object/prop · call>object>prop/bin · call>object>prop>bin/member · call>object>prop>bin/member · call>object/prop · /call · call/object · call>object/prop · /for-of · for-of/call · for-of>call/member · for-of>call>member/member · for-of>call>member>member/member · /return
    canonical  1 /var-destr → /const · const/call · /try · try/const · try>const/call · try>const>call/call · try/const · try>const/call · try>const>call/bin · try>const>call>bin/member · try>const>call>bin/object · try/const · try>const/call · try/call · try>call/object · try>call>object/prop · try>call>object/prop · try>call>object/prop · try>call>object>prop/call · try>call>object/prop · try/call · try>call/object · try>call>object/prop · try/const · try>const/call · try>const>call/object · try>const>call>object/prop · try>const>call>object/prop · try>const>call>object/prop · try>const>call>object>prop/bin · try>const>call>object>prop>bin/member · try>const>call>object>prop>bin/object · try>const>call>object/prop · try>const>call>object/prop · try>const>call>object>prop/array · try/for-of · try>for-of/bin · try>for-of>bin/member · try/return · try>return/member · try>return>member/call · try>return>member>call/bin · try>return>member>call>bin/member · try>return>member>call>bin/object · try/catch · try>catch/return · try>catch>return/array
  **Fix** — Replace the local body with a call to `classifiedFile` from `report/user-report/data/role-examples.ts`.
- **declarationShape** — `declarationShape` looks like the canonical `reportMessage`, but not closely enough to call it a copy — 0.72 (72%).
  scores  Signature 44%  ·  Structure 99%  ·  AST 89%  ·  Control flow 56%
  Signature  params · 0%  #1 date≠union
    types · 0%  #1 Candidate≠string|number|boolean|readonly FieldValue[]|{ readonly [key:string]:FieldValue; }|ReportObject
    name sites  param 0:75↔1:23  var-decl 0:76,80↔1:26,27
    return string ≡ string
  Structure  0.53 · 53%  array 0:76↔1:  bin · 67% 0:76,80,81↔1:24,28  call 0:81↔1:25  cond 0:↔1:28  if 0:77,81↔1:24,25  index 0:76↔1:  member · 50% 0:76,77,80,81↔1:26,27  return 0:77,81,83↔1:24,25,28  template 0:77,81↔1:  unary 0:↔1:25
    only local: array 1, index 1, template 2  only canonical: cond 1, unary 1
  AST  var:const L 76 ↔ R 27 · 50%  member:v L 76 ↔ R 27  var:const L 80 ↔ R 26 · 67%  member:v L 80 ↔ R 26  if:if L 77 ↔ R 24  return:return L 77 ↔ R 24  if:if L 81 ↔ R 25  return:return L 81 ↔ R 25  return:return L 83 ↔ R 28
  Control flow  0.56  /if ×1, if/return ×1, /if ×1, if/return ×1, /return ×1
    local  1 /const · 2 const/index · 3 const>index/bin · 4 const>index>bin/member · 5 const>index>bin/array → /if · if/return · if>return/template · if>return>template/member · /const · const/bin · const>bin/member · /if · if/bin · if>bin/bin · if>bin>bin/member · if/return · if>return/template · if>return>template/call · /return
    canonical  1 /if · 2 if/bin · 3 if/return · 4 /if · 5 if/unary → if>unary/call · if/return · /const · const/member · /const · const/member · /return · return/bin · return>bin/bin · return>bin>bin>cond/bin · return>bin>bin/cond · return>bin>bin>cond/bin · return>bin>bin/cond
  **Fix** — Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`.
- **aliasShape** — `aliasShape` looks like the canonical `boxOfPlace`, but not closely enough to call it a copy — 0.72 (72%).
  scores  Signature 50%  ·  Structure 96%  ·  AST 93%  ·  Control flow 47%
  Signature  params · 0%  #1 date≠other  #2 path only on the canonical side
    types · 0%  #1 Candidate≠Arch
    name sites  param 0:60↔1:109
    return string ≡ string
  Structure  0.58 · 58%  bin 0:62↔1:111  call · 50% 0:61,62↔1:111  cond 0:62,65↔1:  if 0:63↔1:110  index 0:62↔1:  member 0:65↔1:111  return 0:63,65↔1:110,111  template 0:65↔1:  unary 0:63↔1:110
    only local: cond 2, index 1, template 1
  AST  if:if L 63 ↔ R 110  unary:54 L 63 ↔ R 110  return:return L 63 ↔ R 110  return:return L 65 ↔ R 111
  Control flow  0.47  /if ×1, if/unary ×1, if/return ×1, /return ×1
    local  1 /const · 2 const/call · 3 /const · 4 const>cond/bin → const>cond>bin/call · const>cond>bin/call · const>cond>bin>call/index · const/cond · const>cond/index · /if · if/unary · if/return · /return · return/template · return>template/member · return>template>cond/member · return>template/cond · return>template>cond/member · return>template/cond · return>template>cond/template · return>template>cond>template/member
    canonical  1 /if · 2 if/unary · 3 if/return · 4 /return → return/bin · return>bin/member · return>bin>member/call · return>bin>member>call/call
  **Fix** — Replace the local body with a call to `boxOfPlace` from `entities/location.ts`.
- **create** — `create` looks like the canonical `exportText`, but not closely enough to call it a copy — 0.72 (72%).
  scores  Signature 39%  ·  Structure 99%  ·  AST 74%  ·  Control flow 78%
  ! The bodies do not look alike: AST 0.74 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params
    types · 0%  #1 RuleContext≠FieldValue
    name sites  param 0:71↔1:49  var-decl 0:72,73,77,78,79,80,83,84,88,90,93↔1:50,52,54,55,59
    return Record<string,(node:FieldValueNode)=>void> ≠ string
  Structure  0.48 · 48%  bin · 20% 0:73,77,81,88,90↔1:54  call · 82% 0:72,73,77,78,79,80,82,84,90,91,93↔1:50,52,53,54,55,56,58,59,60  cond · 67% 0:77,88,90↔1:55,56  for-of 0:93↔1:  if · 75% 0:81,82,89↔1:51,53,58,60  index 0:72↔1:  member · 33% 0:72,73,77,79,88,90↔1:55,58  object 0:82,95↔1:  return · 60% 0:81,82,95↔1:51,56,58,60,61  template 0:↔1:55,56,58,60
    only local: for-of 1, index 1, object 2  only canonical: template 4
  AST  if:if L 81 ↔ R 51 · 67%  return:return L 81 ↔ R 51  return:return L 95 ↔ R 61 · 50%  var:const L 72 ↔ R 52  var:const L 73 ↔ R 59  var:const L 80 ↔ R 50  if:if L 82 ↔ R 58  return:return L 82 ↔ R 58  if:if L 89 ↔ R 60
  Control flow  0.78  /const ×1, const/call ×1, /const ×1, const/call ×1, /if ×1, if/return ×1, /if ×1, if/return ×1, /const ×1, const/call ×1, /if ×1, /return ×1
    local  1 /const · 2 const/call · 3 const>call/index · 4 const>call>index/member · 5 /const · 6 const/bin · 7 const>bin/member · 8 const>bin/call · 9 /const · 10 const>cond/bin · 11 const/cond · 12 const>cond/call → const>cond>call/member · /const · const/call · const>call/call · /const · const>call>call/call · const>call/call · const>call>call/member · const/call · /const · const/call · /if · if/bin · if/return · /if · if/call · if/return · if>return/object · /var-destr · /const · const/call · /const · const>cond/bin · const>cond>bin/member · const/cond · const>cond/bin · const>cond>bin/member · /if · if/const · if>const>cond/bin · if>const/cond · if>const>cond/call · if>const>cond>call/member · if/call · if>call/call · /for-of · for-of/call · /return · return/object
    canonical  1 /const · 2 const/call · 3 /if · 4 if/return · 5 /const · 6 const/call · 7 /if · 8 if/call · 9 if/const · 10 if>const/bin · 11 if>const>bin/call · 12 if>const>bin/call → if/const · if>const>cond/member · if>const/cond · if>const>cond/template · if>const>cond>template/call · if/return · if>return/cond · if>return>cond/template · if>return>cond>template/call · /if · if/member · if/return · if>return/template · if>return>template/call · /const · const/call · /if · if/return · if>return/template · if>return>template/call · /return
  **Fix** — Replace the local body with a call to `exportText` from `report/errorTypes/vocabulary/phrases.ts`.
- **recordFindings** — `recordFindings` looks like the canonical `materialiseResolution`, but not closely enough to call it a copy — 0.71 (71%).
  scores  Signature 44%  ·  Structure 91%  ·  AST 94%  ·  Control flow 61%
  Signature  params · 0%  #1 other≠object  #2 string≠array  #3 findings only on the local side
    types · 0%  #1 ReportBucket≠{ declarations?:FieldValue; }  #2 string≠readonly ProviderLiteral[]
    name sites  param 0:117↔1:76  var-decl 0:118,119↔1:77,79,80,85
    return void ≡ void
  Structure  0.41 · 41%  bin · 25% 0:121,123,124,128↔1:82  call · 75% 0:119,120,122,123,125,128↔1:77,79,80,82,83,86,89,90  for-of 0:119↔1:  if · 50% 0:122,128↔1:78,81,86,90  index 0:↔1:90  member · 67% 0:120,121,122,123,124,128↔1:80,83,85,90  new 0:118↔1:  object 0:↔1:90  prop 0:↔1:90  return 0:↔1:78,86  unary 0:↔1:78,81,86
    only local: for-of 1, new 1  only canonical: index 1, object 1, prop 1, return 2, unary 3
  AST  var:const L 118 ↔ R 79 · 50%  member:v L 122 ↔ R —  call:set L 120 ↔ R 83  member:v L 120 ↔ R 83  if:if L 122 ↔ R 81  if:if L 128 ↔ R 86
  Control flow  0.61  /const ×1, /if ×2, if/bin ×1, if>call/member ×1, if/call ×1
    local  1 /const · 2 const/new · 3 /for-of · 4 for-of/call · 5 for-of>call/call · 6 call/member → /call · /bin · bin/member · /if · if/member · if/call · if>call/member · /bin · bin/member · bin/call · /if · if/bin · if>call/member · if/call
    canonical  1 /const · 2 const/call · 3 /if · 4 if/unary · 5 if/return · 6 /const → const/call · /let · let>call/member · let/call · /if · if/unary · if/bin · if>bin/call · if>call/member · if/call · /const · const/member · /if · if/unary · if>unary/call · if/return · /call
  **Fix** — Replace the local body with a call to `materialiseResolution` from `css/index.ts`.
- **skipped#anon@34** — `skipped#anon@34` looks like the canonical `filesIn#anon@48`, but not closely enough to call it a copy — 0.71 (71%).
  scores  Signature 62%  ·  Structure 72%  ·  AST 95%  ·  Control flow 58%
  Signature  params
    types
    name words · 25% anon
    name sites  param 0:34↔1:48
    return boolean ≡ boolean
  Structure  0.75 · 75%  bin 0:34↔1:48  call 0:34↔1:48  member 0:↔1:48  template 0:34↔1:48
    only canonical: member 1
  AST  call:startsWith L 34 ↔ R 48  template:template L 34 ↔ R 48
  Control flow  0.58  /bin ×1, bin/call ×1, bin>call/template ×1
    local  1 /bin · 2 bin/bin · 3 bin/call → bin>call/template
    canonical  1 /bin · 2 bin/call · 3 bin>call/template → bin/bin · bin>bin/bin · bin>bin>bin/member · bin>bin>bin>member/call
  **Fix** — Replace the local body with a call to `filesIn#anon@48` from `nodes/similar.ts`.
- **shapeOf** — `shapeOf` looks like the canonical `utilityValue`, but not closely enough to call it a copy — 0.71 (71%).
  scores  Signature 44%  ·  Structure 98%  ·  AST 83%  ·  Control flow 57%
  Signature  params · 0%  #1 date≠string  #2 arbitrary only on the canonical side  #3 dashIndex only on the canonical side
    types · 0%  #1 Candidate≠string
    name sites  param 0:88↔1:85
    return string ≡ string
  Structure  0.75 · 75%  bin · 67% 0:90,93↔1:86,87,89  call 0:90↔1:89  cond 0:93↔1:  if 0:89,91↔1:86,87  member 0:93↔1:  return 0:89,91,93↔1:86,87,89  unary 0:89↔1:87
    only local: cond 1, member 1
  AST  return:return L 89 ↔ R 87  if:if L 91 ↔ R 86 · 67%  return:return L 91 ↔ R 86  if:if L 89 ↔ R 87  return:return L 93 ↔ R 89
  Control flow  0.57  /if ×1, if/return ×1, /if ×1, if/return ×1, /return ×1
    local  1 /if · 2 if/unary · 3 if/return · 4 /const · 5 const/bin → const>bin/bin · const>bin>bin/call · const>bin>bin/call · const>bin/call · /if · if/return · /return · return>cond/bin · return>cond>bin/bin · return>cond>bin>bin/member · return>cond>bin>bin>member/member · return>cond>bin>bin>member>member/member · return/cond
    canonical  1 /if · 2 if/bin · 3 if/return · 4 /if · 5 if/bin → if>bin/unary · if/return · /return · return/call · return>call/bin
  **Fix** — Replace the local body with a call to `utilityValue` from `css/tailwind/tailwind.ts`.
- **buildFileContext** — `buildFileContext` looks like the canonical `folderContents`, but not closely enough to call it a copy — 0.71 (71%).
  scores  Signature 25%  ·  Structure 96%  ·  AST 89%  ·  Control flow 83%
  Signature  params · 33%  #1 string≠other  #2 other≠string
    types · 0%  #1 string≠ArchNode  #2 Arch≠string  #3 { sf:SourceFile; repoFiles:string[]; dedupe:SeenStore; }≠string[]
    name sites  param 0:23↔1:20  prop 0:28,29,30,31,32,33,34,37,38,39,40,41,44↔1:26,27,28,29  var-decl 0:24,25↔1:21,22,23
    return FileContext ≠ FolderContents
  Structure  0.44 · 44%  array · 33% 0:38↔1:21,22,23  bin 0:24,34↔1:21,22  call · 75% 0:25,30,31↔1:21,23,28,29  index 0:↔1:21  member · 57% 0:24,30,31,32,34,41,44↔1:21,22,23,29  new 0:↔1:21  object · 50% 0:27,34↔1:25  prop · 31% 0:28,29,30,31,32,33,34,37,38,39,40,41,44↔1:26,27,28,29  return 0:27↔1:25  template 0:↔1:21  unary 0:↔1:29
    only canonical: index 1, new 1, template 1, unary 1
  AST  var:const L 24 ↔ R 22 · 83%  bin:?? L 24 ↔ R 22 · 75%  member:v L 24 ↔ R 22  var:const L 25 ↔ R 23  return:return L 27 ↔ R 25  object:object L 27 ↔ R 25
  Control flow  0.83  /const ×1, const/bin ×1, const>bin/member ×1, /const ×1, /return ×1, return/object ×1, return>object/prop ×3, return>object>prop/call ×1, return>object/prop ×1, return>object>prop/call ×1
    local  1 /const · 2 const/bin · 3 const>bin/member · 4 /const · 5 const/call · 6 /return · 7 return/object · 8 return>object/prop · 9 return>object/prop · 10 return>object/prop · 11 return>object>prop>call/member · 12 return>object>prop/call → return>object/prop · return>object>prop>call/member · return>object>prop/call · return>object/prop · return>object>prop/member · return>object/prop · return>object/prop · return>object>prop/bin · return>object>prop>bin/member · return>object>prop>bin/object · return>object/prop · return>object/prop · return>object>prop/array · return>object/prop · return>object/prop · return>object/prop · return>object>prop/member · return>object/prop · return>object>prop/member
    canonical  1 /const · 2 const/new · 3 const>new>call>call/bin · 4 const>new>call>call>bin/array · 5 const>new>call/call · 6 const>new/call · 7 /const · 8 const/bin · 9 const>bin/member · 10 const>bin/array · 11 /const · 12 /return → return/object · return>object/prop · return>object/prop · return>object/prop · return>object>prop/call · return>object/prop · return>object>prop>call/call · return>object>prop/call
  **Fix** — Replace the local body with a call to `folderContents` from `nodes/children.ts`.
- **noRole** — `noRole` looks like the canonical `mathFunctionNames`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 54%  ·  Structure 97%  ·  AST 81%  ·  Control flow 43%
  Signature  params · 0%  #1 what only on the local side  #2 piece only on the local side  #3 view only on the local side
    types · 0%
    name sites  var-decl 0:116↔1:55,56
    return { ask:string; to:string[]; message:string; fix:string; } ≠ Set<string>
  Structure  0.5 · 50%  bin · 33% 0:118↔1:56,57,59  call 0:116,118↔1:56,57  for-of 0:↔1:56  if · 50% 0:117↔1:54,57  index 0:118↔1:  member · 67% 0:116,117,118↔1:56,57  new 0:↔1:55  object 0:116↔1:56  prop 0:116↔1:  return 0:117,120↔1:54,61  template 0:116,118↔1:  unary 0:117↔1:57
    only local: index 1, prop 1, template 2  only canonical: for-of 1, new 1
  AST  if:if L 117 ↔ R 54 · 57%  return:return L 117 ↔ R 54  return:return L 120 ↔ R 61  var:const L 116 ↔ R 55  bin:= L 118 ↔ R 59
  Control flow  0.43  /if ×1, if/return ×1, /bin ×1, /return ×1
    local  1 /const · 2 const/call · 3 const>call/object · 4 const>call>object/prop → const>call>object>prop/template · const>call>object/prop · const>call>object>prop/call · const>call>object>prop>call/member · const>call>object>prop>call/member · const>call>object>prop>call/call · const>call>object>prop>call>call/member · /if · if/unary · if>unary/member · if>unary>member/member · if/return · /bin · bin/member · bin/template · bin>template>call>call/member · bin>template>call/call · bin>template/call · bin>template/member · bin>template>member/index · bin>template>member>index/member · bin>template/member · bin>template>member/index · bin>template>member>index/member · /return
    canonical  1 /if · 2 if/return · 3 /const · 4 const/new → /for-of · for-of/call · for-of>call/bin · for-of>call>bin/member · for-of>call>bin>member/member · for-of>call>bin/object · for-of/if · for-of>if/bin · for-of>if>bin/call · for-of>if>bin/call · for-of>if>bin>call/member · for-of>if/call · for-of>if>call/call · for-of>if>call>call/unary · /bin · /return
  **Fix** — Replace the local body with a call to `mathFunctionNames` from `css/core/syntax-check.ts`.
- **shapeOf** — `shapeOf` looks like the canonical `writePath`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 44%  ·  Structure 87%  ·  AST 98%  ·  Control flow 57%
  Signature  params · 0%  #1 date≠other  #2 a only on the canonical side  #3 mutate only on the canonical side
    types · 0%  #1 Candidate≠Facts
    name sites  param 0:88↔1:106
    return string ≡ string
  Structure  0.58 · 58%  bin · 50% 0:90,93↔1:108  call 0:90↔1:  cond 0:93↔1:108  if · 50% 0:89,91↔1:107  member · 50% 0:93↔1:107,108  return · 67% 0:89,91,93↔1:107,108  unary 0:89↔1:107
    only local: call 1
  AST  if:if L 91 ↔ R 107 · 57%  return:return L 91 ↔ R 107 · 50%  return:return L 93 ↔ R 108 · 58%  cond:cond L 93 ↔ R 108 · 55%  member:v L — ↔ R 108  member:v L 93 ↔ R 108  member:v L 93 ↔ R 108
  Control flow  0.57  /if ×1, if/unary ×1, if/return ×1, /return ×1, return>cond/bin ×1
    local  1 /if · 2 if/unary · 3 if/return · 4 /const · 5 const/bin → const>bin/bin · const>bin>bin/call · const>bin>bin/call · const>bin/call · /if · if/return · /return · return>cond/bin · return>cond>bin/bin · return>cond>bin>bin/member · return>cond>bin>bin>member/member · return>cond>bin>bin>member>member/member · return/cond
    canonical  1 /if · 2 if/unary · 3 if/return · 4 if>return/member · 5 if>return>member/member → /return · return>cond/member · return/cond · return>cond/member · return>cond>member/member · return>cond/bin · return>cond>bin/member
  **Fix** — Replace the local body with a call to `writePath` from `entities/kinds.ts`.
- **noRole** — `noRole` looks like the canonical `CodePanel#anon@79`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 33%  ·  Structure 97%  ·  AST 93%  ·  Control flow 64%
  Signature  params · 0%  #1 what only on the local side  #2 piece only on the local side  #3 view only on the local side
    types · 0%
    name sites  callback-param 0:118↔1:84  var-decl 0:116↔1:80
    return { ask:string; to:string[]; message:string; fix:string; } ≠ string
  Structure  0.53 · 53%  bin 0:118↔1:80  call 0:116,118↔1:80,84  if 0:117↔1:81  index 0:118↔1:  member · 33% 0:116,117,118↔1:81  object 0:116↔1:  prop 0:116↔1:  return 0:117,120↔1:81,84  template 0:116,118↔1:  unary 0:117↔1:81
    only local: index 1, object 1, prop 1, template 2
  AST  if:if L 117 ↔ R 81 · 86%  unary:54 L 117 ↔ R 81 · 75%  member:v L 117 ↔ R 81 · 67%  return:return L 117 ↔ R 81  var:const L 116 ↔ R 80  return:return L 120 ↔ R 84
  Control flow  0.64  /const ×1, const/call ×1, /if ×1, if/unary ×1, if>unary/member ×1, if/return ×1, /return ×1
    local  1 /const · 2 const/call · 3 const>call/object · 4 const>call>object/prop · 5 const>call>object>prop/template · 6 const>call>object/prop · 7 const>call>object>prop/call → const>call>object>prop>call/member · const>call>object>prop>call/member · const>call>object>prop>call/call · const>call>object>prop>call>call/member · /if · if/unary · if>unary/member · if>unary>member/member · if/return · /bin · bin/member · bin/template · bin>template>call>call/member · bin>template>call/call · bin>template/call · bin>template/member · bin>template>member/index · bin>template>member>index/member · bin>template/member · bin>template>member/index · bin>template>member>index/member · /return
    canonical  1 /const · 2 const/call · 3 const>call/bin · 4 /if · 5 if/unary · 6 if>unary/member · 7 if/return → /return · return>call>call/call · return>call/call · return/call
  **Fix** — Replace the local body with a call to `CodePanel#anon@79` from `report/user-report/src/components/code-preview/CodePanel.tsx`.
- **wrapperShape** — `wrapperShape` looks like the canonical `reportMessage`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 44%  ·  Structure 97%  ·  AST 92%  ·  Control flow 49%
  Signature  params · 0%  #1 date≠union
    types · 0%  #1 Candidate≠string|number|boolean|readonly FieldValue[]|{ readonly [key:string]:FieldValue; }|ReportObject
    name sites  param 0:68↔1:23  var-decl 0:69↔1:26,27
    return string ≡ string
  Structure  0.67 · 67%  array 0:69↔1:  bin 0:69,72↔1:24,28  call 0:69↔1:25  cond 0:72↔1:28  if · 50% 0:70↔1:24,25  member 0:69,72↔1:26,27  return · 67% 0:70,72↔1:24,25,28  template 0:72↔1:  unary · 50% 0:69,70↔1:25
    only local: array 1, template 1
  AST  member:v L 69 ↔ R 27  if:if L 70 ↔ R 25 · 83%  unary:54 L 70 ↔ R 25 · 67%  return:return L 70 ↔ R 25  var:const L 69 ↔ R 27  return:return L 72 ↔ R 28
  Control flow  0.49  /if ×1, if/unary ×1, if/return ×1, /return ×1
    local  1 /const · 2 const>call/bin · 3 const>call>bin/member · 4 const>call>bin/array → const/call · /if · if/unary · if/return · /return · return/template · return>template/bin · return>template>bin/member · return>template>cond/member · return>template/cond · return>template>cond/template · return>template>cond>template/member
    canonical  1 /if · 2 if/bin · 3 if/return · 4 /if → if/unary · if>unary/call · if/return · /const · const/member · /const · const/member · /return · return/bin · return>bin/bin · return>bin>bin>cond/bin · return>bin>bin/cond · return>bin>bin>cond/bin · return>bin>bin/cond
  **Fix** — Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`.
- **misfitFinding** — `misfitFinding` looks like the canonical `structureFactsFor`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 25%  ·  Structure 100%  ·  AST 100%  ·  Control flow 64%
  Signature  params · 25%  #1 string≠other  #2 array≠other  #4 arch only on the local side
    types · 0%  #1 string≠EntryMatch  #2 readonly Misfit[]≠Arch  #3 FileContext≠FileFacts
    name sites  callback-param 0:65,66↔1:62,64,66,68,76  param 0:64↔1:60  prop 0:72,73,74,75,77,79,82,83,84,85↔1:71,72,73,74,75,76,77,78  var-decl 0:65,66,69,70,71↔1:61,62,64,65,66,67,68
    return Finding ≠ StructureFacts
  Structure  0.63 · 63%  array 0:↔1:66,73,75,76  bin · 50% 0:74,77,85↔1:66,67,68,71,73,75  call · 88% 0:65,66,69,71,75,79,82,84↔1:62,64,65,66,68,73,76  cond · 50% 0:70↔1:62,64  index · 50% 0:82↔1:67,73  member 0:65,69,70,74,75,77,82,83,85↔1:62,64,65,66,67,68,71,75,76  new 0:↔1:66,75,76  object · 50% 0:71,82↔1:70  prop · 80% 0:72,73,74,75,77,79,82,83,84,85↔1:71,72,73,74,75,76,77,78  return 0:82↔1:70  template · 67% 0:66,70,82↔1:62,64  unary 0:↔1:66,68
    only canonical: array 4, new 3, unary 2
  AST  var:const L 66 ↔ R 64 · 52%  call:join L 66 ↔ R 64  call:map L 66 ↔ R 64  func:<fn> L 66 ↔ R 64  template:template L 66 ↔ R 64  var:const L 65 ↔ R 68  var:const L 69 ↔ R 62  var:const L 70 ↔ R 67  var:const L 71 ↔ R 66  return:return L 82 ↔ R 70
  Control flow  0.64  /const ×1, const/call ×1, /const ×1, const/cond ×1, const>cond/template ×1, const>cond>template/member ×1, /const ×1, /return ×1
    local  1 /const · 2 const/call · 3 /const · 4 const>call/call · 5 const/call · 6 /const · 7 const/call · 8 const>call/member → /const · const/cond · const>cond/template · const>cond>template/member · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object>prop/bin · const>call>object>prop>bin/member · const>call>object/prop · const>call>object>prop/call · const>call>object>prop>call/member · const>call>object/prop · const>call>object>prop/bin · const>call>object>prop>bin/member · const>call>object/prop · const>call>object>prop/call · /return · return/call · return>call/object · return>call>object/prop · return>call>object/prop · return>call>object>prop/member · return>call>object>prop>member/index · return>call/template · return>call/object · return>call>object/prop · return>call>object>prop/member · return>call>object/prop · return>call>object>prop/call · return>call>object/prop · return>call>object>prop/bin · return>call>object>prop>bin/member
    canonical  1 /var-destr · 2 /const · 3 const>call/member · 4 const/call · 5 /const · 6 const>cond/member · 7 const/cond · 8 const>cond/template → const>cond>template/member · const>cond>template>call/call · const>cond>template/call · /var-destr · var-destr/call · var-destr>call/member · /const · const/new · const>new>call/call · const>new/call · /const · const/bin · const>bin/member · const>bin>member/index · /const · const/bin · const>bin/member · const>bin>member>call/member · const>bin>member/call · /return · return/object · return>object/prop · return>object>prop/bin · return>object>prop>bin/member · return>object/prop · return>object/prop · return>object>prop/bin · return>object>prop>bin/index · return>object>prop>bin>index/array · return>object>prop>bin>index>array/call · return>object/prop · return>object/prop · return>object>prop/array · return>object>prop>array/new · return>object>prop>array>new/bin · return>object>prop>array>new>bin/member · return>object>prop>array>new>bin/array · return>object/prop · return>object>prop/array · return>object>prop>array/new · return>object>prop>array>new/call · return>object/prop · return>object/prop
  **Fix** — Replace the local body with a call to `structureFactsFor` from `entities/tree/entries.ts`.
- **ownChildOf#anon@31** — `ownChildOf#anon@31` looks like the canonical `judgedEdge#anon@42`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 54%  ·  Structure 76%  ·  AST 85%  ·  Control flow 71%
  Signature  params
    types · 0%  #1 ArchChild≠Edge
    name words · 20% anon
    name sites  param 0:31↔1:42
    return boolean ≡ boolean
  Structure  0.75 · 75%  bin 0:31↔1:42  call 0:31↔1:  member 0:31↔1:42  unary 0:31↔1:42
    only local: call 1
  AST  bin:&& L 31 ↔ R 42 · 50%  unary:54 L 31 ↔ R 42  member:v L 31 ↔ R 42
  Control flow  0.71  /bin ×1, bin/unary ×1, bin>unary/member ×1
    local  1 /bin · 2 bin/unary · 3 bin>unary/member → bin>call/member · bin/call
    canonical  1 /bin · 2 bin/unary · 3 bin>unary/member → bin/unary · bin>unary/member
  **Fix** — Replace the local body with a call to `judgedEdge#anon@42` from `nodes/finally/relations.ts`.
- **skipped** — `skipped` looks like the canonical `isReceiverOnly`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 44%  ·  Structure 99%  ·  AST 69%  ·  Control flow 66%
  ! The bodies do not look alike: AST 0.69 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 string≠generic  #2 opts only on the local side
    types · 0%  #1 string≠Node<ts.Node>
    name sites  param 0:32↔1:150  var-decl 0:33↔1:151,153
    return boolean ≡ boolean
  Structure  0.6 · 60%  array 0:33,35↔1:  bin · 50% 0:33,34,35,37↔1:154,156  call 0:34,35,37↔1:151,153,156  if 0:34,35↔1:152,154  member · 33% 0:33,35,37↔1:154  new 0:33↔1:  return 0:34,35,37↔1:152,154,156  template 0:34↔1:  unary 0:37↔1:152
    only local: array 2, new 1, template 1
  AST  return:return L 34 ↔ R 152  return:return L 35 ↔ R 154  var:const L 33 ↔ R 151  if:if L 34 ↔ R 152  if:if L 35 ↔ R 154  return:return L 37 ↔ R 156  bin:&& L 37 ↔ R 156
  Control flow  0.66  /const ×1, /if ×1, if/return ×1, /if ×1, if/return ×1, /return ×1, return/bin ×1
    local  1 /const · 2 const/array · 3 const>array/new · 4 const>array>new/array · 5 const>array>new>array/bin · 6 const>array>new>array>bin/member · 7 const>array>new>array>bin/array → /if · if/call · if/return · /if · if>call/bin · if>call>bin/member · if>call>bin/array · if/call · if/return · /return · return/bin · return>bin/call · return>bin>call/member · return>bin>call>member/member · return>bin/unary · return>bin>unary>call/member · return>bin>unary/call
    canonical  1 /const · 2 const/call · 3 /if · 4 if/unary · 5 if/return · 6 /const · 7 const/call → /if · if/bin · if>bin/bin · if>bin>bin/member · if>bin/bin · if>bin>bin/member · if/return · /return · return/bin · return>bin/bin · return>bin>bin/call · return>bin>bin/call · return>bin/bin · return>bin>bin/call
  **Fix** — Replace the local body with a call to `isReceiverOnly` from `entities/ast/calls.ts`.
- **buildState** — `buildState` looks like the canonical `staticMapAnswer`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 42%  ·  Structure 98%  ·  AST 91%  ·  Control flow 49%
  Signature  params · 0%  #1 string≠other  #2 other≠string
    types · 0%  #1 string≠MapFold  #2 RuleOptions≠string[]
    name sites  callback-param 0:76↔1:206  param 0:60↔1:199  prop 0:75,76↔1:200  var-decl 0:61,67,68,75,76↔1:200,201,202
    return RuleState ≠ ValueAnswer
  Structure  0.54 · 54%  array · 50% 0:67,68↔1:200  bin · 25% 0:64,67,68,72↔1:206  call 0:61,75,76,77↔1:202,203,204,206  cond 0:72↔1:206  for-of 0:↔1:201  member · 75% 0:64,67,68,72↔1:203,204,206  new 0:67,68,76↔1:  object · 50% 0:75,76↔1:200  prop · 50% 0:75,76↔1:200  return 0:78↔1:208
    only local: new 3  only canonical: for-of 1
  AST  bin:= L 72 ↔ R 206 · 58%  member:v L 72 ↔ R 206  member:v L 72 ↔ R 206  return:return L 78 ↔ R 208  var:const L 61 ↔ R 200  cond:cond L 72 ↔ R 206
  Control flow  0.49  /const ×1, /bin ×1, bin/member ×1, bin/cond ×1, /return ×1
    local  1 /const · 2 const/call · 3 /bin · 4 bin/member · 5 /const → const/array · const>array/new · const>array>new/array · const>array>new>array/bin · const>array>new>array>bin/member · const>array>new>array>bin/array · /const · const/array · const>array/new · const>array>new/array · const>array>new>array/bin · const>array>new>array>bin/member · const>array>new>array>bin/array · /bin · bin/member · bin>cond/bin · bin/cond · bin>cond/member · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · /const · const/object · const>object/prop · const>object/prop · const>object>prop/call · const>object/prop · const>object>prop/call · const>object/prop · const>object>prop/new · /call · /return
    canonical  1 /const · 2 const/object · 3 const>object/prop · 4 const>object>prop/array · 5 const>object/prop → const>object>prop/array · /for-of · for-of/const · for-of>const/call · for-of>call/member · for-of/call · for-of>call/member · for-of>call/member · for-of/call · for-of>call/member · /bin · bin/member · bin>cond>call/member · bin>cond/call · bin/cond · /return
  **Fix** — Replace the local body with a call to `staticMapAnswer` from `css/resolve/expression.ts`.
- **declarationOf** — `declarationOf` looks like the canonical `declarationMark`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 27%  ·  Structure 91%  ·  AST 97%  ·  Control flow 74%
  Signature  params · 25%  #2 other≠date  #3 start only on the canonical side  #4 push only on the canonical side
    types · 0%  #1 FileContext≠CssHit  #2 Arch≠Candidate
    name words · 50% declaration
    name sites  param 0:46↔1:24  var-decl 0:47,48,49,50↔1:25,26,27,28,29,30
    return Declaration ≠ void
  Structure  0.5 · 50%  array · 50% 0:49↔1:25,26  bin · 75% 0:48,49,50↔1:25,26,27,28  call · 60% 0:47,50,52↔1:26,28,29,30,31  cond · 50% 0:49↔1:27,31  index 0:49↔1:  member · 75% 0:47,48,49,50↔1:25,26,27  object 0:52↔1:  prop 0:52↔1:  return 0:52↔1:  template 0:↔1:31
    only local: index 1, object 1, prop 1, return 1  only canonical: template 1
  AST  var:const L 48 ↔ R 25 · 86%  bin:?? L 48 ↔ R 25 · 80%  member:v L 48 ↔ R 25  member:v L 48 ↔ R 25  var:const L 47 ↔ R 28  var:const L 49 ↔ R 27  cond:cond L 49 ↔ R 27  var:const L 50 ↔ R 26
  Control flow  0.74  /const ×1, const/bin ×1, const>bin/member ×1, const>bin>member/member ×1, /const ×1, const/cond ×1, const>cond/bin ×1, /const ×1, const/call ×1
    local  1 /const · 2 const/call · 3 const>call/member · 4 /const · 5 const/bin · 6 const>bin/member · 7 const>bin>member/member · 8 /const · 9 const/cond → const>cond/bin · const>cond>bin/member · const>cond>bin>member/index · const>cond>bin>member>index/member · const>cond>bin>member>index>member/member · const>cond>bin/array · const>cond/array · /const · const/call · const>call/bin · const>call>bin/member · /return · return/object · return>object/prop · return>object/prop · return>object>prop/call
    canonical  1 /const · 2 const/bin · 3 const>bin/member · 4 const>bin>member/member · 5 const>bin/array · 6 /const · 7 const/call · 8 /const · 9 const/cond → const>cond/bin · const>cond>bin/bin · const>cond>bin>bin/bin · const>cond>bin>bin>bin/bin · const>cond>bin>bin>bin>bin/member · const>cond>bin>bin>bin>bin/member · /const · const/bin · const>bin/call · /const · const/call · /const · const/call · /call · call/template · call>template/cond · call>template>cond/template · call>template>cond>template/call
  **Fix** — Replace the local body with a call to `declarationMark` from `report/user-report/data/role-marks.ts`.
- **declarationOf** — `declarationOf` looks like the canonical `fileVars`, but not closely enough to call it a copy — 0.70 (70%).
  scores  Signature 25%  ·  Structure 90%  ·  AST 97%  ·  Control flow 79%
  Signature  params · 50%  #2 arch only on the local side
    types · 0%  #1 FileContext≠FileVarsCtx
    name sites  param 0:46↔1:13  prop 0:52↔1:23  var-decl 0:47,48,49,50↔1:17,18
    return Declaration ≠ FileVars
  Structure  0.53 · 53%  array 0:49↔1:  bin · 67% 0:48,49,50↔1:17,18  call · 33% 0:47,50,52↔1:23  cond 0:49↔1:  index 0:49↔1:  member · 75% 0:47,48,49,50↔1:17,18,23  object · 50% 0:52↔1:17,23  prop 0:52↔1:23  return 0:52↔1:23
    only local: array 1, cond 1, index 1
  AST  var:const L 48 ↔ R 17 · 86%  bin:?? L 48 ↔ R 17 · 80%  member:v L 48 ↔ R 17  member:v L 48 ↔ R 17  var:const L 47 ↔ R 18  return:return L 52 ↔ R 23  object:object L 52 ↔ R 23
  Control flow  0.79  /const ×1, const/bin ×1, const>bin/member ×1, const>bin>member/member ×1, /const ×1, /return ×1, return/object ×1, return>object/prop ×2, return>object>prop/call ×1
    local  1 /const · 2 const/call · 3 const>call/member · 4 /const · 5 const/bin · 6 const>bin/member · 7 const>bin>member/member · 8 /const · 9 const/cond · 10 const>cond/bin → const>cond>bin/member · const>cond>bin>member/index · const>cond>bin>member>index/member · const>cond>bin>member>index>member/member · const>cond>bin/array · const>cond/array · /const · const/call · const>call/bin · const>call>bin/member · /return · return/object · return>object/prop · return>object/prop · return>object>prop/call
    canonical  1 /const · 2 const/bin · 3 const>bin/member · 4 const>bin>member/member · 5 const>bin/object · 6 /const · 7 const/bin · 8 const>bin/bin · 9 const>bin>bin/member · 10 const>bin>bin/member → /return · return/object · return>object/prop · return>object/prop · return>object>prop/call · return>object/prop · return>object>prop/member
  **Fix** — Replace the local body with a call to `fileVars` from `invariants/name.ts`.
- **fileFinding** — `fileFinding` looks like the canonical `checkInvariant`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 58%  ·  Structure 98%  ·  AST 44%  ·  Control flow 68%
  ! The bodies do not look alike: AST 0.44 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 object≠other  #2 array≠other  #3 sink only on the canonical side
    types · 0%  #1 { ctx:FileContext; decl:Declaration; like:Lookalike[]; edges:Edge[]; }≠Invariant  #2 Finding[]≠FileContext
    name sites  param 0:192↔1:281  prop 0:195↔1:292
    return void ≡ void
  Structure  0.53 · 53%  array 0:194↔1:  bin 0:193,194,195↔1:286,287,291  call · 43% 0:193,194,195↔1:285,286,287,290,292,294,295  for-of 0:↔1:295  if · 50% 0:193,194↔1:285,286,287,291  member · 50% 0:193,194,195↔1:285,286,287,291,292,295  object · 50% 0:195↔1:287,292  prop 0:195↔1:292  return · 67% 0:193,194↔1:285,286,287  template 0:195↔1:292  unary · 33% 0:193↔1:285,287,291
    only local: array 1  only canonical: for-of 1
  AST  return:return L 193 ↔ R 285  return:return L 194 ↔ R 286  if:if L 193 ↔ R 285  unary:54 L 193 ↔ R 285  if:if L 194 ↔ R 286
  Control flow  0.68  /if ×1, if/unary ×1, if>unary>call/member ×1, if/return ×1, /if ×1, if/bin ×1, if>bin/call ×1, if/return ×1, /call ×1
    local  1 /if · 2 if/unary · 3 if>unary>call/member · 4 if>unary/call · 5 if/return · 6 /if · 7 if/bin · 8 if>bin/call · 9 if>bin/call → if>bin>call/bin · if>bin>call>bin/member · if>bin>call>bin>member/member · if>bin>call>bin>member>member/member · if>bin>call>bin/array · if/return · /call · call/call · call>call/object · call>call/bin · call>call>bin/member · call>call>bin>member/member · call>call>bin/member · call>call>bin>member/member · call>call/template · call>call>template/bin · call>call>template>bin/member · call>call>template>bin>member/member · call>call/object · call>call>object/prop · call>call>object>prop/member · call>call>object>prop>member/member · call>call>object/prop · call>call>object>prop/member · call>call>object>prop>member/member
    canonical  1 /if · 2 if/unary · 3 if>unary/call · 4 if>unary>call/member · 5 if>unary>call/member · 6 if>unary>call/member · 7 if>unary>call/member · 8 if/return · 9 /if → if/bin · if>bin/member · if>bin>member/member · if>bin/call · if>bin>call/member · if>bin>call/member · if>bin>call/member · if>bin>call/member · if/return · /if · if/bin · if>bin/bin · if>bin>bin/member · if>bin/unary · if>bin>unary/call · if>bin>unary>call/bin · if>bin>unary>call>bin/member · if>bin>unary>call>bin/object · if>bin>unary>call/member · if/return · /call · /if · if/bin · if>bin/unary · if>bin>unary/member · if>bin>unary>member/member · if>bin/member · if>call/member · if/call · if>call/call · if>call>call/object · if>call>call>object/prop · if>call>call>object/prop · if>call>call>object>prop/member · if>call>call/member · if>call>call/template · if>call>call>template/member · if>call>call/call · /call · /for-of · for-of/member · for-of/call
  **Fix** — Replace the local body with a call to `checkInvariant` from `invariants/index.ts`.
- **checkUnroled** — `checkUnroled` looks like the canonical `reportUndeclared`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 44%  ·  Structure 90%  ·  AST 73%  ·  Control flow 74%
  ! The bodies do not look alike: AST 0.73 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 date≠string  #2 run only on the local side
    types · 0%  #1 readonly Candidate[]≠[match:EntryMatch,out:Finding[],findingFrom:FindingFrom,arch:Arch,facts:FileFacts,repoFiles:string[]]
    name sites  param 0:217↔1:97  prop 0:225,226↔1:102,106  var-decl 0:218,219,223,224,225↔1:98,99,101,103,104,105
    return void ≡ void
  Structure  0.54 · 54%  bin · 50% 0:226↔1:102,106  call · 71% 0:219,223,224,225,226↔1:100,101,102,103,104,105,106  if · 50% 0:226↔1:100,102  member · 40% 0:223,226↔1:100,101,102,105,106  object 0:225,226↔1:102,106  prop 0:225,226↔1:102,106  return 0:↔1:100,102  template 0:↔1:106  unary 0:226↔1:
    only local: unary 1  only canonical: return 2, template 1
  AST  var-destr:var-destr L 218 ↔ R 99  var:const L 219 ↔ R 98 · 60%  var:const L 223 ↔ R 105  var:const L 224 ↔ R 103  var:const L 225 ↔ R 104  if:if L 226 ↔ R 102  bin:&& L 226 ↔ R 102
  Control flow  0.74  /var-destr ×1, /const ×1, const/call ×1, /const ×1, const/call ×1, /const ×1, const/call ×1, const>call/call ×1, /const ×1, const/call ×1
    local  1 /var-destr · 2 /const · 3 const/call · 4 /const · 5 const/call · 6 const>call/call · 7 const>call>call/member · 8 const>call/call · 9 /const · 10 const/call → const>call/call · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · /if · if/bin · if>bin/unary · if>bin>unary/member · if>bin/unary · if/call · if>call/object · if>call>object/prop · if>call>object/prop · if>call>object/prop · if>call>object/prop
    canonical  1 /const · 2 /var-destr · 3 /if · 4 if>call/member · 5 if/call · 6 if/return · 7 /const · 8 const>call/member · 9 const/call · 10 /if → if/bin · if>bin/bin · if>bin>bin/bin · if>bin>bin/bin · if>bin>bin>bin/member · if>bin/call · if>bin>call/member · if>bin>call/object · if>bin>call>object/prop · if>bin>call>object/prop · if/return · /const · const/call · /const · const/call · const>call/call · /const · const/call · const>call/member · /call · call/call · call>call/object · call>call>object/prop · call>call>object/prop · call>call>object>prop/bin · call>call>object>prop>bin/member · call>call/member · call>call/template · call>call>template/member · call>call/call
  **Fix** — Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`.
- **aliasShape** — `aliasShape` looks like the canonical `ownerRoleOf`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 50%  ·  Structure 96%  ·  AST 80%  ·  Control flow 47%
  Signature  params · 0%  #1 date≠other  #2 arch only on the canonical side
    types · 0%  #1 Candidate≠RelationGroup
    name sites  param 0:60↔1:48  var-decl 0:61,62↔1:50
    return string ≡ string
  Structure  0.53 · 53%  array 0:↔1:52  bin · 50% 0:62↔1:50,52  call · 67% 0:61,62↔1:49,50,52  cond 0:62,65↔1:  if 0:63↔1:49  index 0:62↔1:52  member · 33% 0:65↔1:49,50,52  return 0:63,65↔1:49,52  template 0:65↔1:  unary 0:63↔1:49
    only local: cond 2, template 1  only canonical: array 1
  AST  if:if L 63 ↔ R 49 · 71%  unary:54 L 63 ↔ R 49 · 50%  return:return L 63 ↔ R 49  var:const L 62 ↔ R 50  return:return L 65 ↔ R 52
  Control flow  0.47  /if ×1, if/unary ×1, if/return ×1, /return ×1
    local  1 /const · 2 const/call · 3 /const · 4 const>cond/bin → const>cond>bin/call · const>cond>bin/call · const>cond>bin>call/index · const/cond · const>cond/index · /if · if/unary · if/return · /return · return/template · return>template/member · return>template>cond/member · return>template/cond · return>template>cond/member · return>template/cond · return>template>cond/template · return>template>cond>template/member
    canonical  1 /if · 2 if/unary · 3 if>unary/call · 4 if>unary>call/member → if/return · /const · const/bin · const>bin/member · const>bin>member/call · const>bin>member>call/call · const>bin>member>call>call/bin · const>bin>member>call>call>bin/member · /return · return/bin · return>bin/index · return>bin>index>call/bin · return>bin>index>call>bin/member · return>bin>index>call>bin/array · return>bin>index/call
  **Fix** — Replace the local body with a call to `ownerRoleOf` from `nodes/finally/relations-group.ts`.
- **fileFinding** — `fileFinding` looks like the canonical `collectScalars`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 66%  ·  Structure 97%  ·  AST 45%  ·  Control flow 56%
  ! The bodies do not look alike: AST 0.45 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 object≠other  #2 array≠other  #3 depth only on the canonical side
    types · 0%  #1 { ctx:FileContext; decl:Declaration; like:Lookalike[]; edges:Edge[]; }≠FieldValue  #2 Finding[]≠ReportVars
    name sites  param 0:192↔1:79
    return void ≡ void
  Structure  0.47 · 47%  array 0:194↔1:  bin · 67% 0:193,194,195↔1:80,81  call · 67% 0:193,194,195↔1:81,82  for-of 0:↔1:82  if 0:193,194↔1:80,81  member 0:193,194,195↔1:  object 0:195↔1:  prop 0:195↔1:  return 0:193,194↔1:80,81  template 0:195↔1:  unary 0:193↔1:81
    only local: array 1, member 3, object 1, prop 1, template 1  only canonical: for-of 1
  AST  return:return L 193 ↔ R 80  return:return L 194 ↔ R 81  if:if L 193 ↔ R 80  if:if L 194 ↔ R 81  bin:|| L 194 ↔ R 81
  Control flow  0.56  /if ×1, if/return ×1, /if ×1, if/bin ×1, if>bin/call ×1, if/return ×1
    local  1 /if · 2 if/unary · 3 if>unary>call/member · 4 if>unary/call · 5 if/return · 6 /if → if/bin · if>bin/call · if>bin/call · if>bin>call/bin · if>bin>call>bin/member · if>bin>call>bin>member/member · if>bin>call>bin>member>member/member · if>bin>call>bin/array · if/return · /call · call/call · call>call/object · call>call/bin · call>call>bin/member · call>call>bin>member/member · call>call>bin/member · call>call>bin>member/member · call>call/template · call>call>template/bin · call>call>template>bin/member · call>call>template>bin>member/member · call>call/object · call>call>object/prop · call>call>object>prop/member · call>call>object>prop>member/member · call>call>object/prop · call>call>object>prop/member · call>call>object>prop>member/member
    canonical  1 /if · 2 if/bin · 3 if>bin/bin · 4 if>bin/bin · 5 if/return · 6 /if → if/bin · if>bin/unary · if>bin>unary/call · if>bin/call · if/return · /for-of · for-of/call · for-of/call
  **Fix** — Replace the local body with a call to `collectScalars` from `invariants/vars.ts`.
- **checkBuilt** — `checkBuilt` looks like the canonical `checkRoleKeys`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 44%  ·  Structure 97%  ·  AST 48%  ·  Control flow 86%
  ! The bodies do not look alike: AST 0.48 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 union≠other
    types · 0%  #1 Pick<Arch,"nodes"|"codeRoles"|"invariants">≠RawRole
    name words · 33% check
    name sites  param 0:41↔1:162  var-decl 0:42,44,45↔1:164
    return void ≡ void
  Structure  0.55 · 55%  bin 0:43↔1:163  call · 60% 0:42,43,44,45,46↔1:163,164,165  for-of 0:45↔1:164  if 0:43,46↔1:163,165  member · 50% 0:42,43,44,45↔1:163,165  new 0:43,44↔1:  object 0:↔1:163,165  prop 0:↔1:163,165  throw 0:43,46↔1:163,165  unary 0:46↔1:165
    only local: new 2  only canonical: object 2, prop 2
  AST  for-of:for-of L 45 ↔ R 164 · 55%  call:keys L 45 ↔ R 164 · 60%  unary:54 L 46 ↔ R 165  call:has L 46 ↔ R 165  if:if L 43 ↔ R 163  throw:throw L 43 ↔ R 163  if:if L 46 ↔ R 165  throw:throw L 46 ↔ R 165
  Control flow  0.86  /if ×1, if/bin ×1, if>bin/member ×1, if/throw ×1, if>throw/call ×1, /for-of ×1, for-of/call ×1, for-of/if ×1, for-of>if/unary ×1, for-of>if>unary/call ×1, for-of>if/throw ×1, for-of>if>throw/call ×1
    local  1 /const · 2 const>call/member · 3 const/call · 4 /if · 5 if/bin · 6 if>bin/member · 7 if>bin>member/new · 8 if>bin/member · 9 if/throw · 10 if>throw/call · 11 /const · 12 const/new → const>new/call · const>new>call/member · /for-of · for-of/call · for-of>call/member · for-of>call>member/member · for-of/if · for-of>if/unary · for-of>if>unary/call · for-of>if/throw · for-of>if>throw/call
    canonical  1 /if · 2 if/bin · 3 if>bin/member · 4 if/throw · 5 if>throw/call · 6 if>throw>call/object · 7 if>throw>call>object/prop · 8 if>throw>call>object>prop/member · 9 /for-of · 10 for-of/call · 11 for-of/if · 12 for-of>if/unary → for-of>if>unary/call · for-of>if/throw · for-of>if>throw/call · for-of>if>throw>call/object · for-of>if>throw>call>object/prop · for-of>if>throw>call>object>prop/member · for-of>if>throw>call>object/prop · for-of>if>throw>call>object/prop · for-of>if>throw>call>object>prop/member
  **Fix** — Replace the local body with a call to `checkRoleKeys` from `code-roles/roles.ts`.
- **recordFindings#anon@123** — `recordFindings#anon@123` looks like the canonical `onPointerUp`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 54%  ·  Structure 53%  ·  AST 84%  ·  Control flow 100%
  Signature  params
    return void ≡ void
  Structure  1  bin 0:124↔1:94  call 0:125↔1:95  member 0:124↔1:94
  AST  bin:= L 124 ↔ R 94  member:v L 124 ↔ R 94
  Control flow  1  /bin ×1, bin/member ×1, /call ×1
    local  1 /bin · 2 bin/member · 3 /call
    canonical  1 /bin · 2 bin/member · 3 /call
  **Fix** — Replace the local body with a call to `onPointerUp` from `report/user-report/src/components/access-graph/useZoomPan.ts`.
- **skipped** — `skipped` looks like the canonical `matchesRole`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 44%  ·  Structure 100%  ·  AST 69%  ·  Control flow 60%
  ! The bodies do not look alike: AST 0.69 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 50%  #2 opts only on the local side
    types · 0%  #1 string≠[entry:WhereEntry,rel:string,arch:Arch,facts:FileFacts,targetCaps:Caps]
    name sites  param 0:32↔1:74  var-decl 0:33↔1:75,78
    return boolean ≡ boolean
  Structure  0.65 · 65%  array · 50% 0:33,35↔1:76  bin · 50% 0:33,34,35,37↔1:76,79  call 0:34,35,37↔1:76,78,79  cond 0:↔1:79  if 0:34,35↔1:76,77  member 0:33,35,37↔1:76,77,79  new 0:33↔1:  object 0:↔1:79  return 0:34,35,37↔1:76,77,79  template 0:34↔1:  unary · 50% 0:37↔1:76,77
    only local: new 1, template 1  only canonical: cond 1, object 1
  AST  return:return L 34 ↔ R 77  return:return L 35 ↔ R 76  var:const L 33 ↔ R 75  if:if L 34 ↔ R 77  if:if L 35 ↔ R 76  return:return L 37 ↔ R 79
  Control flow  0.6  /const ×1, /if ×1, if/return ×1, /if ×1, if/return ×1, /return ×1
    local  1 /const · 2 const/array · 3 const>array/new · 4 const>array>new/array · 5 const>array>new>array/bin · 6 const>array>new>array>bin/member → const>array>new>array>bin/array · /if · if/call · if/return · /if · if>call/bin · if>call>bin/member · if>call>bin/array · if/call · if/return · /return · return/bin · return>bin/call · return>bin>call/member · return>bin>call>member/member · return>bin/unary · return>bin>unary>call/member · return>bin>unary/call
    canonical  1 /const · 2 /if · 3 if/unary · 4 if>unary>call/bin · 5 if>unary>call>bin/member · 6 if>unary>call>bin/array → if>unary/call · if>unary>call/bin · if>unary>call>bin/member · if/return · /if · if/unary · if>unary/member · if/return · /const · const/call · /return · return/call · return>call/cond · return>call>cond/bin · return>call>cond>bin/member · return>call>cond>bin>member/call · return>call>cond>bin>member>call/member · return>call>cond>bin/object · return>call>cond/object
  **Fix** — Replace the local body with a call to `matchesRole` from `entities/location/where.ts`.
- **filterNamesCodeRole** — `filterNamesCodeRole` looks like the canonical `namesResolution`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 69%  ·  Structure 93%  ·  AST 17%  ·  Control flow 83%
  ! The bodies do not look alike: AST 0.17 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params
    types
    name words · 25% names
    name sites  callback-param 0:36↔1:229  param 0:31↔1:225
    return boolean ≡ boolean
  Structure  0.64 · 64%  bin · 33% 0:32,34,36↔1:229  call 0:32,33,36↔1:226,227,229  if · 67% 0:32,33,34↔1:226,227  return · 75% 0:32,33,34,36↔1:226,227,229  unary 0:↔1:227
    only canonical: unary 1
  AST  if:if L 33 ↔ R 226 · 63%  return:return L 33 ↔ R 226  call:some L 33 ↔ R 226  return:return L 34 ↔ R 227  bin:=== L 36 ↔ R 229 · 67%  if:if L 34 ↔ R 227  return:return L 36 ↔ R 229  call:some L 36 ↔ R 229  func:<fn> L 36 ↔ R 229  bin:|| L 36 ↔ R 229
  Control flow  0.83  /if ×1, if/call ×1, if/return ×1, if>return/call ×1, /if ×1, if/return ×1, /return ×1, return>call/call ×1, return/call ×1
    local  1 /if · 2 if/bin · 3 if/return · 4 if>return/call · 5 /if · 6 if/call · 7 if/return · 8 if>return/call · 9 /if → if/bin · if>bin/bin · if>bin/bin · if/return · /return · return>call/call · return/call
    canonical  1 /if · 2 if/call · 3 if/return · 4 if>return/call · 5 /if · 6 if/unary · 7 if>unary/call · 8 if/return · 9 /return → return>call/call · return/call
  **Fix** — Replace the local body with a call to `namesResolution` from `invariants/index.ts`.
- **archOf** — `archOf` looks like the canonical `archOf`, but not closely enough to call it a copy — 0.69 (69%).
  scores  Signature 57%  ·  Structure 89%  ·  AST 83%  ·  Control flow 42%
  Signature  params · 0%  #1 string≠other  #2 opts only on the local side
    types · 0%  #1 string≠QueryScope
    name words arch,of
    name sites  param 0:48↔1:40  var-decl 0:49↔1:42
    return Arch ≡ Arch
  Structure  0.54 · 54%  bin 0:50,51↔1:  call · 67% 0:50,51,53↔1:41,43  cond 0:50↔1:43  if · 50% 0:50,51↔1:41  member 0:49↔1:42  return · 67% 0:50,51,53↔1:41,43  unary 0:↔1:41
    only local: bin 2  only canonical: unary 1
  AST  var:const L 49 ↔ R 42  member:v L 49 ↔ R 42  if:if L 51 ↔ R 41  return:return L 51 ↔ R 41  return:return L 53 ↔ R 43
  Control flow  0.42  /const ×1, const/member ×1, /return ×1
    local  1 /const · 2 const/member · 3 /if → if/bin · if/return · if>return/call · if>return>call>cond/call · if>return>call/cond · if>return>call>cond/call · /if · if/bin · if/return · if>return/call · /return · return/call
    canonical  1 /if · 2 if/unary · 3 if>unary/call → if/return · /const · const/member · /return · return>cond/call · return/cond
  **Fix** — Replace the local body with a call to `archOf` from `entities/location.ts`.
- **onlyValuePieces** — `onlyValuePieces` looks like the canonical `allMatch`, but not closely enough to call it a copy — 0.68 (68%).
  scores  Signature 44%  ·  Structure 53%  ·  AST 96%  ·  Control flow 100%
  Signature  params · 0%  #1 date≠string  #2 re only on the canonical side
    types · 0%  #1 readonly Candidate[]≠string[]
    name sites  param 0:190↔1:89
    return boolean ≡ boolean
  Structure  1  bin 0:190↔1:89  call 0:190↔1:89  member 0:190↔1:89
  AST  bin:&& L 190 ↔ R 89 · 73%  bin:> L 190 ↔ R 89  member:v L 190 ↔ R 89  call:every L 190 ↔ R 89 · 50%
  Control flow  1  /bin ×1, bin/bin ×1, bin>bin/member ×1, bin/call ×1
    local  1 /bin · 2 bin/bin · 3 bin>bin/member · 4 bin/call
    canonical  1 /bin · 2 bin/bin · 3 bin>bin/member · 4 bin/call
  **Fix** — Replace the local body with a call to `allMatch` from `utils/pattern.ts`.
- **archOf** — `archOf` looks like the canonical `reportOf`, but not closely enough to call it a copy — 0.68 (68%).
  scores  Signature 27%  ·  Structure 96%  ·  AST 95%  ·  Control flow 62%
  Signature  params · 0%  #1 string≠other  #2 opts only on the local side
    types · 0%  #1 string≠FieldValue
    name words · 50% of
    name sites  param 0:48↔1:143  var-decl 0:49↔1:144,147,148,149,153
    return Arch ≠ ReportValue
  Structure  0.44 · 44%  bin · 50% 0:50,51↔1:145,150,152,154  call · 60% 0:50,51,53↔1:144,146,149,152,154  cond 0:50↔1:  for-of 0:↔1:148  if · 40% 0:50,51↔1:145,146,150,152,154  index 0:↔1:150  member · 33% 0:49↔1:152,153,154  object 0:↔1:147  return 0:50,51,53↔1:145,146,156  unary 0:↔1:146
    only local: cond 1  only canonical: for-of 1, index 1, object 1, unary 1
  AST  var:const L 49 ↔ R 153  member:v L 49 ↔ R 153  bin:=== L 50 ↔ R 145  return:return L 53 ↔ R 156 · 67%  if:if L 50 ↔ R 145  return:return L 50 ↔ R 145  if:if L 51 ↔ R 154
  Control flow  0.62  /const ×1, /if ×1, if/bin ×1, if/return ×1, /if ×1, if/bin ×1, /return ×1
    local  1 /const · 2 const/member · 3 /if · 4 if/bin · 5 if/return · 6 if>return/call · 7 if>return>call>cond/call → if>return>call/cond · if>return>call>cond/call · /if · if/bin · if/return · if>return/call · /return · return/call
    canonical  1 /const · 2 const/call · 3 /if · 4 if/bin · 5 if/return · 6 /if · 7 if/unary → if>unary/call · if/return · /const · const/object · /for-of · for-of/const · for-of>const/call · for-of/if · for-of>if/bin · for-of>if/bin · for-of>if>bin/index · /if · if/call · if>call/member · if/bin · if>bin/member · if>bin>call/member · if>bin/call · /const · const/member · /if · if/bin · if>bin/bin · if>bin/call · if/bin · if>bin/member · /return
  **Fix** — Replace the local body with a call to `reportOf` from `invariants/index.ts`.
- **ownChildOf#anon@31** — `ownChildOf#anon@31` looks like the canonical `findChild#anon@34`, but not closely enough to call it a copy — 0.68 (68%).
  scores  Signature 62%  ·  Structure 76%  ·  AST 76%  ·  Control flow 58%
  Signature  params
    types
    name words · 40% child,anon
    name sites  param 0:31↔1:34
    return boolean ≡ boolean
  Structure  1  bin 0:31↔1:34  call 0:31↔1:34  member 0:31↔1:34  unary 0:31↔1:34
  AST  call:test L 31 ↔ R 34 · 80%  member:v L 31 ↔ R 34  bin:&& L 31 ↔ R 34
  Control flow  0.58  /bin ×1, bin>call/member ×1, bin/call ×1
    local  1 /bin · 2 bin/unary · 3 bin>unary/member → bin>call/member · bin/call
    canonical  1 /bin · 2 bin/bin · 3 bin>bin/member → bin>bin/unary · bin>call/member · bin/call · bin>call/call
  **Fix** — Replace the local body with a call to `findChild#anon@34` from `entities/tree/entries.ts`.
- **declarationShape** — `declarationShape` looks like the canonical `accessorSignature`, but not closely enough to call it a copy — 0.68 (68%).
  scores  Signature 44%  ·  Structure 96%  ·  AST 67%  ·  Control flow 63%
  ! The bodies do not look alike: AST 0.67 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 date≠string
    types · 0%  #1 Candidate≠ScopeAccessor&{ kind?:string; }
    name sites  param 0:75↔1:40  var-decl 0:76,80↔1:41,43
    return string ≡ string
  Structure  0.58 · 58%  array 0:76↔1:41  bin · 67% 0:76,80,81↔1:41,44  call 0:81↔1:43  cond 0:↔1:44  if · 50% 0:77,81↔1:42  index 0:76↔1:  member · 75% 0:76,77,80,81↔1:41,42,44  return · 67% 0:77,81,83↔1:42,44  template · 50% 0:77,81↔1:44  unary 0:↔1:42
    only local: index 1  only canonical: cond 1, unary 1
  AST  var:const L 76 ↔ R 41 · 75%  bin:?? L 76 ↔ R 41  member:v L 76 ↔ R 41  array:array L 76 ↔ R 41  var:const L 80 ↔ R 43  if:if L 81 ↔ R 42  return:return L 81 ↔ R 42  return:return L 83 ↔ R 44
  Control flow  0.63  /const ×1, const/bin ×1, const>bin/member ×1, /if ×1, if/return ×1, /return ×1
    local  1 /const · 2 const/index · 3 const>index/bin · 4 const>index>bin/member · 5 const>index>bin/array · 6 /if → if/return · if>return/template · if>return>template/member · /const · const/bin · const>bin/member · /if · if/bin · if>bin/bin · if>bin>bin/member · if/return · if>return/template · if>return>template/call · /return
    canonical  1 /const · 2 const/bin · 3 const>bin/member · 4 const>bin/array · 5 /if · 6 if/unary → if>unary/member · if/return · /const · const/call · /return · return>cond/bin · return>cond>bin/member · return/cond · return>cond/template
  **Fix** — Replace the local body with a call to `accessorSignature` from `report/user-report/src/utils/format.ts`.
- **whyUnroled** — `whyUnroled` looks like the canonical `choose`, but not closely enough to call it a copy — 0.68 (68%).
  scores  Signature 44%  ·  Structure 75%  ·  AST 87%  ·  Control flow 74%
  Signature  params · 25%  #2 decl only on the local side  #3 piece only on the local side  #4 offered only on the local side
    types · 0%  #1 FileContext≠StructureFacts
    name sites  param 0:98↔1:74
    return string ≡ string
  Structure  0.35 · 35%  call 0:99,101↔1:  cond 0:100↔1:  if · 40% 0:101,102↔1:75,76,77,78,79  member · 60% 0:101,102,104↔1:75,76,77,78,79  return · 50% 0:101,102,104↔1:75,76,77,78,79,80  template 0:100,101,102,104↔1:
    only local: call 2, cond 1, template 4
  AST  member:v L 101 ↔ R 79  member:v L 101 ↔ R 79  member:v L 102 ↔ R 75  if:if L 101 ↔ R 79  return:return L 101 ↔ R 79  if:if L 102 ↔ R 75  return:return L 102 ↔ R 75  return:return L 104 ↔ R 80
  Control flow  0.74  /if ×1, if/member ×1, if>member/member ×1, if/return ×1, /if ×1, if/member ×1, if/return ×1, /return ×1
    local  1 /const · 2 const/call · 3 /const · 4 const/cond · 5 const>cond/template · 6 /if · 7 if/member · 8 if>member/member → if/return · if>return/template · if>return>template/call · if>return>template>call/member · /if · if/member · if/return · if>return/template · if>return>template/member · /return · return/template · return>template/member
    canonical  1 /if · 2 if/member · 3 if/return · 4 /if · 5 if/member · 6 if/return · 7 /if · 8 if/member → if/return · /if · if/member · if>member/member · if/return · /if · if/member · if>member/member · if/return · /return
  **Fix** — Replace the local body with a call to `choose` from `report/errorTypes/codes/structure.ts`.
- **installExitHook** — `installExitHook` looks like the canonical `useExpanded#anon@55`, but not closely enough to call it a copy — 0.68 (68%).
  scores  Signature 59%  ·  Structure 86%  ·  AST 58%  ·  Control flow 64%
  ! The bodies do not look alike: AST 0.58 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params
    name sites  var-decl 0:90↔1:57,59
    return void ≡ void
  Structure  0.4 · 40%  array 0:↔1:60  bin 0:85,90↔1:  call 0:89,90,91↔1:57,58,59  cond 0:↔1:60  for-of 0:90↔1:  if 0:84↔1:56  member 0:90↔1:60  new 0:↔1:60  return · 50% 0:84↔1:56,60  unary 0:↔1:56,59
    only local: bin 2, for-of 1  only canonical: array 1, cond 1, new 1, unary 2
  AST  if:if L 84 ↔ R 56 · 75%  return:return L 84 ↔ R 56
  Control flow  0.64  /if ×1, if/return ×1, /call ×1
    local  1 /if · 2 if/return · 3 /bin → /call
    canonical  1 /if · 2 if/unary · 3 if/return → /const · const/call · /call
  **Fix** — Replace the local body with a call to `useExpanded#anon@55` from `report/user-report/src/screens/TreeScreen.tsx`.
- **findRepoRoot** — `findRepoRoot` looks like the canonical `inferToYaml`, but not closely enough to call it a copy — 0.67 (67%).
  scores  Signature 44%  ·  Structure 95%  ·  AST 89%  ·  Control flow 40%
  Signature  params · 0%  #1 string≠other  #2 configName only on the local side
    types · 0%  #1 string≠FieldValue
    name sites  param 0:28↔1:44  var-decl 0:29,30,32,35↔1:46
    return string ≡ string
  Structure  0.57 · 57%  array 0:29↔1:46  bin · 50% 0:36,37↔1:45  call · 67% 0:33,35,36↔1:46,47  cond 0:29↔1:46  for 0:31↔1:  for-of 0:32↔1:  if · 50% 0:33,36↔1:45  return 0:33,36↔1:45,47  template 0:↔1:47
    only local: for 1, for-of 1  only canonical: template 1
  AST  var:const L 29 ↔ R 46 · 78%  cond:cond L 29 ↔ R 46 · 71%  array:array L 29 ↔ R 46 · 50%
  Control flow  0.4  /const ×1, const/cond ×1, const>cond/array ×1
    local  1 /const · 2 const/cond · 3 const>cond/array → /let · /for · for/for-of · for>for-of/if · for>for-of>if/call · for>for-of>if>call/call · for>for-of>if/return · for/const · for>const/call · for/if · for>if/bin · for>if/return · for>if>return/call · for/bin
    canonical  1 /if · 2 if/bin · 3 if/return → /const · const>cond/call · const/cond · const>cond/array · /return · return/template · return>template/call
  **Fix** — Replace the local body with a call to `inferToYaml` from `report/user-report/src/generate/infer.ts`.
- **filterNamesCodeRole** — `filterNamesCodeRole` looks like the canonical `reportOf`, but not closely enough to call it a copy — 0.67 (67%).
  scores  Signature 18%  ·  Structure 97%  ·  AST 93%  ·  Control flow 72%
  ! The two return different kinds of value, so they are inverse operations rather than copies.
  Signature  params
    types
    name sites  param 0:31↔1:143
    return boolean ≠ ReportValue
  Structure  0.48 · 48%  bin · 75% 0:32,34,36↔1:145,150,152,154  call · 60% 0:32,33,36↔1:144,146,149,152,154  for-of 0:↔1:148  if · 60% 0:32,33,34↔1:145,146,150,152,154  index 0:↔1:150  member 0:↔1:152,153,154  object 0:↔1:147  return · 75% 0:32,33,34,36↔1:145,146,156  unary 0:↔1:146
    only canonical: for-of 1, index 1, member 3, object 1, unary 1
  AST  if:if L 32 ↔ R 145 · 75%  bin:=== L 32 ↔ R 145  return:return L 32 ↔ R 145 · 50%  return:return L 34 ↔ R 146  if:if L 33 ↔ R 152  if:if L 34 ↔ R 146  return:return L 36 ↔ R 156
  Control flow  0.72  /if ×1, if/bin ×1, if/return ×1, /if ×1, if/call ×1, /if ×1, if/bin ×1, if>bin/bin ×1, /return ×1
    local  1 /if · 2 if/bin · 3 if/return · 4 if>return/call · 5 /if · 6 if/call · 7 if/return · 8 if>return/call · 9 /if → if/bin · if>bin/bin · if>bin/bin · if/return · /return · return>call/call · return/call
    canonical  1 /const · 2 const/call · 3 /if · 4 if/bin · 5 if/return · 6 /if · 7 if/unary · 8 if>unary/call · 9 if/return → /const · const/object · /for-of · for-of/const · for-of>const/call · for-of/if · for-of>if/bin · for-of>if/bin · for-of>if>bin/index · /if · if/call · if>call/member · if/bin · if>bin/member · if>bin>call/member · if>bin/call · /const · const/member · /if · if/bin · if>bin/bin · if>bin/call · if/bin · if>bin/member · /return
  **Fix** — Replace the local body with a call to `reportOf` from `invariants/index.ts`.
- **skipped#anon@34** — `skipped#anon@34` looks like the canonical `applyClaimsToSharers#anon@192`, but not closely enough to call it a copy — 0.67 (67%).
  scores  Signature 44%  ·  Structure 72%  ·  AST 97%  ·  Control flow 67%
  Signature  params · 0%  #1 string≠other
    types · 0%  #1 string≠ArchVariant
    name words · 17% anon
    name sites  param 0:34↔1:192
    return boolean ≡ boolean
  Structure  0.75 · 75%  bin 0:34↔1:192  call 0:34↔1:192  member 0:↔1:192  template 0:34↔1:192
    only canonical: member 1
  AST  bin:|| L 34 ↔ R 192 · 71%  bin:=== L 34 ↔ R 192 · 60%  call:startsWith L 34 ↔ R 192 · 75%  template:template L 34 ↔ R 192 · 80%
  Control flow  0.67  /bin ×1, bin/bin ×1, bin/call ×1, bin>call/template ×1
    local  1 /bin · 2 bin/bin · 3 bin/call · 4 bin>call/template
    canonical  1 /bin · 2 bin/bin · 3 bin>bin/member · 4 bin>bin/member → bin>call/member · bin/call · bin>call/template · bin>call>template/member
  **Fix** — Replace the local body with a call to `applyClaimsToSharers#anon@192` from `entities/tree/build.ts`.
- **recordFindings** — `recordFindings` looks like the canonical `walkEntry`, but not closely enough to call it a copy — 0.67 (67%).
  scores  Signature 44%  ·  Structure 97%  ·  AST 69%  ·  Control flow 55%
  ! The bodies do not look alike: AST 0.69 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 other≠string  #2 string≠other  #3 array≠other
    types · 0%  #1 ReportBucket≠string  #2 string≠FieldValue  #3 readonly Finding[]≠Walk
    name sites  param 0:117↔1:50  var-decl 0:118,119↔1:64
    return void ≡ void
  Structure  0.44 · 44%  array 0:↔1:57,61,69  bin · 50% 0:121,123,124,128↔1:52,66  call · 67% 0:119,120,122,123,125,128↔1:51,53,56,57,60,61,64,66,69  for-of 0:119↔1:  if · 40% 0:122,128↔1:51,52,56,60,65  member 0:120,121,122,123,124,128↔1:51,53,57,61,66,69  new 0:118↔1:  object 0:↔1:66  prop 0:↔1:66  return 0:↔1:51,54,58,62,67
    only local: for-of 1, new 1  only canonical: array 3, object 1, prop 1, return 5
  AST  var:const L 118 ↔ R 64 · 50%  if:if L 122 ↔ R 51 · 50%  member:v L 122 ↔ R 51  if:if L 128 ↔ R 65
  Control flow  0.55  /if ×1, if/call ×1, if>call/member ×1, /if ×1, if>call/member ×1, if/call ×1
    local  1 /const · 2 const/new · 3 /for-of · 4 for-of/call · 5 for-of>call/call · 6 call/member → /call · /bin · bin/member · /if · if/member · if/call · if>call/member · /bin · bin/member · bin/call · /if · if/bin · if>call/member · if/call
    canonical  1 /if · 2 if>call/member · 3 if/call · 4 if/return · 5 /if · 6 if/bin → if/call · if>call/member · if/return · /if · if/call · if/call · if>call/array · if>call>array/member · if/return · /if · if/call · if/call · if>call/array · if>call>array/member · if/return · /const · const/call · /if · if>call/member · if/call · if>call/object · if>call>object/prop · if>call>object>prop/bin · if>call>object>prop>bin>call/member · if>call>object>prop>bin/call · if>call>object/prop · if>call>object/prop · if>call>object>prop/call · if>call>object>prop>call/member · if/return · /call · call/array · call>array/member
  **Fix** — Replace the local body with a call to `walkEntry` from `report/user-report/shared/describe.ts`.
- **whyOf** — `whyOf` looks like the canonical `reportMessage`, but not closely enough to call it a copy — 0.67 (67%).
  scores  Signature 44%  ·  Structure 92%  ·  AST 87%  ·  Control flow 45%
  Signature  params · 0%  #1 string≠union  #2 names only on the local side  #3 place only on the local side  #4 arch only on the local side
    types · 0%  #1 string≠string|number|boolean|readonly FieldValue[]|{ readonly [key:string]:FieldValue; }|ReportObject
    name sites  param 0:49↔1:23  var-decl 0:50,51,55↔1:26,27
    return string ≡ string
  Structure  0.5 · 50%  bin · 67% 0:51,55,57↔1:24,28  call 0:55↔1:25  cond · 33% 0:51,55,57↔1:28  if · 50% 0:52↔1:24,25  index 0:50↔1:  member · 50% 0:50,51,55,57↔1:26,27  return · 67% 0:52,57↔1:24,25,28  template 0:55,57↔1:  unary 0:55↔1:25
    only local: index 1, template 2
  AST  var:const L 50 ↔ R 26 · 57%  if:if L 52 ↔ R 24 · 50%  return:return L 52 ↔ R 24  member:v L 55 ↔ R 27  member:v L 50 ↔ R 26  var:const L 55 ↔ R 27  return:return L 57 ↔ R 28
  Control flow  0.45  /const ×1, const/member ×1, /const ×1, /return ×1
    local  1 /const · 2 const/member · 3 const>member/index · 4 const>member>index/member → /const · const>cond/bin · const>cond>bin/bin · const>cond>bin/bin · const/cond · const>cond/member · /if · if/return · /const · const>cond/bin · const>cond>bin/unary · const>cond>bin/member · const/cond · const>cond/template · const>cond>template/call · const>cond>template>call/member · /return · return/template · return>template>cond/bin · return>template>cond>bin/member · return>template/cond
    canonical  1 /if · 2 if/bin · 3 if/return · 4 /if → if/unary · if>unary/call · if/return · /const · const/member · /const · const/member · /return · return/bin · return>bin/bin · return>bin>bin>cond/bin · return>bin>bin/cond · return>bin>bin>cond/bin · return>bin>bin/cond
  **Fix** — Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`.
- **collectFacts** — `collectFacts` looks like the canonical `classifyFile`, but not closely enough to call it a copy — 0.67 (67%).
  scores  Signature 25%  ·  Structure 100%  ·  AST 50%  ·  Control flow 96%
  ! The bodies do not look alike: AST 0.50 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 string≠other  #2 run only on the canonical side
    types · 0%  #1 [abs:string,arch:Arch,project:Project,repoFiles:string[],dedupe:SeenStore]≠SourceFile
    name sites  param,type-prop 0:91↔1:86  prop 0:95,100,101,104↔1:92,93,94  var-decl 0:92,93,94,95,96,100,101,102↔1:87,88,89,90,91,94
    return { ctx:FileContext; candidates:Candidate[]; fileFacts:FileFacts; } ≠ Candidate[]
  Structure  0.81 · 81%  array 0:101↔1:94  bin · 75% 0:96,100,101,102↔1:87,90,94  call · 75% 0:93,94,95,96,100,101↔1:88,89,90,91,92,93,94,96  for-of 0:102↔1:  member 0:96,100,101,102↔1:87,90,94,96  object 0:95,100,101,104↔1:90,92,93,94  prop · 75% 0:95,100,101,104↔1:92,93,94  return 0:104↔1:96
    only local: for-of 1
  AST  var:const L 92 ↔ R 89 · 75%  var:const L 96 ↔ R 90 · 83%  call:importNameModules L 96 ↔ R 90 · 80%  bin:?? L 96 ↔ R 90 · 60%  member:v L 96 ↔ R 90 · 67%  member:v L 96 ↔ R 90  var:const L 101 ↔ R 94 · 68%  call:collectFileFacts L 101 ↔ R 94 · 65%  object:object L 101 ↔ R 94 · 60%  prop:aliases L 101 ↔ R 94 · 50%  member:v L 101 ↔ R 94  prop:candidates L 101 ↔ R 94  array:array L 101 ↔ R 94  var:const L 93 ↔ R 88  var:const L 94 ↔ R 91  var:const L 95 ↔ R 87  prop:rel L 101 ↔ R 94  prop:repoFiles L 101 ↔ R 94  prop:repoRoot L 101 ↔ R 94  return:return L 104 ↔ R 96
  Control flow  0.96  /const ×2, const/call ×1, /const ×1, const/call ×1, /const ×1, const/call ×1, const>call/bin ×1, const>call>bin/member ×1, const>call/member ×1, /const ×1, const/call ×1, /const ×1, const/call ×1, const>call/object ×1, const>call>object/prop ×2, const>call>object>prop/member ×1, const>call>object/prop ×1, const>call>object>prop/bin ×1, const>call>object>prop>bin/member ×1, const>call>object/prop ×1, const>call>object>prop/array ×1, /return ×1
    local  1 /const · 2 /const · 3 const/call · 4 /const · 5 const/call · 6 /const · 7 const/call · 8 const>call/object · 9 const>call>object/prop · 10 const>call>object/prop · 11 const>call>object/prop · 12 /const · 13 const/call · 14 const>call/bin · 15 const>call>bin/member · 16 const>call/member · 17 /const · 18 const/call · 19 const>call/call · 20 const>call>call/member · 21 const>call>call/bin · 22 const>call>call>bin/member · 23 const>call/object · 24 const>call>object/prop → const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · const>call>object/prop · /const · const/call · const>call/object · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/bin · const>call>object>prop>bin/member · const>call>object/prop · const>call>object>prop/array · /for-of · for-of/bin · for-of>bin/member · /return · return/object · return>object/prop · return>object/prop · return>object/prop
    canonical  1 /const · 2 const/bin · 3 const>bin/member · 4 const>bin>member/member · 5 /const · 6 const/call · 7 const>call/call · 8 /const · 9 const/call · 10 /const · 11 const/call · 12 const>call/bin · 13 const>call>bin/member · 14 const>call>bin>member/member · 15 const>call>bin/object · 16 const>call/member · 17 /const · 18 const/call · 19 /call · 20 call/object · 21 call>object/prop · 22 call>object/prop · 23 call>object/prop · 24 call>object/prop → call>object/prop · /call · call/object · call>object/prop · /const · const/call · const>call/object · const>call>object/prop · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/bin · const>call>object>prop>bin/member · const>call>object>prop>bin>member/member · const>call>object>prop>bin/object · const>call>object/prop · const>call>object/prop · const>call>object>prop/array · /return · return/member · return>member/call · return>member>call/member · return>member>call>member/member · return>member>call/member
  **Fix** — Replace the local body with a call to `classifyFile` from `code-roles/project.ts`.
- **misfitsOf** — `misfitsOf` looks like the canonical `byName`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 42%  ·  Structure 89%  ·  AST 83%  ·  Control flow 54%
  Signature  params · 33%  #2 arch only on the local side  #3 rel only on the local side
    types · 33%
    name sites  param 0:35↔1:62  var-decl 0:36,37,38↔1:63,64
    return Map<string,Misfit[]> ≠ Map<string,Candidate>
  Structure  0.4 · 40%  array 0:40↔1:  bin 0:39,40↔1:  call · 50% 0:38,40↔1:64  for-of 0:37↔1:64  if 0:39↔1:64  index 0:40↔1:  member · 50% 0:39,40↔1:64  new 0:36↔1:63  object 0:40↔1:  prop 0:40↔1:  return 0:43↔1:66  unary 0:39↔1:
    only local: array 1, bin 2, index 1, object 1, prop 1, unary 1
  AST  var:const L 36 ↔ R 63  new:Map L 36 ↔ R 63  return:return L 43 ↔ R 66  for-of:for-of L 37 ↔ R 64
  Control flow  0.54  /const ×1, const/new ×1, /for-of ×1, for-of/if ×1, /return ×1
    local  1 /const · 2 const/new · 3 /for-of · 4 for-of/const · 5 for-of>const/call → for-of/if · for-of>if/bin · for-of>if>bin/unary · for-of>if>bin/unary · for-of>if>bin>unary/member · for-of/call · for-of>call/array · for-of>call>array/bin · for-of>call>array>bin/call · for-of>call>array>bin/array · for-of>call>array/object · for-of>call>array>object/prop · for-of>call>array>object>prop/member · for-of>call>array>object/prop · for-of>call>array>object>prop/bin · for-of>call>array>object>prop>bin/index · for-of>call>array>object>prop>bin>index/member · /return
    canonical  1 /const · 2 const/new · 3 /for-of · 4 for-of/if · 5 for-of>if/member → for-of>if/call · for-of>if>call/member · /return
  **Fix** — Replace the local body with a call to `byName` from `code-roles/connector.ts`.
- **loadArchitecture** — `loadArchitecture` looks like the canonical `scopeFromProject`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 25%  ·  Structure 91%  ·  AST 86%  ·  Control flow 72%
  Signature  params · 0%  #1 union≠other
    types · 0%  #1 string|RawArch|RuleOptions≠SourceFile
    name sites  param 0:131↔1:167  var-decl 0:134,138↔1:168,169,170,173
    return Arch ≠ Scope
  Structure  0.59 · 59%  bin · 33% 0:132,133,134↔1:171  call · 80% 0:132,136,138,140↔1:168,169,170,173,174  if · 50% 0:132,133↔1:171  member · 50% 0:132↔1:171,174  object 0:134↔1:174  prop 0:↔1:174  return · 67% 0:132,136,140↔1:171,176
    only canonical: prop 1
  AST  if:if L 132 ↔ R 171 · 64%  return:return L 132 ↔ R 171 · 75%  member:v L 132 ↔ R 171  bin:&& L 132 ↔ R 171  bin:=== L 132 ↔ R 171  var:const L 138 ↔ R 170  return:return L 140 ↔ R 176
  Control flow  0.72  /if ×1, if/bin ×1, if>bin/bin ×1, if/return ×1, /const ×1, const/call ×1, const>call/call ×1, /return ×1
    local  1 /if · 2 if/bin · 3 if>bin/call · 4 if>bin/bin · 5 if/return · 6 if>return/call · 7 if>return>call/member · 8 /if → if/bin · if/const · if>const/bin · if>const>bin/object · if/return · if>return/call · /const · const/call · const>call/call · /return · return/call
    canonical  1 /const · 2 const/call · 3 /const · 4 const/call · 5 /const · 6 const/call · 7 /if · 8 if/bin → if>bin/bin · if>bin>bin/member · if>bin>bin/member · if/return · if>return/member · /const · const/call · const>call/call · const>call>call/call · /call · call/object · call>object/prop · call>object>prop/member · call>object/prop · /return
  **Fix** — Replace the local body with a call to `scopeFromProject` from `css/core/scope.ts`.
- **checkFile** — `checkFile` looks like the canonical `templateFacts`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 22%  ·  Structure 99%  ·  AST 86%  ·  Control flow 64%
  ! The two return different kinds of value, so they are inverse operations rather than copies.
  Signature  params · 0%  #1 string≠other  #2 options only on the canonical side
    types · 0%  #1 [abs:string,arch:Arch,project:Project,repoFiles:string[],dedupe:SeenStore]≠TaggedTemplateExpression
    name sites  callback-param 0:76↔1:113,114  param 0:56↔1:100  prop 0:72,82↔1:102,112,114,115  var-decl 0:57,59,62,78↔1:101,102,105,106,111,112,113
    return Finding[] ≠ DocumentFacts&{ tag:string; line:number; startLine:number; comment:{ text:string; line:number; }; }
  Structure  0.48 · 48%  array 0:68,72,78↔1:  bin · 17% 0:62,63,64,68,72,76↔1:114  call 0:59,62,75,76,80,82,85,86,87↔1:101,102,105,106,111,112,114,115,116  if 0:75↔1:116  index 0:↔1:114  member · 11% 0:62,63,64,68,72,75,76,85,87↔1:116  new · 50% 0:68,72↔1:115  object · 75% 0:62,72,82↔1:102,112,114,115  prop · 50% 0:72,82↔1:102,112,114,115  return 0:89↔1:118
    only local: array 3  only canonical: index 1
  AST  var:const L 57 ↔ R 106 · 75%  member:v L 75 ↔ R 116  var:const L 78 ↔ R 111 · 50%  return:return L 89 ↔ R 118  var-destr:var-destr L 59 ↔ R 101  if:if L 75 ↔ R 116
  Control flow  0.64  /var-destr ×1, var-destr/call ×1, /const ×1, /call ×1, call/object ×1, call>object/prop ×2, /return ×1
    local  1 /const · 2 /var-destr · 3 var-destr/call · 4 /var-destr · 5 var-destr/call · 6 var-destr>call/bin · 7 var-destr>call>bin/member · 8 var-destr>call>bin/object → /bin · bin/member · /bin · bin/member · /bin · bin/member · bin/array · bin>array/new · /bin · bin/member · bin/object · bin>object/prop · bin>object/prop · bin>object>prop/array · bin>object>prop>array/new · bin>object/prop · /if · if/call · if>call/member · if/call · if>call/member · /bin · bin/member · /const · const/array · /call · /call · call/object · call>object/prop · call>object/prop · call>object/prop · call>object/prop · call>object/prop · call>object/prop · /call · call/member · call/member · call/member · /call · /call · call/member · /return
    canonical  1 /var-destr · 2 var-destr/call · 3 /const · 4 const>call/call · 5 const/call · 6 const>call/object · 7 const>call>object/prop · 8 /const → const/call · const>call/call · /const · const/call · /const · const/call · /const · const/object · const>object/prop · const>object>prop>call/call · const>object>prop/call · const>object/prop · const>object/prop · const>object/prop · const>object>prop/call · /const · /call · call/object · call>object/prop · call>object/prop · call>object>prop/new · /if · if/member · if/call · if>call/member · /return
  **Fix** — Replace the local body with a call to `templateFacts` from `css/index.ts`.
- **loadArchitecture** — `loadArchitecture` looks like the canonical `reportOf`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 25%  ·  Structure 99%  ·  AST 82%  ·  Control flow 62%
  Signature  params · 0%  #1 union≠other
    types · 0%  #1 string|RawArch|RuleOptions≠FieldValue
    name sites  param 0:131↔1:143  var-decl 0:134,138↔1:144,147,148,149,153
    return Arch ≠ ReportValue
  Structure  0.58 · 58%  bin · 75% 0:132,133,134↔1:145,150,152,154  call · 80% 0:132,136,138,140↔1:144,146,149,152,154  for-of 0:↔1:148  if · 40% 0:132,133↔1:145,146,150,152,154  index 0:↔1:150  member · 33% 0:132↔1:152,153,154  object 0:134↔1:147  return 0:132,136,140↔1:145,146,156  unary 0:↔1:146
    only canonical: for-of 1, index 1, unary 1
  AST  if:if L 132 ↔ R 145 · 55%  return:return L 132 ↔ R 145 · 50%  bin:=== L 132 ↔ R 145  if:if L 133 ↔ R 154  var:const L 138 ↔ R 153  return:return L 140 ↔ R 156
  Control flow  0.62  /if ×1, if/bin ×1, if/return ×1, /if ×1, if/bin ×1, /const ×1, /return ×1
    local  1 /if · 2 if/bin · 3 if>bin/call · 4 if>bin/bin · 5 if/return · 6 if>return/call · 7 if>return>call/member → /if · if/bin · if/const · if>const/bin · if>const>bin/object · if/return · if>return/call · /const · const/call · const>call/call · /return · return/call
    canonical  1 /const · 2 const/call · 3 /if · 4 if/bin · 5 if/return · 6 /if · 7 if/unary → if>unary/call · if/return · /const · const/object · /for-of · for-of/const · for-of>const/call · for-of/if · for-of>if/bin · for-of>if/bin · for-of>if>bin/index · /if · if/call · if>call/member · if/bin · if>bin/member · if>bin>call/member · if>bin/call · /const · const/member · /if · if/bin · if>bin/bin · if>bin/call · if/bin · if>bin/member · /return
  **Fix** — Replace the local body with a call to `reportOf` from `invariants/index.ts`.
- **parseArgs** — `parseArgs` looks like the canonical `statementExport`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 42%  ·  Structure 99%  ·  AST 44%  ·  Control flow 75%
  ! The bodies do not look alike: AST 0.44 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 string≠other  #2 importMap only on the canonical side  #3 ctx only on the canonical side
    types · 0%  #1 string[]≠ExportDeclaration
    name sites  param 0:72↔1:31  prop 0:73↔1:34,35,36,37,38,42,43,44  var-decl 0:73,74,75,76↔1:32,33,50
    return Args ≠ ExportFact
  Structure  0.44 · 44%  array 0:73↔1:53  bin · 71% 0:74,78,81,82,85,86,89↔1:32,47,48,53,56  call · 18% 0:78,82↔1:32,34,42,43,44,46,47,48,50,53,56  for 0:74↔1:  if · 75% 0:77,81,85,89↔1:46,53,56  index · 50% 0:75,76↔1:56  member · 75% 0:74,86,89↔1:47,48,53,56  object 0:73↔1:33  prop · 13% 0:73↔1:34,35,36,37,38,42,43,44  return 0:92↔1:58  unary 0:↔1:56
    only local: for 1  only canonical: unary 1
  AST  return:return L 92 ↔ R 58  var:const L 73 ↔ R 50
  Control flow  0.75  /const ×1, const/object ×1, const>object/prop ×8, /return ×1
    local  1 /const · 2 const/object · 3 const>object/prop · 4 const>object/prop · 5 const>object>prop/array · 6 const>object/prop · 7 const>object>prop/array · 8 const>object/prop · 9 const>object>prop/array · 10 const>object/prop · 11 const>object>prop/array → const>object/prop · const>object/prop · const>object/prop · const>object/prop · const>object/prop · /for · for/bin · for>bin/member · for/bin · for/const · for>const/index · for/const · for>const/index · for/if · for>if/bin · for>if>bin/call · for/if · for>if/bin · for>if/bin · for>if>bin/call · for/if · for>if/bin · for>if/bin · for>if>bin/member · for/if · for>if/bin · for>if>bin/bin · for>if>bin/bin · for>if/bin · for>if>bin/member · /return
    canonical  1 /const · 2 const>call/call · 3 const/call · 4 /const · 5 const/object · 6 const>object/prop · 7 const>object>prop/call · 8 const>object/prop · 9 const>object/prop · 10 const>object/prop · 11 const>object/prop → const>object/prop · const>object>prop/call · const>object/prop · const>object>prop/call · const>object/prop · const>object>prop/call · /if · if/call · if/bin · if>bin/member · if>bin/call · if/bin · if>bin/member · if>bin/call · if>bin>call/call · if>bin>call/member · /const · const/call · /if · if/bin · if>bin/member · if>bin/array · if>bin>array/call · /if · if/bin · if>bin/bin · if>bin>bin/unary · if>bin>bin>unary/member · if>bin>bin/bin · if>bin>bin>bin/member · if>bin>bin>bin>member/member · if>bin/call · if>bin>call/index · if>bin>call>index/member · if/bin · if>bin/member · if>bin/bin · if>bin>bin/call · if>bin>bin>call/index · if>bin>bin>call>index/member · /return
  **Fix** — Replace the local body with a call to `statementExport` from `entities/ast/file-exports.ts`.
- **checkFile** — `checkFile` looks like the canonical `actionRoleEdges`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 52%  ·  Structure 86%  ·  AST 82%  ·  Control flow 40%
  Signature  params
    types · 0%  #1 [abs:string,arch:Arch,project:Project,repoFiles:string[],dedupe:SeenStore]≠{ kind:string; action:{ where?:WhereEntry[]; scopeAccess?:{ scope:string; segments:string[]; }[]; }; targetSlug:string; violations:readonly GraphViolation[]; seen:Set<string>; }
    name sites  callback-param 0:76↔1:60  param 0:56↔1:52  prop 0:72,82↔1:61  var-decl 0:57,59,62,78↔1:53,54,55,57,59,60
    return Finding[] ≠ AccessEdge[]
  Structure  0.43 · 43%  array · 67% 0:68,72,78↔1:54,55  bin · 50% 0:62,63,64,68,72,76↔1:55,56,60  call · 44% 0:59,62,75,76,80,82,85,86,87↔1:58,59,60,61  for-of 0:↔1:55  if · 50% 0:75↔1:56,58  member · 44% 0:62,63,64,68,72,75,76,85,87↔1:55,56,57,60  new 0:68,72↔1:  object · 33% 0:62,72,82↔1:61  prop · 50% 0:72,82↔1:61  return 0:89↔1:63  template 0:↔1:57  unary 0:↔1:58
    only local: new 2  only canonical: for-of 1, template 1, unary 1
  AST  var:const L 78 ↔ R 54  array:array L 78 ↔ R 54  return:return L 89 ↔ R 63  var-destr:var-destr L 59 ↔ R 53
  Control flow  0.4  /var-destr ×1, /const ×1, const/array ×1, /return ×1
    local  1 /const · 2 /var-destr · 3 var-destr/call · 4 /var-destr → var-destr/call · var-destr>call/bin · var-destr>call>bin/member · var-destr>call>bin/object · /bin · bin/member · /bin · bin/member · /bin · bin/member · bin/array · bin>array/new · /bin · bin/member · bin/object · bin>object/prop · bin>object/prop · bin>object>prop/array · bin>object>prop>array/new · bin>object/prop · /if · if/call · if>call/member · if/call · if>call/member · /bin · bin/member · /const · const/array · /call · /call · call/object · call>object/prop · call>object/prop · call>object/prop · call>object/prop · call>object/prop · call>object/prop · /call · call/member · call/member · call/member · /call · /call · call/member · /return
    canonical  1 /var-destr · 2 /const · 3 const/array · 4 /for-of → for-of/bin · for-of>bin/member · for-of>bin/array · for-of/if · for-of>if/bin · for-of>if>bin/member · for-of/const · for-of>const/template · for-of>const>template/member · for-of/if · for-of>if/unary · for-of>if>unary/call · for-of/const · for-of>const/call · for-of/const · for-of>const/call · for-of/call · for-of>call/call · for-of>call>call/object · for-of>call>call>object/prop · for-of>call>call>object/prop · for-of>call>call>object/prop · for-of>call>call>object/prop · for-of>call>call>object/prop · /return
  **Fix** — Replace the local body with a call to `actionRoleEdges` from `report/user-report/data/graph-roles.ts`.
- **installExitHook** — `installExitHook` looks like the canonical `walk`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 56%  ·  Structure 92%  ·  AST 52%  ·  Control flow 54%
  ! The bodies do not look alike: AST 0.52 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 value only on the canonical side  #2 trail only on the canonical side  #3 state only on the canonical side
    types · 0%
    return void ≡ void
  Structure  0.44 · 44%  array 0:↔1:88,89,90  bin 0:85,90↔1:84,87  call · 75% 0:89,90,91↔1:85,87,89,90  cond 0:↔1:87  for-of 0:90↔1:  if 0:84↔1:84  member 0:90↔1:  new 0:↔1:88  return 0:84↔1:84  unary 0:↔1:87
    only local: for-of 1, member 1  only canonical: array 3, cond 1, new 1, unary 1
  AST  if:if L 84 ↔ R 84 · 60%  return:return L 84 ↔ R 84
  Control flow  0.54  /if ×1, if/return ×1, /call ×1
    local  1 /if · 2 if/return · 3 /bin → /call
    canonical  1 /if · 2 if/bin · 3 if/return → /call · call/new · call>new/array · call>new>array/array · call>new>array/array
  **Fix** — Replace the local body with a call to `walk` from `report/user-report/shared/describe.ts`.
- **checkBuilt** — `checkBuilt` looks like the canonical `materialiseResolution`, but not closely enough to call it a copy — 0.66 (66%).
  scores  Signature 44%  ·  Structure 95%  ·  AST 66%  ·  Control flow 54%
  ! The bodies do not look alike: AST 0.66 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 union≠object  #2 providers only on the canonical side
    types · 0%  #1 Pick<Arch,"nodes"|"codeRoles"|"invariants">≠{ declarations?:FieldValue; }
    name sites  callback-param 0:42↔1:89  param 0:41↔1:76  var-decl 0:42,44,45↔1:77,79,80,85
    return void ≡ void
  Structure  0.43 · 43%  bin 0:43↔1:82  call · 63% 0:42,43,44,45,46↔1:77,79,80,82,83,86,89,90  for-of 0:45↔1:  if · 50% 0:43,46↔1:78,81,86,90  index 0:↔1:90  member 0:42,43,44,45↔1:80,83,85,90  new 0:43,44↔1:  object 0:↔1:90  prop 0:↔1:90  return 0:↔1:78,86  throw 0:43,46↔1:  unary · 33% 0:46↔1:78,81,86
    only local: for-of 1, new 2, throw 2  only canonical: index 1, object 1, prop 1, return 2
  AST  var:const L 44 ↔ R 85 · 57%  member:v L 44 ↔ R 85  var:const L 42 ↔ R 77  if:if L 43 ↔ R 86
  Control flow  0.54  /const ×1, const/call ×1, /if ×1, if/bin ×1, /const ×1
    local  1 /const · 2 const>call/member · 3 const/call · 4 /if · 5 if/bin → if>bin/member · if>bin>member/new · if>bin/member · if/throw · if>throw/call · /const · const/new · const>new/call · const>new>call/member · /for-of · for-of/call · for-of>call/member · for-of>call>member/member · for-of/if · for-of>if/unary · for-of>if>unary/call · for-of>if/throw · for-of>if>throw/call
    canonical  1 /const · 2 const/call · 3 /if · 4 if/unary · 5 if/return → /const · const/call · /let · let>call/member · let/call · /if · if/unary · if/bin · if>bin/call · if>call/member · if/call · /const · const/member · /if · if/unary · if>unary/call · if/return · /call
  **Fix** — Replace the local body with a call to `materialiseResolution` from `css/index.ts`.
- **writeBucket** — `writeBucket` looks like the canonical `foreignFolder`, but not closely enough to call it a copy — 0.65 (65%).
  scores  Signature 44%  ·  Structure 96%  ·  AST 63%  ·  Control flow 54%
  ! The bodies do not look alike: AST 0.63 is below the 0.75 veto floor, so the coarse signals cannot promote this to a duplicate.
  Signature  params · 0%  #1 other≠string
    types · 0%  #1 ReportBucket≠[ctx:FileContext,owner:ArchNode,folder:string,declared:ArchChild[],out:Finding[],findingFrom:FindingFrom]
    name sites  callback-param 0:53↔1:47,54  param 0:51↔1:39  prop 0:55,56,57,58,59,60,61,62↔1:51,52,53,54,55,61  var-decl 0:52,53,54↔1:40,41,42,43,46,47
    return void ≡ void
  Structure  0.44 · 44%  array · 33% 0:52,53,57↔1:47  bin 0:53,65↔1:  call · 50% 0:52,53,54,64↔1:43,44,45,46,47,48,49,54  cond 0:↔1:47,54,55  if 0:↔1:44  member · 78% 0:52,53,55,59,60,61,62,64,65↔1:41,42,47,54,59,60,61  object · 33% 0:54↔1:50,52,61  prop · 75% 0:55,56,57,58,59,60,61,62↔1:51,52,53,54,55,61  return 0:↔1:44  template 0:↔1:42,47,54,55,60
    only local: bin 2  only canonical: cond 3, if 1, return 1, template 5
  AST  var:const L 52 ↔ R 41 · 50%  member:v L 52 ↔ R 41  var:const L 53 ↔ R 46  var:const L 54 ↔ R 47
  Control flow  0.54  /const ×1, const/call ×1, /const ×1, const/call ×1, /const ×1, /call ×1
    local  1 /const · 2 const>call/array · 3 const>call>array>call/member · 4 const>call>array/call · 5 const/call · 6 /const → const/call · /const · const/call · const>call/object · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object/prop · const>call>object>prop/array · const>call>object/prop · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/member · /call · call/member · /bin · bin/member
    canonical  1 /const · 2 /const · 3 const/member · 4 /const · 5 const/template · 6 const>template/member → /const · const/call · /if · if/call · if/return · /call · /const · const/call · /const · const>cond/member · const/cond · const>cond>call>call/array · const>cond>call>call>array/call · const>cond>call/call · const>cond/call · /call · call/call · call>call/object · call>call>object/prop · call>call>object/prop · call>call>object>prop/object · call>call>object>prop>object/prop · call>call>object>prop>object/prop · call>call>object>prop>object>prop/template · call>call>object>prop>object>prop>template/member · call>call>object>prop>object>prop>template>call/call · call>call>object>prop>object>prop>template/call · call>call>object>prop>object/prop · call>call>object>prop>object>prop/cond · call>call>object>prop>object>prop>cond/template · call>call/member · call>call/template · call>call>template/member · call>call/object · call>call>object/prop · call>call>object>prop/member · call>call>object/prop · call>call>object/prop · call>call>object>prop/member
  **Fix** — Replace the local body with a call to `foreignFolder` from `nodes/finally/required.ts`.
- **writeBucket** — `writeBucket` looks like the canonical `tokenOf`, but not closely enough to call it a copy — 0.65 (65%).
  scores  Signature 25%  ·  Structure 100%  ·  AST 99%  ·  Control flow 40%
  Signature  params · 33%  #2 arch only on the canonical side  #3 fileRoles only on the canonical side
    types · 0%  #1 ReportBucket≠RelationGroup
    name sites  callback-param 0:53↔1:72  param 0:51↔1:70  prop 0:55,56,57,58,59,60,61,62↔1:76,77,78,80,81,82,83,85,86,87,88  var-decl 0:52,53,54↔1:71,72,73
    return void ≠ RelationToken
  Structure  0.68 · 68%  array 0:52,53,57↔1:71,72,78  bin · 67% 0:53,65↔1:78,80,88  call · 57% 0:52,53,54,64↔1:71,72,73,77,82,86,87  cond 0:↔1:78  index 0:↔1:80  member 0:52,53,55,59,60,61,62,64,65↔1:71,72,78,80,83,85,86,87,88  new 0:↔1:72  object · 33% 0:54↔1:75,78,81  prop · 73% 0:55,56,57,58,59,60,61,62↔1:76,77,78,80,81,82,83,85,86,87,88  return 0:↔1:75
    only canonical: cond 1, index 1, new 1, return 1
  AST  var:const L 52 ↔ R 71 · 88%  array:array L 52 ↔ R 71  call:keys L 52 ↔ R 71  member:v L 52 ↔ R 71  var:const L 53 ↔ R 72  var:const L 54 ↔ R 73
  Control flow  0.4  /const ×3, const/call ×1
    local  1 /const · 2 const>call/array · 3 const>call>array>call/member · 4 const>call>array/call → const/call · /const · const/call · /const · const/call · const>call/object · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object/prop · const>call>object>prop/array · const>call>object/prop · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/member · const>call>object/prop · const>call>object>prop/member · /call · call/member · /bin · bin/member
    canonical  1 /const · 2 const/array · 3 const>array>call/member · 4 const>array/call → /const · const/array · const>array/new · const>array>new>call/array · const>array>new>call>array>call/member · const>array>new>call>array/call · const>array>new/call · /const · const/call · /return · return/object · return>object/prop · return>object/prop · return>object>prop/call · return>object/prop · return>object>prop/object · return>object>prop>object/prop · return>object>prop>object/prop · return>object>prop>object>prop>cond/member · return>object>prop>object>prop/cond · return>object>prop>object>prop>cond/array · return>object>prop>object/prop · return>object>prop>object>prop/bin · return>object>prop>object>prop>bin/member · return>object/prop · return>object>prop/bin · return>object>prop>bin/bin · return>object>prop>bin>bin/index · return>object>prop>bin>bin>index/member · return>object>prop>bin>bin/member · return>object/prop · return>object>prop/object · return>object>prop>object/prop · return>object>prop>object>prop/call · return>object>prop>object/prop · return>object>prop>object>prop/member · return>object>prop>object/prop · return>object>prop>object>prop/member · return>object>prop>object/prop · return>object>prop>object>prop/call · return>object>prop>object>prop>call/member · return>object>prop>object/prop · return>object>prop>object>prop/call · return>object>prop>object>prop>call/member · return>object>prop>object/prop · return>object>prop>object>prop/bin · return>object>prop>object>prop>bin/member
  **Fix** — Replace the local body with a call to `tokenOf` from `nodes/finally/relations-group.ts`.

## Inside `entities` — utils folder duplicates (157)

| Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| isLocalTarget | `entities/ast/assignments-nodes.ts:58` | computedLocal | `css/resolve/path-answer.ts:54` | 0.84 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| freezeWrite | `entities/ast/assignments-raw.ts:41` | mapAnswers | `css/resolve/expression.ts:212` | 0.88 | Structure | Replace the local body with a call to `mapAnswers` from `css/resolve/expression.ts`. |
| freezeWrite | `entities/ast/assignments-raw.ts:41` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.87 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.80 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| isReceiverOnly | `entities/ast/calls.ts:150` | computedLocal | `css/resolve/path-answer.ts:54` | 0.84 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| callImport | `entities/ast/file-imports.ts:35` | mapAnswers | `css/resolve/expression.ts:212` | 0.76 | Structure | Replace the local body with a call to `mapAnswers` from `css/resolve/expression.ts`. |
| isWholeRead | `entities/ast/properties.ts:113` | computedLocal | `css/resolve/path-answer.ts:54` | 0.76 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| inRepo | `entities/ast/resolve.ts:198` | computedLocal | `css/resolve/path-answer.ts:54` | 0.78 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| isMutable | `entities/ast/tree.ts:258` | computedLocal | `css/resolve/path-answer.ts:54` | 0.87 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| matchesRole | `entities/location/where.ts:74` | computedLocal | `css/resolve/path-answer.ts:54` | 0.77 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| reportUndeclared | `entities/tree/entries.ts:97` | materialiseResolution | `css/index.ts:76` | 0.82 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| checkTree | `entities/tree/entries.ts:118` | materialiseResolution | `css/index.ts:76` | 0.77 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| instanceAt | `entities/tree/match.ts:98` | computedLocal | `css/resolve/path-answer.ts:54` | 0.80 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| rootNodeOf | `entities/ast/assignments-nodes.ts:35` | nameRootOf | `css/resolve/directive.ts:19` | 0.74 | Structure | Replace the local body with a call to `nameRootOf` from `css/resolve/directive.ts`. |
| isLocalTarget | `entities/ast/assignments-nodes.ts:58` | isDynamicNode | `css/resolve/path-answer.ts:65` | 0.71 | Structure | Replace the local body with a call to `isDynamicNode` from `css/resolve/path-answer.ts`. |
| deleteWrite | `entities/ast/assignments-raw.ts:30` | joinAnswer | `css/resolve/expression.ts:241` | 0.73 | Structure | Replace the local body with a call to `joinAnswer` from `css/resolve/expression.ts`. |
| deleteWrite | `entities/ast/assignments-raw.ts:30` | logicalAnswer | `css/resolve/expression.ts:80` | 0.72 | Structure | Replace the local body with a call to `logicalAnswer` from `css/resolve/expression.ts`. |
| freezeWrite | `entities/ast/assignments-raw.ts:41` | materialiseResolution | `css/index.ts:76` | 0.72 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| freezeWrite | `entities/ast/assignments-raw.ts:41` | joinAnswer | `css/resolve/expression.ts:241` | 0.72 | Structure | Replace the local body with a call to `joinAnswer` from `css/resolve/expression.ts`. |
| assignWrite | `entities/ast/assignments-raw.ts:56` | logicalAnswer | `css/resolve/expression.ts:80` | 0.68 | Structure | Replace the local body with a call to `logicalAnswer` from `css/resolve/expression.ts`. |
| assignWrite | `entities/ast/assignments-raw.ts:56` | objectLiteralAt | `css/resolve/theme-value.ts:280` | 0.68 | Structure | Replace the local body with a call to `objectLiteralAt` from `css/resolve/theme-value.ts`. |
| writesReturn | `entities/ast/assignments-tagged.ts:41` | computedLocal | `css/resolve/path-answer.ts:54` | 0.66 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| methodWrites | `entities/ast/assignments-tagged.ts:55` | isDirective | `css/resolve/directive.ts:61` | 0.71 | Structure | Replace the local body with a call to `isDirective` from `css/resolve/directive.ts`. |
| declaredInRepo | `entities/ast/assignments-tagged.ts:63` | computedLocal | `css/resolve/path-answer.ts:54` | 0.65 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| declaredFileOfProp | `entities/ast/assignments-tagged.ts:74` | joinAnswer | `css/resolve/expression.ts:241` | 0.67 | Structure | Replace the local body with a call to `joinAnswer` from `css/resolve/expression.ts`. |
| initCallOf | `entities/ast/assignments-tagged.ts:88` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.65 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| findParam | `entities/ast/assignments-tagged.ts:105` | stylesheetFacts | `css/index.ts:128` | 0.71 | Structure | Replace the local body with a call to `stylesheetFacts` from `css/index.ts`. |
| findParam | `entities/ast/assignments-tagged.ts:105` | parseOrNull | `css/syntax/gate.ts:67` | 0.69 | Structure | Replace the local body with a call to `parseOrNull` from `css/syntax/gate.ts`. |
| rootContext | `entities/ast/assignments-tagged.ts:141` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.65 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| rootContext | `entities/ast/assignments-tagged.ts:141` | parentOf | `css/styled/document.ts:103` | 0.65 | Structure | Replace the local body with a call to `parentOf` from `css/styled/document.ts`. |
| methodNameOf | `entities/ast/assignments-tagged.ts:162` | joinedText | `css/resolve/expression.ts:229` | 0.74 | Structure | Replace the local body with a call to `joinedText` from `css/resolve/expression.ts`. |
| methodNameOf | `entities/ast/assignments-tagged.ts:162` | arithmeticTextOf | `css/resolve/theme-value.ts:183` | 0.70 | Structure | Replace the local body with a call to `arithmeticTextOf` from `css/resolve/theme-value.ts`. |
| taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | materialiseResolution | `css/index.ts:76` | 0.71 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | initializerOf | `css/resolve/theme-value.ts:112` | 0.70 | Structure | Replace the local body with a call to `initializerOf` from `css/resolve/theme-value.ts`. |
| relationOf | `entities/ast/assignments.ts:49` | chainedValueOf | `css/resolve/theme-value.ts:154` | 0.68 | Structure | Replace the local body with a call to `chainedValueOf` from `css/resolve/theme-value.ts`. |
| relationOf | `entities/ast/assignments.ts:49` | arithmeticTextOf | `css/resolve/theme-value.ts:183` | 0.67 | Structure | Replace the local body with a call to `arithmeticTextOf` from `css/resolve/theme-value.ts`. |
| mergeWrite | `entities/ast/assignments.ts:66` | declarationFact | `css/styled/document.ts:212` | 0.65 | Structure | Replace the local body with a call to `declarationFact` from `css/styled/document.ts`. |
| argumentFact | `entities/ast/calls.ts:64` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.72 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| argumentFact | `entities/ast/calls.ts:64` | commentAbove | `css/styled/document.ts:36` | 0.68 | Structure | Replace the local body with a call to `commentAbove` from `css/styled/document.ts`. |
| calleeOf | `entities/ast/calls.ts:100` | firstReturnExpression | `css/resolve/expression.ts:111` | 0.66 | Structure | Replace the local body with a call to `firstReturnExpression` from `css/resolve/expression.ts`. |
| isReceiverOnly | `entities/ast/calls.ts:150` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.75 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| isReceiverOnly | `entities/ast/calls.ts:150` | isDynamicNode | `css/resolve/path-answer.ts:65` | 0.67 | Structure | Replace the local body with a call to `isDynamicNode` from `css/resolve/path-answer.ts`. |
| memberType | `entities/ast/classes.ts:18` | literalTextOf | `css/resolve/theme-value.ts:74` | 0.69 | Structure | Replace the local body with a call to `literalTextOf` from `css/resolve/theme-value.ts`. |
| memberType | `entities/ast/classes.ts:18` | staticStringOf#anon@34 | `css/styled/markup.ts:34` | 0.66 | Structure | Replace the local body with a call to `staticStringOf#anon@34` from `css/styled/markup.ts`. |
| depthOf | `entities/ast/depth.ts:79` | materialiseResolution | `css/index.ts:76` | 0.69 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| depthOf | `entities/ast/depth.ts:79` | pathAnswer | `css/resolve/path-answer.ts:86` | 0.66 | Structure | Replace the local body with a call to `pathAnswer` from `css/resolve/path-answer.ts`. |
| candidatesIn | `entities/ast/depth.ts:107` | propertiesReader#anon@40 | `css/tailwind/tailwind.ts:40` | 0.71 | Structure | Replace the local body with a call to `propertiesReader#anon@40` from `css/tailwind/tailwind.ts`. |
| candidatesIn | `entities/ast/depth.ts:107` | readerFor | `css/resolve/theme-value.ts:233` | 0.69 | Structure | Replace the local body with a call to `readerFor` from `css/resolve/theme-value.ts`. |
| attachCallDepth | `entities/ast/depth.ts:134` | attachToCandidates | `css/index.ts:146` | 0.68 | Structure | Replace the local body with a call to `attachToCandidates` from `css/index.ts`. |
| attachCallDepth | `entities/ast/depth.ts:134` | attachClasses | `css/styled/markup.ts:73` | 0.65 | Structure | Replace the local body with a call to `attachClasses` from `css/styled/markup.ts`. |
| statementExport | `entities/ast/file-exports.ts:31` | templateFacts | `css/index.ts:100` | 0.69 | Structure | Replace the local body with a call to `templateFacts` from `css/index.ts`. |
| statementExport | `entities/ast/file-exports.ts:31` | collectProblems | `css/resolve/resolve.ts:57` | 0.69 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |
| commonJsExport | `entities/ast/file-exports.ts:71` | leafLiteral | `css/core/values.ts:88` | 0.65 | Structure | Replace the local body with a call to `leafLiteral` from `css/core/values.ts`. |
| exportsOf#anon@87 | `entities/ast/file-exports.ts:87` | piecesOfRange#anon@40 | `css/core/pieces.ts:40` | 0.67 | Signature | Replace the local body with a call to `piecesOfRange#anon@40` from `css/core/pieces.ts`. |
| exportsOf#anon@87 | `entities/ast/file-exports.ts:87` | valueFromOf#anon@177 | `css/styled/document.ts:177` | 0.67 | Signature | Replace the local body with a call to `valueFromOf#anon@177` from `css/styled/document.ts`. |
| callImport | `entities/ast/file-imports.ts:35` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.75 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| callImport | `entities/ast/file-imports.ts:35` | joinedText | `css/resolve/expression.ts:229` | 0.73 | Structure | Replace the local body with a call to `joinedText` from `css/resolve/expression.ts`. |
| importsOf#anon@81 | `entities/ast/file-imports.ts:81` | piecesOfRange#anon@40 | `css/core/pieces.ts:40` | 0.67 | Signature | Replace the local body with a call to `piecesOfRange#anon@40` from `css/core/pieces.ts`. |
| importsOf#anon@81 | `entities/ast/file-imports.ts:81` | valueFromOf#anon@177 | `css/styled/document.ts:177` | 0.67 | Signature | Replace the local body with a call to `valueFromOf#anon@177` from `css/styled/document.ts`. |
| parentName | `entities/ast/functions.ts:37` | staticStringOf | `css/styled/markup.ts:28` | 0.74 | Structure | Replace the local body with a call to `staticStringOf` from `css/styled/markup.ts`. |
| parentName | `entities/ast/functions.ts:37` | chainedValueOf | `css/resolve/theme-value.ts:154` | 0.72 | Structure | Replace the local body with a call to `chainedValueOf` from `css/resolve/theme-value.ts`. |
| extractScript | `entities/ast/project.ts:64` | structureOf | `css/tailwind/tailwind.ts:93` | 0.69 | Structure | Replace the local body with a call to `structureOf` from `css/tailwind/tailwind.ts`. |
| loadSourceFile | `entities/ast/project.ts:85` | scopeFromProject | `css/core/scope.ts:167` | 0.68 | Structure | Replace the local body with a call to `scopeFromProject` from `css/core/scope.ts`. |
| isPurePropertyPath | `entities/ast/properties.ts:18` | computedLocal | `css/resolve/path-answer.ts:54` | 0.69 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| leftmostOrigin | `entities/ast/properties.ts:36` | chainPath | `css/resolve/theme-value.ts:37` | 0.68 | Structure | Replace the local body with a call to `chainPath` from `css/resolve/theme-value.ts`. |
| importModuleOf | `entities/ast/properties.ts:84` | staticStringOf | `css/styled/markup.ts:28` | 0.68 | Structure | Replace the local body with a call to `staticStringOf` from `css/styled/markup.ts`. |
| importModuleOf | `entities/ast/properties.ts:84` | arithmeticTextOf | `css/resolve/theme-value.ts:183` | 0.66 | Structure | Replace the local body with a call to `arithmeticTextOf` from `css/resolve/theme-value.ts`. |
| memberOwnerModule | `entities/ast/properties.ts:94` | literalTextOf | `css/resolve/theme-value.ts:74` | 0.70 | Structure | Replace the local body with a call to `literalTextOf` from `css/resolve/theme-value.ts`. |
| memberOwnerModule | `entities/ast/properties.ts:94` | chainedValueOf | `css/resolve/theme-value.ts:154` | 0.69 | Structure | Replace the local body with a call to `chainedValueOf` from `css/resolve/theme-value.ts`. |
| isWholeRead | `entities/ast/properties.ts:113` | isDirective | `css/resolve/directive.ts:61` | 0.71 | Structure | Replace the local body with a call to `isDirective` from `css/resolve/directive.ts`. |
| isWholeRead | `entities/ast/properties.ts:113` | isDynamicNode | `css/resolve/path-answer.ts:65` | 0.65 | Structure | Replace the local body with a call to `isDynamicNode` from `css/resolve/path-answer.ts`. |
| repoRelative | `entities/ast/resolve.ts:31` | utilityValue | `css/tailwind/tailwind.ts:85` | 0.71 | Structure | Replace the local body with a call to `utilityValue` from `css/tailwind/tailwind.ts`. |
| followAlias | `entities/ast/resolve.ts:43` | stylesheetFacts | `css/index.ts:128` | 0.71 | Structure | Replace the local body with a call to `stylesheetFacts` from `css/index.ts`. |
| followAlias | `entities/ast/resolve.ts:43` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.71 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| nextDeclOf | `entities/ast/resolve.ts:65` | stylesheetFacts | `css/index.ts:128` | 0.71 | Structure | Replace the local body with a call to `stylesheetFacts` from `css/index.ts`. |
| nextDeclOf | `entities/ast/resolve.ts:65` | parseOrNull | `css/syntax/gate.ts:67` | 0.69 | Structure | Replace the local body with a call to `parseOrNull` from `css/syntax/gate.ts`. |
| tupleParts | `entities/ast/resolve.ts:101` | arithmeticValues#anon@81#anon@82 | `css/resolve/answers.ts:82` | 0.66 | Structure | Replace the local body with a call to `arithmeticValues#anon@81#anon@82` from `css/resolve/answers.ts`. |
| viaConstraint | `entities/ast/resolve.ts:121` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.66 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| walk | `entities/ast/resolve.ts:143` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.74 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| walk | `entities/ast/resolve.ts:143` | mapAnswers | `css/resolve/expression.ts:212` | 0.74 | Structure | Replace the local body with a call to `mapAnswers` from `css/resolve/expression.ts`. |
| inRepo | `entities/ast/resolve.ts:198` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.68 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| inRepo | `entities/ast/resolve.ts:198` | mapAnswers | `css/resolve/expression.ts:212` | 0.65 | Structure | Replace the local body with a call to `mapAnswers` from `css/resolve/expression.ts`. |
| initReturnType | `entities/ast/resolve.ts:219` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.70 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| initReturnType | `entities/ast/resolve.ts:219` | namedAnswer | `css/resolve/path-answer.ts:76` | 0.69 | Structure | Replace the local body with a call to `namedAnswer` from `css/resolve/path-answer.ts`. |
| returnTypeOf | `entities/ast/resolve.ts:229` | providerValueOf | `css/resolve/theme-value.ts:242` | 0.71 | Structure | Replace the local body with a call to `providerValueOf` from `css/resolve/theme-value.ts`. |
| returnTypeOf | `entities/ast/resolve.ts:229` | mapAnswers | `css/resolve/expression.ts:212` | 0.70 | Structure | Replace the local body with a call to `mapAnswers` from `css/resolve/expression.ts`. |
| declaredFileOfExpr | `entities/ast/resolve.ts:283` | namedAnswer | `css/resolve/path-answer.ts:76` | 0.65 | Structure | Replace the local body with a call to `namedAnswer` from `css/resolve/path-answer.ts`. |
| literalValueOf | `entities/ast/tree.ts:110` | logicalAnswer | `css/resolve/expression.ts:80` | 0.71 | Structure | Replace the local body with a call to `logicalAnswer` from `css/resolve/expression.ts`. |
| literalValueOf | `entities/ast/tree.ts:110` | literalTextOf | `css/resolve/theme-value.ts:74` | 0.69 | Structure | Replace the local body with a call to `literalTextOf` from `css/resolve/theme-value.ts`. |
| isMeaningful | `entities/ast/tree.ts:142` | computedLocal | `css/resolve/path-answer.ts:54` | 0.72 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| isMeaningful | `entities/ast/tree.ts:142` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.69 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| depthOf | `entities/ast/tree.ts:164` | valueStartAt | `css/core/scope.ts:41` | 0.73 | Structure | Replace the local body with a call to `valueStartAt` from `css/core/scope.ts`. |
| isExported#anon@249 | `entities/ast/tree.ts:249` | isHolder | `css/styled/template.ts:60` | 0.73 | Control flow | Replace the local body with a call to `isHolder` from `css/styled/template.ts`. |
| isMutable | `entities/ast/tree.ts:258` | initializerOf | `css/resolve/theme-value.ts:112` | 0.69 | Structure | Replace the local body with a call to `initializerOf` from `css/resolve/theme-value.ts`. |
| isMutable | `entities/ast/tree.ts:258` | isDirective | `css/resolve/directive.ts:61` | 0.68 | Structure | Replace the local body with a call to `isDirective` from `css/resolve/directive.ts`. |
| descendantsOf#anon@321 | `entities/ast/tree.ts:321` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.70 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| descendantsOf#anon@321 | `entities/ast/tree.ts:321` | isDirective | `css/resolve/directive.ts:61` | 0.67 | Structure | Replace the local body with a call to `isDirective` from `css/resolve/directive.ts`. |
| initializerFact | `entities/ast/tree.ts:346` | numericReading | `css/resolve/answers.ts:69` | 0.68 | Structure | Replace the local body with a call to `numericReading` from `css/resolve/answers.ts`. |
| initializerFact | `entities/ast/tree.ts:346` | dynamicMapAnswer | `css/resolve/expression.ts:190` | 0.68 | Structure | Replace the local body with a call to `dynamicMapAnswer` from `css/resolve/expression.ts`. |
| isInlineShape | `entities/ast/types.ts:32` | isHolder | `css/styled/template.ts:60` | 0.73 | Control flow | Replace the local body with a call to `isHolder` from `css/styled/template.ts`. |
| countReferences | `entities/ast/usage.ts:13` | resolveDeclaration | `css/resolve/resolve.ts:88` | 0.67 | Structure | Replace the local body with a call to `resolveDeclaration` from `css/resolve/resolve.ts`. |
| literalTextOf | `entities/ast/variables.ts:22` | literalTextOf | `css/resolve/theme-value.ts:74` | 0.70 | Signature | Replace the local body with a call to `literalTextOf` from `css/resolve/theme-value.ts`. |
| variableInitializer | `entities/ast/variables.ts:42` | stylesheetFacts | `css/index.ts:128` | 0.72 | Structure | Replace the local body with a call to `stylesheetFacts` from `css/index.ts`. |
| variableInitializer | `entities/ast/variables.ts:42` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.71 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| typeTextOfExpr | `entities/ast/variables.ts:70` | literalTextOf | `css/resolve/theme-value.ts:74` | 0.68 | Structure | Replace the local body with a call to `literalTextOf` from `css/resolve/theme-value.ts`. |
| typeTextOfExpr | `entities/ast/variables.ts:70` | valueTextOf | `css/resolve/theme-value.ts:209` | 0.66 | Structure | Replace the local body with a call to `valueTextOf` from `css/resolve/theme-value.ts`. |
| assertionOf | `entities/ast/variables.ts:77` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.75 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| assertionOf | `entities/ast/variables.ts:77` | scopeFromProject | `css/core/scope.ts:167` | 0.73 | Structure | Replace the local body with a call to `scopeFromProject` from `css/core/scope.ts`. |
| exportPiece | `entities/kinds.ts:143` | joinedText | `css/resolve/expression.ts:229` | 0.66 | Structure | Replace the local body with a call to `joinedText` from `css/resolve/expression.ts`. |
| exportPiece | `entities/kinds.ts:143` | utilityValue | `css/tailwind/tailwind.ts:85` | 0.66 | Structure | Replace the local body with a call to `utilityValue` from `css/tailwind/tailwind.ts`. |
| sharedPrefix | `entities/location/homes.ts:30` | closingBrace | `css/core/scope.ts:83` | 0.70 | Structure | Replace the local body with a call to `closingBrace` from `css/core/scope.ts`. |
| sharedPrefix | `entities/location/homes.ts:30` | closingParen | `css/core/text-scan.ts:9` | 0.70 | Structure | Replace the local body with a call to `closingParen` from `css/core/text-scan.ts`. |
| destinationsIn | `entities/location/homes.ts:83` | substituteText | `css/resolve/substitute.ts:84` | 0.70 | Structure | Replace the local body with a call to `substituteText` from `css/resolve/substitute.ts`. |
| destinationsIn | `entities/location/homes.ts:83` | namedAnswer | `css/resolve/path-answer.ts:76` | 0.66 | Structure | Replace the local body with a call to `namedAnswer` from `css/resolve/path-answer.ts`. |
| placeFor | `entities/location/homes.ts:135` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.71 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| placeFor | `entities/location/homes.ts:135` | binaryAnswer | `css/resolve/expression.ts:90` | 0.68 | Structure | Replace the local body with a call to `binaryAnswer` from `css/resolve/expression.ts`. |
| homeForRole | `entities/location/homes.ts:176` | leadingCommentOf | `css/styled/template.ts:64` | 0.70 | Structure | Replace the local body with a call to `leadingCommentOf` from `css/styled/template.ts`. |
| homeForRole | `entities/location/homes.ts:176` | staticStringOf#anon@34 | `css/styled/markup.ts:34` | 0.65 | Structure | Replace the local body with a call to `staticStringOf#anon@34` from `css/styled/markup.ts`. |
| capsAgree | `entities/location/where.ts:55` | computedLocal | `css/resolve/path-answer.ts:54` | 0.74 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| capsAgree | `entities/location/where.ts:55` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.72 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| matchesRole | `entities/location/where.ts:74` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.75 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| matchesRole | `entities/location/where.ts:74` | knownProperty | `css/syntax/gate.ts:19` | 0.70 | Structure | Replace the local body with a call to `knownProperty` from `css/syntax/gate.ts`. |
| matchesWhere | `entities/location/where.ts:90` | computedLocal | `css/resolve/path-answer.ts:54` | 0.74 | Structure | Replace the local body with a call to `computedLocal` from `css/resolve/path-answer.ts`. |
| matchesWhere | `entities/location/where.ts:90` | joinAnswer | `css/resolve/expression.ts:241` | 0.67 | Structure | Replace the local body with a call to `joinAnswer` from `css/resolve/expression.ts`. |
| kindOf | `entities/location/where.ts:113` | binaryAnswer | `css/resolve/expression.ts:90` | 0.68 | Structure | Replace the local body with a call to `binaryAnswer` from `css/resolve/expression.ts`. |
| kindOf | `entities/location/where.ts:113` | substituteText | `css/resolve/substitute.ts:84` | 0.66 | Structure | Replace the local body with a call to `substituteText` from `css/resolve/substitute.ts`. |
| entryKey | `entities/location/where.ts:194` | arithmeticTextOf | `css/resolve/theme-value.ts:183` | 0.67 | Structure | Replace the local body with a call to `arithmeticTextOf` from `css/resolve/theme-value.ts`. |
| archOf | `entities/location.ts:40` | stylesheetFacts | `css/index.ts:128` | 0.68 | Structure | Replace the local body with a call to `stylesheetFacts` from `css/index.ts`. |
| resolveOne | `entities/location.ts:89` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.73 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| resolveOne | `entities/location.ts:89` | namedAnswer | `css/resolve/path-answer.ts:76` | 0.72 | Structure | Replace the local body with a call to `namedAnswer` from `css/resolve/path-answer.ts`. |
| boxOfPlace | `entities/location.ts:109` | parentOf | `css/styled/document.ts:103` | 0.67 | Structure | Replace the local body with a call to `parentOf` from `css/styled/document.ts`. |
| scopeFacts | `entities/queries.ts:41` | collectReading | `css/resolve/resolve.ts:73` | 0.66 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| innerFilterOf | `entities/queries.ts:189` | joinAnswer | `css/resolve/expression.ts:241` | 0.74 | Structure | Replace the local body with a call to `joinAnswer` from `css/resolve/expression.ts`. |
| innerFilterOf | `entities/queries.ts:189` | mapAnswers | `css/resolve/expression.ts:212` | 0.73 | Structure | Replace the local body with a call to `mapAnswers` from `css/resolve/expression.ts`. |
| at | `entities/queries.ts:219` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.67 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| matchFilter | `entities/queries.ts:274` | knownProperty | `css/syntax/gate.ts:19` | 0.71 | Structure | Replace the local body with a call to `knownProperty` from `css/syntax/gate.ts`. |
| fromObject | `entities/repair.ts:44` | stylesheetFacts | `css/index.ts:128` | 0.68 | Structure | Replace the local body with a call to `stylesheetFacts` from `css/index.ts`. |
| fromObject | `entities/repair.ts:44` | dynamicMapAnswer | `css/resolve/expression.ts:190` | 0.68 | Structure | Replace the local body with a call to `dynamicMapAnswer` from `css/resolve/expression.ts`. |
| resolvePath | `entities/tree/build.ts:73` | mathFunctionNames | `css/core/syntax-check.ts:53` | 0.66 | Structure | Replace the local body with a call to `mathFunctionNames` from `css/core/syntax-check.ts`. |
| reportUndeclared | `entities/tree/entries.ts:97` | collectReading | `css/resolve/resolve.ts:73` | 0.77 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| reportUndeclared | `entities/tree/entries.ts:97` | collectFromLiteral | `css/core/scope.ts:120` | 0.69 | Structure | Replace the local body with a call to `collectFromLiteral` from `css/core/scope.ts`. |
| checkEntry | `entities/tree/entries.ts:109` | collectReading | `css/resolve/resolve.ts:73` | 0.69 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| checkEntry | `entities/tree/entries.ts:109` | materialiseResolution | `css/index.ts:76` | 0.68 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| checkTree | `entities/tree/entries.ts:118` | collectReading | `css/resolve/resolve.ts:73` | 0.74 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| checkTree | `entities/tree/entries.ts:118` | collectFromLiteral | `css/core/scope.ts:120` | 0.72 | Structure | Replace the local body with a call to `collectFromLiteral` from `css/core/scope.ts`. |
| isRealInstance | `entities/tree/match.ts:27` | initializerOf | `css/resolve/theme-value.ts:112` | 0.67 | Structure | Replace the local body with a call to `initializerOf` from `css/resolve/theme-value.ts`. |
| isRealInstance | `entities/tree/match.ts:27` | substituteText | `css/resolve/substitute.ts:84` | 0.66 | Structure | Replace the local body with a call to `substituteText` from `css/resolve/substitute.ts`. |
| present | `entities/tree/match.ts:40` | knownProperty | `css/syntax/gate.ts:19` | 0.65 | Structure | Replace the local body with a call to `knownProperty` from `css/syntax/gate.ts`. |
| allMatches | `entities/tree/match.ts:77` | selectorFacts | `css/styled/document.ts:74` | 0.66 | Structure | Replace the local body with a call to `selectorFacts` from `css/styled/document.ts`. |
| folderOwner | `entities/tree/match.ts:89` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.69 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| folderOwner | `entities/tree/match.ts:89` | spanOfNode | `css/core/syntax-check.ts:64` | 0.69 | Structure | Replace the local body with a call to `spanOfNode` from `css/core/syntax-check.ts`. |
| instanceAt | `entities/tree/match.ts:98` | referencesCalcSum | `css/core/syntax-check.ts:43` | 0.70 | Structure | Replace the local body with a call to `referencesCalcSum` from `css/core/syntax-check.ts`. |
| instanceAt | `entities/tree/match.ts:98` | providerValueOf | `css/resolve/theme-value.ts:242` | 0.66 | Structure | Replace the local body with a call to `providerValueOf` from `css/resolve/theme-value.ts`. |
| placeholderPositions | `entities/tree/match.ts:111` | variablesOf | `css/syntax/scss.ts:24` | 0.71 | Structure | Replace the local body with a call to `variablesOf` from `css/syntax/scss.ts`. |
| placeholderPositions | `entities/tree/match.ts:111` | mixinsOf | `css/syntax/scss.ts:39` | 0.71 | Structure | Replace the local body with a call to `mixinsOf` from `css/syntax/scss.ts`. |
| placeholderPositions#anon@120 | `entities/tree/match.ts:120` | materialiseResolution | `css/index.ts:76` | 0.71 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| placeholderPositions#anon@120 | `entities/tree/match.ts:120` | attachClassList | `css/styled/markup.ts:62` | 0.69 | Structure | Replace the local body with a call to `attachClassList` from `css/styled/markup.ts`. |

## Inside `frameworks` — utils folder duplicates (22)

| Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| aliasTargetOf | `frameworks/react/index.ts:157` | joinedText | `css/resolve/expression.ts:229` | 0.75 | Structure | Replace the local body with a call to `joinedText` from `css/resolve/expression.ts`. |
| aliasTargetOf | `frameworks/react/index.ts:157` | methodNameOf | `entities/ast/assignments-tagged.ts:162` | 0.80 | Structure | Replace the local body with a call to `methodNameOf` from `entities/ast/assignments-tagged.ts`. |
| aliasTargetOf | `frameworks/react/index.ts:157` | parentName | `entities/ast/functions.ts:37` | 0.78 | Structure | Replace the local body with a call to `parentName` from `entities/ast/functions.ts`. |
| facets | `frameworks/index.ts:36` | propertiesReader#anon@40 | `css/tailwind/tailwind.ts:40` | 0.68 | Structure | Replace the local body with a call to `propertiesReader#anon@40` from `css/tailwind/tailwind.ts`. |
| enrich | `frameworks/index.ts:55` | attachToCandidates | `css/index.ts:146` | 0.67 | Structure | Replace the local body with a call to `attachToCandidates` from `css/index.ts`. |
| enrich | `frameworks/index.ts:55` | attachClasses | `css/styled/markup.ts:73` | 0.66 | Structure | Replace the local body with a call to `attachClasses` from `css/styled/markup.ts`. |
| renderStartLine | `frameworks/react/index.ts:45` | renamedCall | `entities/kinds.ts:172` | 0.66 | Structure | Replace the local body with a call to `renamedCall` from `entities/kinds.ts`. |
| nearestFunction | `frameworks/react/index.ts:55` | rootNodeOf | `entities/ast/assignments-nodes.ts:35` | 0.66 | Structure | Replace the local body with a call to `rootNodeOf` from `entities/ast/assignments-nodes.ts`. |
| tagOf | `frameworks/react/index.ts:64` | rootNameOf | `entities/ast/assignments-nodes.ts:41` | 0.72 | Structure | Replace the local body with a call to `rootNameOf` from `entities/ast/assignments-nodes.ts`. |
| attributeValueText | `frameworks/react/index.ts:72` | parentName | `entities/ast/functions.ts:37` | 0.74 | Structure | Replace the local body with a call to `parentName` from `entities/ast/functions.ts`. |
| attributeValueText | `frameworks/react/index.ts:72` | boxOfPlace | `entities/location.ts:109` | 0.73 | Structure | Replace the local body with a call to `boxOfPlace` from `entities/location.ts`. |
| elementFacts | `frameworks/react/index.ts:79` | documentFacts | `css/styled/document.ts:257` | 0.69 | Structure | Replace the local body with a call to `documentFacts` from `css/styled/document.ts`. |
| elementFacts | `frameworks/react/index.ts:79` | templateLiteralSource | `css/styled/template.ts:26` | 0.68 | Structure | Replace the local body with a call to `templateLiteralSource` from `css/styled/template.ts`. |
| namesOfParameter | `frameworks/react/index.ts:98` | parentsOf | `entities/tree/build.ts:16` | 0.70 | Structure | Replace the local body with a call to `parentsOf` from `entities/tree/build.ts`. |
| aliasTargetOf | `frameworks/react/index.ts:157` | staticStringOf | `css/styled/markup.ts:28` | 0.75 | Structure | Replace the local body with a call to `staticStringOf` from `css/styled/markup.ts`. |
| aliasTargetOf | `frameworks/react/index.ts:157` | chainedValueOf | `css/resolve/theme-value.ts:154` | 0.72 | Structure | Replace the local body with a call to `chainedValueOf` from `css/resolve/theme-value.ts`. |
| elementsOf | `frameworks/react/index.ts:216` | assignmentsFact | `entities/ast/assignments.ts:87` | 0.71 | Structure | Replace the local body with a call to `assignmentsFact` from `entities/ast/assignments.ts`. |
| elementsOf | `frameworks/react/index.ts:216` | importsOf | `entities/ast/file-imports.ts:68` | 0.70 | Structure | Replace the local body with a call to `importsOf` from `entities/ast/file-imports.ts`. |
| elementsOf#anon@222 | `frameworks/react/index.ts:222` | exportsOf#anon@87 | `entities/ast/file-exports.ts:87` | 0.67 | Signature | Replace the local body with a call to `exportsOf#anon@87` from `entities/ast/file-exports.ts`. |
| elementsOf#anon@222 | `frameworks/react/index.ts:222` | importsOf#anon@81 | `entities/ast/file-imports.ts:81` | 0.67 | Signature | Replace the local body with a call to `importsOf#anon@81` from `entities/ast/file-imports.ts`. |
| enrich | `frameworks/react/index.ts:225` | attachCallDepth | `entities/ast/depth.ts:134` | 0.71 | Structure | Replace the local body with a call to `attachCallDepth` from `entities/ast/depth.ts`. |
| enrich | `frameworks/react/index.ts:225` | attachClasses | `css/styled/markup.ts:73` | 0.67 | Structure | Replace the local body with a call to `attachClasses` from `css/styled/markup.ts`. |

## Inside `code-roles` — utils folder duplicates (19)

| Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| classifyFile | `code-roles/project.ts:86` | read | `entities/ast/depth.ts:110` | 0.81 | Structure | Replace the local body with a call to `read` from `entities/ast/depth.ts`. |
| projectRoleIndex | `code-roles/project.ts:105` | scopeFromProject | `css/core/scope.ts:167` | 0.77 | Structure | Replace the local body with a call to `scopeFromProject` from `css/core/scope.ts`. |
| classifyRoles | `code-roles/classify.ts:32` | matchers | `entities/tree/index.ts:10` | 0.66 | Structure | Replace the local body with a call to `matchers` from `entities/tree/index.ts`. |
| roleAtTarget | `code-roles/connector.ts:43` | writeDeclFile | `entities/ast/assignments-tagged.ts:153` | 0.71 | Structure | Replace the local body with a call to `writeDeclFile` from `entities/ast/assignments-tagged.ts`. |
| roleOfTarget | `code-roles/connector.ts:54` | staticStringOf#anon@34 | `css/styled/markup.ts:34` | 0.66 | Structure | Replace the local body with a call to `staticStringOf#anon@34` from `css/styled/markup.ts`. |
| roleOfTarget | `code-roles/connector.ts:54` | patternOf | `entities/location/where.ts:48` | 0.66 | Structure | Replace the local body with a call to `patternOf` from `entities/location/where.ts`. |
| byName | `code-roles/connector.ts:62` | forwardedByAttributes | `frameworks/react/index.ts:118` | 0.68 | Structure | Replace the local body with a call to `forwardedByAttributes` from `frameworks/react/index.ts`. |
| byName | `code-roles/connector.ts:62` | nodesByPos | `entities/ast/comments.ts:56` | 0.66 | Structure | Replace the local body with a call to `nodesByPos` from `entities/ast/comments.ts`. |
| enrichWithRoles | `code-roles/connector.ts:110` | enrich | `frameworks/react/index.ts:225` | 0.73 | Structure | Replace the local body with a call to `enrich` from `frameworks/react/index.ts`. |
| enrichWithRoles | `code-roles/connector.ts:110` | candidatesIn | `entities/ast/depth.ts:107` | 0.72 | Structure | Replace the local body with a call to `candidatesIn` from `entities/ast/depth.ts`. |
| unwrapToLiteral | `code-roles/project.ts:39` | unwrap | `css/resolve/theme-value.ts:18` | 0.68 | Structure | Replace the local body with a call to `unwrap` from `css/resolve/theme-value.ts`. |
| addProvider | `code-roles/project.ts:60` | attachClassList | `css/styled/markup.ts:62` | 0.72 | Structure | Replace the local body with a call to `attachClassList` from `css/styled/markup.ts`. |
| addProvider | `code-roles/project.ts:60` | variablesOf#anon@26 | `css/syntax/scss.ts:26` | 0.71 | Structure | Replace the local body with a call to `variablesOf#anon@26` from `css/syntax/scss.ts`. |
| projectRoleIndex | `code-roles/project.ts:105` | collectReading | `css/resolve/resolve.ts:73` | 0.73 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| projectRoleIndex | `code-roles/project.ts:105` | materialiseResolution | `css/index.ts:76` | 0.69 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| normalizeScopeAccessor | `code-roles/roles.ts:61` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.67 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| normalizeScopeAccessor | `code-roles/roles.ts:61` | variableInitializer | `entities/ast/variables.ts:42` | 0.66 | Structure | Replace the local body with a call to `variableInitializer` from `entities/ast/variables.ts`. |
| checkDefs | `code-roles/roles.ts:134` | allMatches | `entities/tree/match.ts:77` | 0.67 | Structure | Replace the local body with a call to `allMatches` from `entities/tree/match.ts`. |
| checkDefs | `code-roles/roles.ts:134` | readsFact | `entities/ast/properties.ts:148` | 0.65 | Structure | Replace the local body with a call to `readsFact` from `entities/ast/properties.ts`. |

## Inside `invariants` — utils folder duplicates (54)

| Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| checkEntry | `invariants/index.ts:190` | collectProblems | `css/resolve/resolve.ts:57` | 0.80 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |
| namesResolution | `invariants/index.ts:225` | matchFilter | `entities/queries.ts:274` | 0.76 | Structure | Replace the local body with a call to `matchFilter` from `entities/queries.ts`. |
| codeRoleSlugs | `invariants/index.ts:236` | collectReading | `css/resolve/resolve.ts:73` | 0.82 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| codeRoleSlugs | `invariants/index.ts:236` | parseWhereEntry | `entities/location/where.ts:40` | 0.77 | Structure | Replace the local body with a call to `parseWhereEntry` from `entities/location/where.ts`. |
| deduped | `invariants/index.ts:42` | pathInNode | `entities/location.ts:48` | 0.72 | Structure | Replace the local body with a call to `pathInNode` from `entities/location.ts`. |
| deduped | `invariants/index.ts:42` | matchesNodeEntry | `entities/location/where.ts:83` | 0.72 | Structure | Replace the local body with a call to `matchesNodeEntry` from `entities/location/where.ts`. |
| locationEntryOf | `invariants/index.ts:51` | matchesLocation | `entities/location.ts:58` | 0.66 | Structure | Replace the local body with a call to `matchesLocation` from `entities/location.ts`. |
| locationEntryOf | `invariants/index.ts:51` | pathOf | `entities/location.ts:30` | 0.66 | Structure | Replace the local body with a call to `pathOf` from `entities/location.ts`. |
| fixLocationOf | `invariants/index.ts:60` | literalValueOf | `entities/ast/tree.ts:110` | 0.75 | Structure | Replace the local body with a call to `literalValueOf` from `entities/ast/tree.ts`. |
| fixLocationOf | `invariants/index.ts:60` | namedAnswer | `css/resolve/path-answer.ts:76` | 0.68 | Structure | Replace the local body with a call to `namedAnswer` from `css/resolve/path-answer.ts`. |
| resolvePlace | `invariants/index.ts:75` | pathAnswer | `css/resolve/path-answer.ts:86` | 0.71 | Structure | Replace the local body with a call to `pathAnswer` from `css/resolve/path-answer.ts`. |
| resolvePlace | `invariants/index.ts:75` | depthOf | `entities/ast/depth.ts:79` | 0.71 | Structure | Replace the local body with a call to `depthOf` from `entities/ast/depth.ts`. |
| violationsOf | `invariants/index.ts:92` | propertiesReader#anon@40 | `css/tailwind/tailwind.ts:40` | 0.67 | Structure | Replace the local body with a call to `propertiesReader#anon@40` from `css/tailwind/tailwind.ts`. |
| violationsOf | `invariants/index.ts:92` | enrich | `frameworks/react/index.ts:225` | 0.65 | Structure | Replace the local body with a call to `enrich` from `frameworks/react/index.ts`. |
| candidateVars | `invariants/index.ts:111` | statementExport | `entities/ast/file-exports.ts:31` | 0.72 | Structure | Replace the local body with a call to `statementExport` from `entities/ast/file-exports.ts`. |
| candidateVars | `invariants/index.ts:111` | descendantFact | `entities/ast/tree.ts:201` | 0.71 | Structure | Replace the local body with a call to `descendantFact` from `entities/ast/tree.ts`. |
| fileLevelVars | `invariants/index.ts:126` | statementImport | `entities/ast/file-imports.ts:20` | 0.74 | Structure | Replace the local body with a call to `statementImport` from `entities/ast/file-imports.ts`. |
| fileLevelVars | `invariants/index.ts:126` | statementExport | `entities/ast/file-exports.ts:31` | 0.71 | Structure | Replace the local body with a call to `statementExport` from `entities/ast/file-exports.ts`. |
| reportOf | `invariants/index.ts:143` | statementImport | `entities/ast/file-imports.ts:20` | 0.73 | Structure | Replace the local body with a call to `statementImport` from `entities/ast/file-imports.ts`. |
| reportOf | `invariants/index.ts:143` | assertionOf | `entities/ast/variables.ts:77` | 0.73 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| fileFinding | `invariants/index.ts:169` | collectFromLiteral | `css/core/scope.ts:120` | 0.65 | Structure | Replace the local body with a call to `collectFromLiteral` from `css/core/scope.ts`. |
| candidateFinding | `invariants/index.ts:178` | callFact | `css/core/values.ts:102` | 0.71 | Structure | Replace the local body with a call to `callFact` from `css/core/values.ts`. |
| candidateFinding | `invariants/index.ts:178` | materialiseResolution | `css/index.ts:76` | 0.70 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| checkEntry | `invariants/index.ts:190` | collectReading | `css/resolve/resolve.ts:73` | 0.75 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| checkEntry | `invariants/index.ts:190` | reportUndeclared | `entities/tree/entries.ts:97` | 0.73 | Structure | Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`. |
| namesResolution | `invariants/index.ts:225` | instanceAt | `entities/tree/match.ts:98` | 0.75 | Structure | Replace the local body with a call to `instanceAt` from `entities/tree/match.ts`. |
| namesResolution | `invariants/index.ts:225` | inRepo | `entities/ast/resolve.ts:198` | 0.72 | Structure | Replace the local body with a call to `inRepo` from `entities/ast/resolve.ts`. |
| codeRoleSlugs | `invariants/index.ts:236` | materialiseResolution | `css/index.ts:76` | 0.65 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| invariantProviderSlugs | `invariants/index.ts:255` | literalClaims | `entities/tree/build.ts:165` | 0.75 | Structure | Replace the local body with a call to `literalClaims` from `entities/tree/build.ts`. |
| invariantProviderSlugs | `invariants/index.ts:255` | forwardedByAttributes | `frameworks/react/index.ts:118` | 0.68 | Structure | Replace the local body with a call to `forwardedByAttributes` from `frameworks/react/index.ts`. |
| templatesOf | `invariants/index.ts:264` | [RELATION.DECLARE] | `entities/kinds.ts:225` | 0.67 | Structure | Replace the local body with a call to `[RELATION.DECLARE]` from `entities/kinds.ts`. |
| checkInvariant | `invariants/index.ts:281` | collectReading | `css/resolve/resolve.ts:73` | 0.82 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| checkInvariant | `invariants/index.ts:281` | materialiseResolution | `css/index.ts:76` | 0.70 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| narrowingOf | `invariants/list-vars.ts:16` | argumentFact | `entities/ast/calls.ts:64` | 0.68 | Structure | Replace the local body with a call to `argumentFact` from `entities/ast/calls.ts`. |
| narrowingOf | `invariants/list-vars.ts:16` | parentOf | `css/styled/document.ts:103` | 0.68 | Structure | Replace the local body with a call to `parentOf` from `css/styled/document.ts`. |
| itemWord | `invariants/list-vars.ts:43` | scopeFacts | `entities/queries.ts:41` | 0.69 | Structure | Replace the local body with a call to `scopeFacts` from `entities/queries.ts`. |
| numericSpan | `invariants/list-vars.ts:51` | leadingCommentOf | `css/styled/template.ts:64` | 0.65 | Structure | Replace the local body with a call to `leadingCommentOf` from `css/styled/template.ts`. |
| spanOfItem | `invariants/list-vars.ts:63` | deleteWrite | `entities/ast/assignments-raw.ts:30` | 0.68 | Structure | Replace the local body with a call to `deleteWrite` from `entities/ast/assignments-raw.ts`. |
| spanOfItem | `invariants/list-vars.ts:63` | literalValueOf | `entities/ast/tree.ts:110` | 0.66 | Structure | Replace the local body with a call to `literalValueOf` from `entities/ast/tree.ts`. |
| spanVars | `invariants/list-vars.ts:77` | assignPrimary | `entities/tree/build.ts:113` | 0.66 | Structure | Replace the local body with a call to `assignPrimary` from `entities/tree/build.ts`. |
| compositionBranches | `invariants/list-vars.ts:116` | arithmeticValues#anon@81#anon@82 | `css/resolve/answers.ts:82` | 0.68 | Structure | Replace the local body with a call to `arithmeticValues#anon@81#anon@82` from `css/resolve/answers.ts`. |
| listFactVars | `invariants/list-vars.ts:122` | enrich | `frameworks/react/index.ts:225` | 0.65 | Structure | Replace the local body with a call to `enrich` from `frameworks/react/index.ts`. |
| fileVars | `invariants/name.ts:13` | exportFromEdges#anon@150 | `entities/kinds.ts:150` | 0.66 | Structure | Replace the local body with a call to `exportFromEdges#anon@150` from `entities/kinds.ts`. |
| normalizeInvariant | `invariants/normalize.ts:52` | parseWhereEntry | `entities/location/where.ts:40` | 0.67 | Structure | Replace the local body with a call to `parseWhereEntry` from `entities/location/where.ts`. |
| scalarVarsOf | `invariants/vars.ts:27` | placeholderPositions#anon@120 | `entities/tree/match.ts:120` | 0.68 | Structure | Replace the local body with a call to `placeholderPositions#anon@120` from `entities/tree/match.ts`. |
| scalarVarsOf | `invariants/vars.ts:27` | attachClassList | `css/styled/markup.ts:62` | 0.68 | Structure | Replace the local body with a call to `attachClassList` from `css/styled/markup.ts`. |
| listHit | `invariants/vars.ts:53` | callsFact | `entities/ast/calls.ts:135` | 0.66 | Structure | Replace the local body with a call to `callsFact` from `entities/ast/calls.ts`. |
| scalarEntry | `invariants/vars.ts:62` | materialiseResolution | `css/index.ts:76` | 0.73 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| scalarEntry | `invariants/vars.ts:62` | reportUndeclared | `entities/tree/entries.ts:97` | 0.71 | Structure | Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`. |
| collectScalars | `invariants/vars.ts:79` | declaredFileOfExpr | `entities/ast/resolve.ts:283` | 0.68 | Structure | Replace the local body with a call to `declaredFileOfExpr` from `entities/ast/resolve.ts`. |
| listVar | `invariants/vars.ts:91` | collectReading | `css/resolve/resolve.ts:73` | 0.70 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| listVar | `invariants/vars.ts:91` | scopeFromProject | `css/core/scope.ts:167` | 0.66 | Structure | Replace the local body with a call to `scopeFromProject` from `css/core/scope.ts`. |
| branchOf | `invariants/vars.ts:101` | scopeFacts | `entities/queries.ts:41` | 0.73 | Structure | Replace the local body with a call to `scopeFacts` from `entities/queries.ts`. |
| branchOf | `invariants/vars.ts:101` | readerFor | `css/resolve/theme-value.ts:233` | 0.69 | Structure | Replace the local body with a call to `readerFor` from `css/resolve/theme-value.ts`. |

## Inside `report` — utils folder duplicates (209)

| Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| highlightOf | `report/user-report/data/findings.ts:175` | assertionOf | `entities/ast/variables.ts:77` | 0.84 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| keyFilters | `report/user-report/data/role-filters.ts:43` | collectReading | `css/resolve/resolve.ts:73` | 0.82 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| walkEntry | `report/user-report/shared/describe.ts:50` | collectReading | `css/resolve/resolve.ts:73` | 0.82 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| choose | `report/errorTypes/codes/structure.ts:74` | relationOf | `entities/ast/assignments.ts:49` | 0.67 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| choose | `report/errorTypes/codes/structure.ts:74` | labelOf | `entities/location/where.ts:128` | 0.67 | Structure | Replace the local body with a call to `labelOf` from `entities/location/where.ts`. |
| scoreCandidate | `report/errorTypes/destinations.ts:100` | indexedAnswer | `css/resolve/path-answer.ts:33` | 0.74 | Structure | Replace the local body with a call to `indexedAnswer` from `css/resolve/path-answer.ts`. |
| scoreCandidate | `report/errorTypes/destinations.ts:100` | freezeWrite | `entities/ast/assignments-raw.ts:41` | 0.73 | Structure | Replace the local body with a call to `freezeWrite` from `entities/ast/assignments-raw.ts`. |
| candidateDecision | `report/errorTypes/destinations.ts:139` | nextDeclOf | `entities/ast/resolve.ts:65` | 0.68 | Structure | Replace the local body with a call to `nextDeclOf` from `entities/ast/resolve.ts`. |
| candidateDecision | `report/errorTypes/destinations.ts:139` | variableInitializer | `entities/ast/variables.ts:42` | 0.67 | Structure | Replace the local body with a call to `variableInitializer` from `entities/ast/variables.ts`. |
| renderToken | `report/errorTypes/index.ts:20` | attributeValueText | `frameworks/react/index.ts:72` | 0.66 | Structure | Replace the local body with a call to `attributeValueText` from `frameworks/react/index.ts`. |
| classify#anon@17 | `report/errorTypes/types/unknownRole.ts:17` | forwardedByAttributes#anon@121 | `frameworks/react/index.ts:121` | 0.66 | Control flow | Replace the local body with a call to `forwardedByAttributes#anon@121` from `frameworks/react/index.ts`. |
| fallbackMessage | `report/errorTypes/types/wrongAction.ts:66` | parentOf | `css/styled/document.ts:103` | 0.72 | Structure | Replace the local body with a call to `parentOf` from `css/styled/document.ts`. |
| fallbackMessage | `report/errorTypes/types/wrongAction.ts:66` | rolesAtPath | `entities/location/homes.ts:162` | 0.67 | Structure | Replace the local body with a call to `rolesAtPath` from `entities/location/homes.ts`. |
| moveFixes | `report/errorTypes/types/wrongAction.ts:79` | exportFromEdges | `entities/kinds.ts:149` | 0.73 | Structure | Replace the local body with a call to `exportFromEdges` from `entities/kinds.ts`. |
| moveFixes | `report/errorTypes/types/wrongAction.ts:79` | readsOf | `entities/kinds.ts:85` | 0.71 | Structure | Replace the local body with a call to `readsOf` from `entities/kinds.ts`. |
| fixes | `report/errorTypes/types/wrongAction.ts:101` | statementExport | `entities/ast/file-exports.ts:31` | 0.67 | Structure | Replace the local body with a call to `statementExport` from `entities/ast/file-exports.ts`. |
| tokenStory | `report/errorTypes/types/wrongAction.ts:121` | mismatchSpan | `css/core/syntax-check.ts:93` | 0.68 | Structure | Replace the local body with a call to `mismatchSpan` from `css/core/syntax-check.ts`. |
| tokenStory | `report/errorTypes/types/wrongAction.ts:121` | numericReading | `css/resolve/answers.ts:69` | 0.68 | Structure | Replace the local body with a call to `numericReading` from `css/resolve/answers.ts`. |
| classify | `report/errorTypes/types/wrongPlacement.ts:19` | fromObject | `entities/repair.ts:44` | 0.74 | Structure | Replace the local body with a call to `fromObject` from `entities/repair.ts`. |
| classify | `report/errorTypes/types/wrongPlacement.ts:19` | argumentFact | `entities/ast/calls.ts:64` | 0.74 | Structure | Replace the local body with a call to `argumentFact` from `entities/ast/calls.ts`. |
| fixes | `report/errorTypes/types/wrongPlacement.ts:47` | destinationsIn | `entities/location/homes.ts:83` | 0.68 | Structure | Replace the local body with a call to `destinationsIn` from `entities/location/homes.ts`. |
| exportText | `report/errorTypes/vocabulary/phrases.ts:49` | propertiesReader | `css/tailwind/tailwind.ts:36` | 0.66 | Structure | Replace the local body with a call to `propertiesReader` from `css/tailwind/tailwind.ts`. |
| exportText | `report/errorTypes/vocabulary/phrases.ts:49` | labelOf | `entities/location/where.ts:128` | 0.66 | Structure | Replace the local body with a call to `labelOf` from `entities/location/where.ts`. |
| factText | `report/errorTypes/vocabulary/phrases.ts:105` | relationOf | `entities/ast/assignments.ts:49` | 0.69 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| factText | `report/errorTypes/vocabulary/phrases.ts:105` | labelOf | `entities/location/where.ts:128` | 0.69 | Structure | Replace the local body with a call to `labelOf` from `entities/location/where.ts`. |
| rolesSuffix | `report/errorTypes/vocabulary/phrases.ts:119` | writePath | `entities/kinds.ts:106` | 0.72 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| rolesSuffix | `report/errorTypes/vocabulary/phrases.ts:119` | extractScript#anon@67 | `entities/ast/project.ts:67` | 0.66 | Structure | Replace the local body with a call to `extractScript#anon@67` from `entities/ast/project.ts`. |
| subjectText | `report/errorTypes/vocabulary/phrases.ts:124` | relationOf | `entities/ast/assignments.ts:49` | 0.68 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| make | `report/errorTypes/vocabulary/places.ts:14` | taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | 0.73 | Structure | Replace the local body with a call to `taggedWriteOf` from `entities/ast/assignments-tagged.ts`. |
| make | `report/errorTypes/vocabulary/places.ts:14` | assertionOf | `entities/ast/variables.ts:77` | 0.71 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| folderOf | `report/errorTypes/vocabulary/places.ts:15` | extractScript#anon@67 | `entities/ast/project.ts:67` | 0.76 | Structure | Replace the local body with a call to `extractScript#anon@67` from `entities/ast/project.ts`. |
| folderOf | `report/errorTypes/vocabulary/places.ts:15` | boxOfPlace | `entities/location.ts:109` | 0.72 | Structure | Replace the local body with a call to `boxOfPlace` from `entities/location.ts`. |
| fixTextOf | `report/finding-from.ts:21` | pathOf | `entities/location.ts:30` | 0.75 | Structure | Replace the local body with a call to `pathOf` from `entities/location.ts`. |
| fixTextOf | `report/finding-from.ts:21` | nodeText | `entities/ast/tree.ts:51` | 0.74 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| specOf | `report/finding-from.ts:36` | fixLocationOf | `invariants/index.ts:60` | 0.67 | Structure | Replace the local body with a call to `fixLocationOf` from `invariants/index.ts`. |
| highlightOf | `report/finding-from.ts:83` | assertionOf | `entities/ast/variables.ts:77` | 0.73 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| highlightOf | `report/finding-from.ts:83` | variableInitializer | `entities/ast/variables.ts:42` | 0.71 | Structure | Replace the local body with a call to `variableInitializer` from `entities/ast/variables.ts`. |
| notice | `report/notices.ts:15` | mathFunctionNames | `css/core/syntax-check.ts:53` | 0.67 | Structure | Replace the local body with a call to `mathFunctionNames` from `css/core/syntax-check.ts`. |
| isToken | `report/render-report.ts:34` | isScopeRecord | `entities/location.ts:39` | 0.69 | AST | Replace the local body with a call to `isScopeRecord` from `entities/location.ts`. |
| isToken | `report/render-report.ts:34` | isScopeRecord | `entities/queries.ts:31` | 0.69 | AST | Replace the local body with a call to `isScopeRecord` from `entities/queries.ts`. |
| renderFinding | `report/render-report.ts:57` | parentOf | `css/styled/document.ts:103` | 0.69 | Structure | Replace the local body with a call to `parentOf` from `css/styled/document.ts`. |
| byPiece | `report/render-report.ts:90` | destinationsIn#anon@99 | `entities/location/homes.ts:99` | 0.70 | AST | Replace the local body with a call to `destinationsIn#anon@99` from `entities/location/homes.ts`. |
| orphanLines | `report/render-report.ts:110` | rolesAtPath | `entities/location/homes.ts:162` | 0.73 | Structure | Replace the local body with a call to `rolesAtPath` from `entities/location/homes.ts`. |
| orphanLines | `report/render-report.ts:110` | homeForRole | `entities/location/homes.ts:176` | 0.66 | Structure | Replace the local body with a call to `homeForRole` from `entities/location/homes.ts`. |
| invariantLines | `report/render-report.ts:118` | rolesAtPath | `entities/location/homes.ts:162` | 0.73 | Structure | Replace the local body with a call to `rolesAtPath` from `entities/location/homes.ts`. |
| invariantLines | `report/render-report.ts:118` | propertiesReader#anon@40 | `css/tailwind/tailwind.ts:40` | 0.70 | Structure | Replace the local body with a call to `propertiesReader#anon@40` from `css/tailwind/tailwind.ts`. |
| renderNotices | `report/render-report.ts:145` | extractScript#anon@67 | `entities/ast/project.ts:67` | 0.66 | Structure | Replace the local body with a call to `extractScript#anon@67` from `entities/ast/project.ts`. |
| collectOverviewData | `report/user-report/data/collect.ts:18` | taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | 0.66 | Structure | Replace the local body with a call to `taggedWriteOf` from `entities/ast/assignments-tagged.ts`. |
| collectOverviewData | `report/user-report/data/collect.ts:18` | collectFileFacts | `entities/ast/file-facts.ts:28` | 0.66 | Structure | Replace the local body with a call to `collectFileFacts` from `entities/ast/file-facts.ts`. |
| buildFileTree | `report/user-report/data/file-tree.ts:50` | callbackAnswer | `css/resolve/expression.ts:168` | 0.67 | Structure | Replace the local body with a call to `callbackAnswer` from `css/resolve/expression.ts`. |
| ensureDir | `report/user-report/data/file-tree.ts:61` | propertiesReader#anon@40 | `css/tailwind/tailwind.ts:40` | 0.76 | Structure | Replace the local body with a call to `propertiesReader#anon@40` from `css/tailwind/tailwind.ts`. |
| ensureDir | `report/user-report/data/file-tree.ts:61` | scopeFromProject | `css/core/scope.ts:167` | 0.74 | Structure | Replace the local body with a call to `scopeFromProject` from `css/core/scope.ts`. |
| boundaryDetail | `report/user-report/data/finding-boundary.ts:11` | variableInitializer | `entities/ast/variables.ts:42` | 0.74 | Structure | Replace the local body with a call to `variableInitializer` from `entities/ast/variables.ts`. |
| boundaryDetail | `report/user-report/data/finding-boundary.ts:11` | initializerFact | `entities/ast/tree.ts:346` | 0.74 | Structure | Replace the local body with a call to `initializerFact` from `entities/ast/tree.ts`. |
| placeOf | `report/user-report/data/finding-plan.ts:25` | initializerFact | `entities/ast/tree.ts:346` | 0.73 | Structure | Replace the local body with a call to `initializerFact` from `entities/ast/tree.ts`. |
| placeOf | `report/user-report/data/finding-plan.ts:25` | variableInitializer | `entities/ast/variables.ts:42` | 0.73 | Structure | Replace the local body with a call to `variableInitializer` from `entities/ast/variables.ts`. |
| buildPlan | `report/user-report/data/finding-plan.ts:31` | structureFactsFor | `entities/tree/entries.ts:60` | 0.65 | Structure | Replace the local body with a call to `structureFactsFor` from `entities/tree/entries.ts`. |
| firstSentence | `report/user-report/data/finding-title.ts:15` | nodeText | `entities/ast/tree.ts:51` | 0.72 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| firstSentence | `report/user-report/data/finding-title.ts:15` | writePath | `entities/kinds.ts:106` | 0.70 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| withRelation | `report/user-report/data/findings.ts:37` | spanOfNode | `css/core/syntax-check.ts:64` | 0.66 | Structure | Replace the local body with a call to `spanOfNode` from `css/core/syntax-check.ts`. |
| withAfter | `report/user-report/data/findings.ts:56` | readerFor | `css/resolve/theme-value.ts:233` | 0.71 | Structure | Replace the local body with a call to `readerFor` from `css/resolve/theme-value.ts`. |
| withAfter | `report/user-report/data/findings.ts:56` | branchOf | `invariants/vars.ts:101` | 0.69 | Structure | Replace the local body with a call to `branchOf` from `invariants/vars.ts`. |
| withRepair | `report/user-report/data/findings.ts:67` | resolvePlace | `invariants/index.ts:75` | 0.68 | Structure | Replace the local body with a call to `resolvePlace` from `invariants/index.ts`. |
| withRepair | `report/user-report/data/findings.ts:67` | scopeFacts | `entities/queries.ts:41` | 0.68 | Structure | Replace the local body with a call to `scopeFacts` from `entities/queries.ts`. |
| destinationOf | `report/user-report/data/findings.ts:84` | folderOwner | `entities/tree/match.ts:89` | 0.72 | Structure | Replace the local body with a call to `folderOwner` from `entities/tree/match.ts`. |
| destinationOf | `report/user-report/data/findings.ts:84` | viaConstraint | `entities/ast/resolve.ts:121` | 0.71 | Structure | Replace the local body with a call to `viaConstraint` from `entities/ast/resolve.ts`. |
| enrichOne | `report/user-report/data/findings.ts:133` | leafOf | `entities/location/place.ts:40` | 0.72 | Structure | Replace the local body with a call to `leafOf` from `entities/location/place.ts`. |
| enrichOne | `report/user-report/data/findings.ts:133` | reportUndeclared | `entities/tree/entries.ts:97` | 0.72 | Structure | Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`. |
| highlightOf | `report/user-report/data/findings.ts:175` | mapAnswers | `css/resolve/expression.ts:212` | 0.73 | Structure | Replace the local body with a call to `mapAnswers` from `css/resolve/expression.ts`. |
| highlightOf | `report/user-report/data/findings.ts:175` | variableInitializer | `entities/ast/variables.ts:42` | 0.73 | Structure | Replace the local body with a call to `variableInitializer` from `entities/ast/variables.ts`. |
| enrichFindings | `report/user-report/data/findings.ts:186` | checkReferences | `code-roles/roles.ts:118` | 0.70 | Structure | Replace the local body with a call to `checkReferences` from `code-roles/roles.ts`. |
| enrichFindings | `report/user-report/data/findings.ts:186` | assignmentsFact | `entities/ast/assignments.ts:87` | 0.66 | Structure | Replace the local body with a call to `assignmentsFact` from `entities/ast/assignments.ts`. |
| enrichFindings#anon@191 | `report/user-report/data/findings.ts:191` | destinationsIn#anon@99 | `entities/location/homes.ts:99` | 0.69 | AST | Replace the local body with a call to `destinationsIn#anon@99` from `entities/location/homes.ts`. |
| edgeOf | `report/user-report/data/graph-edges.ts:31` | mergeWrite | `entities/ast/assignments.ts:66` | 0.67 | Structure | Replace the local body with a call to `mergeWrite` from `entities/ast/assignments.ts`. |
| noteUnplaceable | `report/user-report/data/graph-edges.ts:58` | listVar | `invariants/vars.ts:91` | 0.72 | Structure | Replace the local body with a call to `listVar` from `invariants/vars.ts`. |
| noteUnplaceable | `report/user-report/data/graph-edges.ts:58` | callFact | `css/core/values.ts:102` | 0.65 | Structure | Replace the local body with a call to `callFact` from `css/core/values.ts`. |
| actionEdges | `report/user-report/data/graph-edges.ts:82` | ancestorsOf | `entities/ast/tree.ts:335` | 0.66 | Structure | Replace the local body with a call to `ancestorsOf` from `entities/ast/tree.ts`. |
| actionEdges | `report/user-report/data/graph-edges.ts:82` | checkDefs | `code-roles/roles.ts:134` | 0.66 | Structure | Replace the local body with a call to `checkDefs` from `code-roles/roles.ts`. |
| dirsAgree | `report/user-report/data/graph-helpers.ts:21` | instanceAt | `entities/tree/match.ts:98` | 0.72 | Structure | Replace the local body with a call to `instanceAt` from `entities/tree/match.ts`. |
| dirsAgree | `report/user-report/data/graph-helpers.ts:21` | deduped | `invariants/index.ts:42` | 0.65 | Structure | Replace the local body with a call to `deduped` from `invariants/index.ts`. |
| actionKinds | `report/user-report/data/graph-helpers.ts:35` | invariantProviderSlugs | `invariants/index.ts:255` | 0.71 | Structure | Replace the local body with a call to `invariantProviderSlugs` from `invariants/index.ts`. |
| actionKinds | `report/user-report/data/graph-helpers.ts:35` | declaredActions | `entities/kinds.ts:238` | 0.66 | Structure | Replace the local body with a call to `declaredActions` from `entities/kinds.ts`. |
| homesOf | `report/user-report/data/graph-helpers.ts:50` | allMatches | `entities/tree/match.ts:77` | 0.66 | Structure | Replace the local body with a call to `allMatches` from `entities/tree/match.ts`. |
| homesOf | `report/user-report/data/graph-helpers.ts:50` | collectMutations | `entities/ast/assignments-raw.ts:74` | 0.66 | Structure | Replace the local body with a call to `collectMutations` from `entities/ast/assignments-raw.ts`. |
| actionRoleEdges | `report/user-report/data/graph-roles.ts:52` | selectorFacts | `css/styled/document.ts:74` | 0.68 | Structure | Replace the local body with a call to `selectorFacts` from `css/styled/document.ts`. |
| actionRoleEdges | `report/user-report/data/graph-roles.ts:52` | readsFact | `entities/ast/properties.ts:148` | 0.67 | Structure | Replace the local body with a call to `readsFact` from `entities/ast/properties.ts`. |
| buildAccessGraph | `report/user-report/data/graph.ts:84` | declarationFact | `css/styled/document.ts:212` | 0.74 | Structure | Replace the local body with a call to `declarationFact` from `css/styled/document.ts`. |
| buildAccessGraph | `report/user-report/data/graph.ts:84` | documentFacts | `css/styled/document.ts:257` | 0.74 | Structure | Replace the local body with a call to `documentFacts` from `css/styled/document.ts`. |
| reportMessage | `report/user-report/data/invariants.ts:23` | pathOf | `entities/location.ts:30` | 0.75 | Structure | Replace the local body with a call to `pathOf` from `entities/location.ts`. |
| reportMessage | `report/user-report/data/invariants.ts:23` | reportOf | `invariants/index.ts:143` | 0.73 | Structure | Replace the local body with a call to `reportOf` from `invariants/index.ts`. |
| summarizeRule | `report/user-report/data/invariants.ts:31` | rootContext | `entities/ast/assignments-tagged.ts:141` | 0.65 | Structure | Replace the local body with a call to `rootContext` from `entities/ast/assignments-tagged.ts`. |
| rawList | `report/user-report/data/nodes.ts:21` | listOf | `entities/tree/build.ts:58` | 0.68 | Control flow | Replace the local body with a call to `listOf` from `entities/tree/build.ts`. |
| childName | `report/user-report/data/nodes.ts:23` | nodeText | `entities/ast/tree.ts:51` | 0.75 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| childName | `report/user-report/data/nodes.ts:23` | pathOf | `entities/location.ts:30` | 0.68 | Structure | Replace the local body with a call to `pathOf` from `entities/location.ts`. |
| fileLanding | `report/user-report/data/nodes.ts:33` | byName | `code-roles/connector.ts:62` | 0.67 | Structure | Replace the local body with a call to `byName` from `code-roles/connector.ts`. |
| fileLanding | `report/user-report/data/nodes.ts:33` | importNameModules | `entities/ast/resolve.ts:298` | 0.66 | Structure | Replace the local body with a call to `importNameModules` from `entities/ast/resolve.ts`. |
| reportText | `report/user-report/data/nodes.ts:47` | nodeText | `entities/ast/tree.ts:51` | 0.74 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| reportText | `report/user-report/data/nodes.ts:47` | pathOf | `entities/location.ts:30` | 0.74 | Structure | Replace the local body with a call to `pathOf` from `entities/location.ts`. |
| nodeSummary | `report/user-report/data/nodes.ts:53` | roleOf | `code-roles/roles.ts:169` | 0.67 | Structure | Replace the local body with a call to `roleOf` from `code-roles/roles.ts`. |
| rolesOfNode#anon@71#anon@71 | `report/user-report/data/nodes.ts:71` | addHome#anon@128 | `entities/tree/build.ts:128` | 0.65 | Signature | Replace the local body with a call to `addHome#anon@128` from `entities/tree/build.ts`. |
| buildNodes#anon@78 | `report/user-report/data/nodes.ts:78` | statementImport | `entities/ast/file-imports.ts:20` | 0.70 | Structure | Replace the local body with a call to `statementImport` from `entities/ast/file-imports.ts`. |
| buildNodes#anon@78 | `report/user-report/data/nodes.ts:78` | normalizeScope | `css/core/scope-types.ts:44` | 0.66 | Structure | Replace the local body with a call to `normalizeScope` from `css/core/scope-types.ts`. |
| capped#anon@66 | `report/user-report/data/role-examples.ts:66` | elementsOf#anon@222 | `frameworks/react/index.ts:222` | 0.67 | Signature | Replace the local body with a call to `elementsOf#anon@222` from `frameworks/react/index.ts`. |
| capped#anon@66 | `report/user-report/data/role-examples.ts:66` | exportsOf#anon@87 | `entities/ast/file-exports.ts:87` | 0.67 | Signature | Replace the local body with a call to `exportsOf#anon@87` from `entities/ast/file-exports.ts`. |
| keyFilters | `report/user-report/data/role-filters.ts:43` | collectScalars | `invariants/vars.ts:79` | 0.71 | Structure | Replace the local body with a call to `collectScalars` from `invariants/vars.ts`. |
| keyFilters | `report/user-report/data/role-filters.ts:43` | checkInvariant | `invariants/index.ts:281` | 0.71 | Structure | Replace the local body with a call to `checkInvariant` from `invariants/index.ts`. |
| listFiltersOf | `report/user-report/data/role-filters.ts:63` | violationsOf | `invariants/index.ts:92` | 0.74 | Structure | Replace the local body with a call to `violationsOf` from `invariants/index.ts`. |
| listFiltersOf | `report/user-report/data/role-filters.ts:63` | readerFor | `css/resolve/theme-value.ts:233` | 0.74 | Structure | Replace the local body with a call to `readerFor` from `css/resolve/theme-value.ts`. |
| isPlaceFilter | `report/user-report/data/role-filters.ts:79` | isWholeRead | `entities/ast/properties.ts:113` | 0.69 | Structure | Replace the local body with a call to `isWholeRead` from `entities/ast/properties.ts`. |
| deepestFilters#anon@89#anon@89 | `report/user-report/data/role-filters.ts:89` | applyClaimsToSharers#anon@192 | `entities/tree/build.ts:192` | 0.69 | Structure | Replace the local body with a call to `applyClaimsToSharers#anon@192` from `entities/tree/build.ts`. |
| rangePush#anon@17 | `report/user-report/data/role-marks.ts:17` | callFact | `css/core/values.ts:102` | 0.65 | Structure | Replace the local body with a call to `callFact` from `css/core/values.ts`. |
| declarationMark | `report/user-report/data/role-marks.ts:24` | candidateFinding | `invariants/index.ts:178` | 0.70 | Structure | Replace the local body with a call to `candidateFinding` from `invariants/index.ts`. |
| hitMark | `report/user-report/data/role-marks.ts:42` | reportUndeclared | `entities/tree/entries.ts:97` | 0.70 | Structure | Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`. |
| demandMarks | `report/user-report/data/role-marks.ts:56` | materialiseResolution | `css/index.ts:76` | 0.74 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| demandMarks | `report/user-report/data/role-marks.ts:56` | checkTree | `entities/tree/entries.ts:118` | 0.73 | Structure | Replace the local body with a call to `checkTree` from `entities/tree/entries.ts`. |
| matchedRanges | `report/user-report/data/role-marks.ts:67` | readsFact | `entities/ast/properties.ts:148` | 0.72 | Structure | Replace the local body with a call to `readsFact` from `entities/ast/properties.ts`. |
| matchedRanges | `report/user-report/data/role-marks.ts:67` | returnsFact | `entities/ast/functions.ts:60` | 0.72 | Structure | Replace the local body with a call to `returnsFact` from `entities/ast/functions.ts`. |
| rawRoles | `report/user-report/data/roles.ts:19` | byName | `code-roles/connector.ts:62` | 0.68 | Structure | Replace the local body with a call to `byName` from `code-roles/connector.ts`. |
| rawRoles | `report/user-report/data/roles.ts:19` | nodesByPos | `entities/ast/comments.ts:56` | 0.66 | Structure | Replace the local body with a call to `nodesByPos` from `entities/ast/comments.ts`. |
| roleSummary | `report/user-report/data/roles.ts:71` | make | `entities/tree/build.ts:32` | 0.68 | Structure | Replace the local body with a call to `make` from `entities/tree/build.ts`. |
| buildRoles | `report/user-report/data/roles.ts:88` | checkReferences | `code-roles/roles.ts:118` | 0.66 | Structure | Replace the local body with a call to `checkReferences` from `code-roles/roles.ts`. |
| readText | `report/user-report/data/scan.ts:20` | resolveTail | `entities/location/where.ts:144` | 0.72 | Structure | Replace the local body with a call to `resolveTail` from `entities/location/where.ts`. |
| walkAt | `report/user-report/shared/describe.ts:37` | collectProblems | `css/resolve/resolve.ts:57` | 0.71 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |
| walkAt | `report/user-report/shared/describe.ts:37` | checkEntry | `invariants/index.ts:190` | 0.70 | Structure | Replace the local body with a call to `checkEntry` from `invariants/index.ts`. |
| walkEntry | `report/user-report/shared/describe.ts:50` | kindOf | `entities/location/where.ts:113` | 0.72 | Structure | Replace the local body with a call to `kindOf` from `entities/location/where.ts`. |
| walkEntry | `report/user-report/shared/describe.ts:50` | reportUndeclared | `entities/tree/entries.ts:97` | 0.71 | Structure | Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`. |
| walkRecord | `report/user-report/shared/describe.ts:72` | scalarVarsOf | `invariants/vars.ts:27` | 0.74 | Structure | Replace the local body with a call to `scalarVarsOf` from `invariants/vars.ts`. |
| walkRecord | `report/user-report/shared/describe.ts:72` | collectScalars | `invariants/vars.ts:79` | 0.72 | Structure | Replace the local body with a call to `collectScalars` from `invariants/vars.ts`. |
| walk | `report/user-report/shared/describe.ts:83` | collectScalars | `invariants/vars.ts:79` | 0.65 | Structure | Replace the local body with a call to `collectScalars` from `invariants/vars.ts`. |
| exampleValues | `report/user-report/src/components/RoleDetail.tsx:19` | statementImport | `entities/ast/file-imports.ts:20` | 0.71 | Structure | Replace the local body with a call to `statementImport` from `entities/ast/file-imports.ts`. |
| exampleValues | `report/user-report/src/components/RoleDetail.tsx:19` | statementExport | `entities/ast/file-exports.ts:31` | 0.69 | Structure | Replace the local body with a call to `statementExport` from `entities/ast/file-exports.ts`. |
| homeValues | `report/user-report/src/components/RoleDetail.tsx:27` | statementImport | `entities/ast/file-imports.ts:20` | 0.68 | Structure | Replace the local body with a call to `statementImport` from `entities/ast/file-imports.ts`. |
| homeValues | `report/user-report/src/components/RoleDetail.tsx:27` | actionSpecOf | `code-roles/roles.ts:147` | 0.65 | Structure | Replace the local body with a call to `actionSpecOf` from `code-roles/roles.ts`. |
| fit | `report/user-report/src/components/access-graph/NodeBox.tsx:15` | exportWhat | `entities/kinds.ts:132` | 0.67 | Structure | Replace the local body with a call to `exportWhat` from `entities/kinds.ts`. |
| tooltipOf | `report/user-report/src/components/access-graph/NodeBox.tsx:60` | patternOf | `entities/location/where.ts:48` | 0.68 | Structure | Replace the local body with a call to `patternOf` from `entities/location/where.ts`. |
| tooltipOf | `report/user-report/src/components/access-graph/NodeBox.tsx:60` | templateOf | `entities/location/where.ts:188` | 0.66 | Structure | Replace the local body with a call to `templateOf` from `entities/location/where.ts`. |
| PlaceLines | `report/user-report/src/components/access-graph/NodeBox.tsx:140` | parseOrNull | `css/syntax/gate.ts:67` | 0.67 | Structure | Replace the local body with a call to `parseOrNull` from `css/syntax/gate.ts`. |
| PlaceLines | `report/user-report/src/components/access-graph/NodeBox.tsx:140` | initializerFact | `entities/ast/tree.ts:346` | 0.65 | Structure | Replace the local body with a call to `initializerFact` from `entities/ast/tree.ts`. |
| addKind | `report/user-report/src/components/access-graph/loops.ts:11` | attachClassList | `css/styled/markup.ts:62` | 0.69 | Structure | Replace the local body with a call to `attachClassList` from `css/styled/markup.ts`. |
| addKind | `report/user-report/src/components/access-graph/loops.ts:11` | materialiseResolution | `css/index.ts:76` | 0.68 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| loopKindsOf | `report/user-report/src/components/access-graph/loops.ts:27` | byName | `code-roles/connector.ts:62` | 0.68 | Structure | Replace the local body with a call to `byName` from `code-roles/connector.ts`. |
| fitOf | `report/user-report/src/components/access-graph/useZoomPan.ts:26` | taggedTarget | `entities/ast/assignments-tagged.ts:171` | 0.66 | Structure | Replace the local body with a call to `taggedTarget` from `entities/ast/assignments-tagged.ts`. |
| useZoomPan | `report/user-report/src/components/access-graph/useZoomPan.ts:100` | structureFactsFor | `entities/tree/entries.ts:60` | 0.66 | Structure | Replace the local body with a call to `structureFactsFor` from `entities/tree/entries.ts`. |
| markedLine | `report/user-report/src/components/code-preview/CodePanel.tsx:72` | writePath | `entities/kinds.ts:106` | 0.69 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| markedLine | `report/user-report/src/components/code-preview/CodePanel.tsx:72` | typeTextOfExpr | `entities/ast/variables.ts:70` | 0.67 | Structure | Replace the local body with a call to `typeTextOfExpr` from `entities/ast/variables.ts`. |
| CodePanel#anon@79 | `report/user-report/src/components/code-preview/CodePanel.tsx:79` | writePath | `entities/kinds.ts:106` | 0.68 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| CodePanel#anon@79 | `report/user-report/src/components/code-preview/CodePanel.tsx:79` | valueTextOf | `css/resolve/theme-value.ts:209` | 0.67 | Structure | Replace the local body with a call to `valueTextOf` from `css/resolve/theme-value.ts`. |
| scalar | `report/user-report/src/generate/infer.ts:13` | nodeText | `entities/ast/tree.ts:51` | 0.72 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| buildProblemView | `report/user-report/src/graph/decision.ts:54` | structureFactsFor | `entities/tree/entries.ts:60` | 0.73 | Structure | Replace the local body with a call to `structureFactsFor` from `entities/tree/entries.ts`. |
| buildProblemView | `report/user-report/src/graph/decision.ts:54` | documentFacts | `css/styled/document.ts:257` | 0.73 | Structure | Replace the local body with a call to `documentFacts` from `css/styled/document.ts`. |
| nameOf | `report/user-report/src/graph/naming.ts:8` | writePath | `entities/kinds.ts:106` | 0.66 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| moveView | `report/user-report/src/graph/representation/file-views.ts:41` | resolveDeclaration | `css/resolve/resolve.ts:88` | 0.67 | Structure | Replace the local body with a call to `resolveDeclaration` from `css/resolve/resolve.ts`. |
| repairView | `report/user-report/src/graph/representation/fileContents.ts:16` | collectProblems | `css/resolve/resolve.ts:57` | 0.66 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |
| repairView | `report/user-report/src/graph/representation/fileContents.ts:16` | listVar | `invariants/vars.ts:91` | 0.66 | Structure | Replace the local body with a call to `listVar` from `invariants/vars.ts`. |
| build | `report/user-report/src/graph/representation/fileContents.ts:23` | collectReading | `css/resolve/resolve.ts:73` | 0.72 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| build | `report/user-report/src/graph/representation/fileContents.ts:23` | assertionOf | `entities/ast/variables.ts:77` | 0.70 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| moveCaption | `report/user-report/src/graph/representation/fileContents.ts:41` | literalTextOf | `css/resolve/theme-value.ts:74` | 0.69 | Structure | Replace the local body with a call to `literalTextOf` from `css/resolve/theme-value.ts`. |
| repairCaption | `report/user-report/src/graph/representation/fileContents.ts:48` | relationOf | `entities/ast/assignments.ts:49` | 0.66 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| repairCaption | `report/user-report/src/graph/representation/fileContents.ts:48` | entryKey | `entities/location/where.ts:194` | 0.65 | Structure | Replace the local body with a call to `entryKey` from `entities/location/where.ts`. |
| caption | `report/user-report/src/graph/representation/fileContents.ts:54` | extractScript#anon@67 | `entities/ast/project.ts:67` | 0.74 | Structure | Replace the local body with a call to `extractScript#anon@67` from `entities/ast/project.ts`. |
| caption | `report/user-report/src/graph/representation/fileContents.ts:54` | relationOf | `entities/ast/assignments.ts:49` | 0.72 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| isUnknownRole | `report/user-report/src/graph/representation/unknownRole.ts:9` | applyClaimsToSharers#anon@192 | `entities/tree/build.ts:192` | 0.68 | AST | Replace the local body with a call to `applyClaimsToSharers#anon@192` from `entities/tree/build.ts`. |
| caption | `report/user-report/src/graph/representation/unknownRole.ts:17` | nodeText | `entities/ast/tree.ts:51` | 0.70 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| isWrongAction | `report/user-report/src/graph/representation/wrongAction.ts:13` | templateNode#anon@39 | `entities/tree/entries.ts:39` | 0.67 | AST | Replace the local body with a call to `templateNode#anon@39` from `entities/tree/entries.ts`. |
| build | `report/user-report/src/graph/representation/wrongAction.ts:19` | resolvePath | `entities/tree/build.ts:73` | 0.72 | Structure | Replace the local body with a call to `resolvePath` from `entities/tree/build.ts`. |
| build | `report/user-report/src/graph/representation/wrongAction.ts:19` | utilityFacts | `css/tailwind/tailwind.ts:118` | 0.67 | Structure | Replace the local body with a call to `utilityFacts` from `css/tailwind/tailwind.ts`. |
| caption | `report/user-report/src/graph/representation/wrongAction.ts:39` | nodeText | `entities/ast/tree.ts:51` | 0.73 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| isWrongPlacement | `report/user-report/src/graph/representation/wrongPlacement.ts:11` | templateNode#anon@39 | `entities/tree/entries.ts:39` | 0.67 | AST | Replace the local body with a call to `templateNode#anon@39` from `entities/tree/entries.ts`. |
| caption | `report/user-report/src/graph/representation/wrongPlacement.ts:20` | nodeText | `entities/ast/tree.ts:51` | 0.68 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| graphParams | `report/user-report/src/screens/GraphScreen.tsx:27` | statementExport | `entities/ast/file-exports.ts:31` | 0.72 | Structure | Replace the local body with a call to `statementExport` from `entities/ast/file-exports.ts`. |
| graphParams | `report/user-report/src/screens/GraphScreen.tsx:27` | descendantFact | `entities/ast/tree.ts:201` | 0.71 | Structure | Replace the local body with a call to `descendantFact` from `entities/ast/tree.ts`. |
| roleEdgesOf | `report/user-report/src/screens/GraphScreen.tsx:37` | listHit | `invariants/vars.ts:53` | 0.70 | Structure | Replace the local body with a call to `listHit` from `invariants/vars.ts`. |
| roleEdgesOf | `report/user-report/src/screens/GraphScreen.tsx:37` | callsFact | `entities/ast/calls.ts:135` | 0.67 | Structure | Replace the local body with a call to `callsFact` from `entities/ast/calls.ts`. |
| roleNodesOf | `report/user-report/src/screens/GraphScreen.tsx:44` | parentName | `entities/ast/functions.ts:37` | 0.65 | Structure | Replace the local body with a call to `parentName` from `entities/ast/functions.ts`. |
| GraphScreen#anon@64#anon@64 | `report/user-report/src/screens/GraphScreen.tsx:64` | structureFactsFor#anon@66 | `entities/tree/entries.ts:66` | 0.69 | AST | Replace the local body with a call to `structureFactsFor#anon@66` from `entities/tree/entries.ts`. |
| toggle#anon@49 | `report/user-report/src/screens/TreeScreen.tsx:49` | handlerNamesOf | `frameworks/react/index.ts:201` | 0.67 | Structure | Replace the local body with a call to `handlerNamesOf` from `frameworks/react/index.ts`. |
| toggle#anon@49 | `report/user-report/src/screens/TreeScreen.tsx:49` | classAttributes | `frameworks/index.ts:82` | 0.66 | Structure | Replace the local body with a call to `classAttributes` from `frameworks/index.ts`. |
| useExpanded#anon@55 | `report/user-report/src/screens/TreeScreen.tsx:55` | checkEntry | `invariants/index.ts:190` | 0.71 | Structure | Replace the local body with a call to `checkEntry` from `invariants/index.ts`. |
| useExpanded#anon@55 | `report/user-report/src/screens/TreeScreen.tsx:55` | materialiseResolution | `css/index.ts:76` | 0.71 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| useNodeDetail | `report/user-report/src/screens/TreeScreen.tsx:121` | variantsOf#anon@23 | `entities/tree/build.ts:23` | 0.67 | Structure | Replace the local body with a call to `variantsOf#anon@23` from `entities/tree/build.ts`. |
| passesFilter | `report/user-report/src/screens/findings-reads.ts:16` | isReceiverOnly | `entities/ast/calls.ts:150` | 0.74 | Structure | Replace the local body with a call to `isReceiverOnly` from `entities/ast/calls.ts`. |
| passesFilter | `report/user-report/src/screens/findings-reads.ts:16` | instanceAt | `entities/tree/match.ts:98` | 0.71 | Structure | Replace the local body with a call to `instanceAt` from `entities/tree/match.ts`. |
| filteredOf | `report/user-report/src/screens/findings-reads.ts:22` | violationsOf | `invariants/index.ts:92` | 0.66 | Structure | Replace the local body with a call to `violationsOf` from `invariants/index.ts`. |
| isSelected | `report/user-report/src/screens/findings-reads.ts:40` | matchesRole | `entities/location/where.ts:74` | 0.70 | Structure | Replace the local body with a call to `matchesRole` from `entities/location/where.ts`. |
| isSelected | `report/user-report/src/screens/findings-reads.ts:40` | declaredInRepo | `entities/ast/assignments-tagged.ts:63` | 0.66 | Structure | Replace the local body with a call to `declaredInRepo` from `entities/ast/assignments-tagged.ts`. |
| kindFlagsOf | `report/user-report/src/screens/tree-screen/reads.ts:15` | matchers | `entities/tree/index.ts:10` | 0.70 | Structure | Replace the local body with a call to `matchers` from `entities/tree/index.ts`. |
| chainOf | `report/user-report/src/screens/tree-screen/reads.ts:40` | forwardedByAttributes | `frameworks/react/index.ts:118` | 0.66 | Structure | Replace the local body with a call to `forwardedByAttributes` from `frameworks/react/index.ts`. |
| chainOf | `report/user-report/src/screens/tree-screen/reads.ts:40` | checkReferences | `code-roles/roles.ts:118` | 0.65 | Structure | Replace the local body with a call to `checkReferences` from `code-roles/roles.ts`. |
| kindColors | `report/user-report/src/theme.ts:54` | indexBySlug | `entities/tree/build.ts:60` | 0.67 | Control flow | Replace the local body with a call to `indexBySlug` from `entities/tree/build.ts`. |
| shortPath | `report/user-report/src/utils/format.ts:17` | fillTemplate | `entities/location/where.ts:174` | 0.70 | Structure | Replace the local body with a call to `fillTemplate` from `entities/location/where.ts`. |
| dirOf | `report/user-report/src/utils/format.ts:26` | nameOnly | `entities/location/place.ts:25` | 0.72 | Structure | Replace the local body with a call to `nameOnly` from `entities/location/place.ts`. |
| dirOf | `report/user-report/src/utils/format.ts:26` | nodeText | `entities/ast/tree.ts:51` | 0.71 | Structure | Replace the local body with a call to `nodeText` from `entities/ast/tree.ts`. |
| accessorSignature | `report/user-report/src/utils/format.ts:40` | exportPiece | `entities/kinds.ts:143` | 0.67 | Structure | Replace the local body with a call to `exportPiece` from `entities/kinds.ts`. |
| resolve | `report/user-report/src/utils/layout/columns.ts:17` | depthOf | `entities/ast/depth.ts:79` | 0.75 | Structure | Replace the local body with a call to `depthOf` from `entities/ast/depth.ts`. |
| resolve | `report/user-report/src/utils/layout/columns.ts:17` | candidatesIn | `entities/ast/depth.ts:107` | 0.74 | Structure | Replace the local body with a call to `candidatesIn` from `entities/ast/depth.ts`. |
| neighboursOf | `report/user-report/src/utils/layout/columns.ts:64` | byName | `code-roles/connector.ts:62` | 0.67 | Structure | Replace the local body with a call to `byName` from `code-roles/connector.ts`. |
| edgeLines | `report/user-report/src/utils/layout/edge-lines.ts:12` | classifyRoles | `code-roles/classify.ts:32` | 0.72 | Structure | Replace the local body with a call to `classifyRoles` from `code-roles/classify.ts`. |
| edgeLines | `report/user-report/src/utils/layout/edge-lines.ts:12` | parentOf | `css/styled/document.ts:103` | 0.71 | Structure | Replace the local body with a call to `parentOf` from `css/styled/document.ts`. |
| touchingOf | `report/user-report/src/utils/layout/geometry.ts:14` | nodesByPos | `entities/ast/comments.ts:56` | 0.66 | Structure | Replace the local body with a call to `nodesByPos` from `entities/ast/comments.ts`. |
| otherSlug | `report/user-report/src/utils/layout/geometry.ts:86` | writePath | `entities/kinds.ts:106` | 0.72 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| otherSlug | `report/user-report/src/utils/layout/geometry.ts:86` | namesOfParameter | `frameworks/react/index.ts:98` | 0.69 | Structure | Replace the local body with a call to `namesOfParameter` from `frameworks/react/index.ts`. |
| trySpot | `report/user-report/src/utils/layout/label-search.ts:19` | leadingCommentOf | `css/styled/template.ts:64` | 0.70 | Structure | Replace the local body with a call to `leadingCommentOf` from `css/styled/template.ts`. |
| trySpot | `report/user-report/src/utils/layout/label-search.ts:19` | numericSpan | `invariants/list-vars.ts:51` | 0.70 | Structure | Replace the local body with a call to `numericSpan` from `invariants/list-vars.ts`. |
| laneCountsOf | `report/user-report/src/utils/layout/lanes.ts:14` | nodesByPos | `entities/ast/comments.ts:56` | 0.67 | Structure | Replace the local body with a call to `nodesByPos` from `entities/ast/comments.ts`. |
| placeLines | `report/user-report/src/utils/layout/text-flow.ts:24` | rangeLines | `entities/ast/tree.ts:235` | 0.67 | Structure | Replace the local body with a call to `rangeLines` from `entities/ast/tree.ts`. |
| textFlow | `report/user-report/src/utils/layout/text-flow.ts:49` | fileVars | `invariants/name.ts:13` | 0.68 | Structure | Replace the local body with a call to `fileVars` from `invariants/name.ts`. |
| endsOf | `report/user-report/src/utils/layout.ts:20` | taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | 0.66 | Structure | Replace the local body with a call to `taggedWriteOf` from `entities/ast/assignments-tagged.ts`. |
| navigate | `report/user-report/src/utils/router.ts:30` | attachClassList | `css/styled/markup.ts:62` | 0.72 | Structure | Replace the local body with a call to `attachClassList` from `css/styled/markup.ts`. |
| navigate | `report/user-report/src/utils/router.ts:30` | collectProblems | `css/resolve/resolve.ts:57` | 0.66 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |

## Inside `nodes` — utils folder duplicates (84)

| Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| checkFinally | `nodes/finally/index.ts:32` | addProvider | `code-roles/project.ts:60` | 0.76 | Structure | Replace the local body with a call to `addProvider` from `code-roles/project.ts`. |
| checkRoleAccess | `nodes/finally/relations-access.ts:30` | collectProblems | `css/resolve/resolve.ts:57` | 0.77 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |
| foreignFolder | `nodes/finally/required.ts:39` | materialiseResolution | `css/index.ts:76` | 0.76 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| checkOwner | `nodes/finally/required.ts:97` | collectReading | `css/resolve/resolve.ts:73` | 0.79 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| rolesOfChild | `nodes/child-roles.ts:12` | rolesAtPath | `entities/location/homes.ts:162` | 0.73 | Structure | Replace the local body with a call to `rolesAtPath` from `entities/location/homes.ts`. |
| rolesOfChild | `nodes/child-roles.ts:12` | invariantLines | `report/render-report.ts:118` | 0.72 | Structure | Replace the local body with a call to `invariantLines` from `report/render-report.ts`. |
| folderContents | `nodes/children.ts:20` | buildProblemView | `report/user-report/src/graph/decision.ts:54` | 0.74 | Structure | Replace the local body with a call to `buildProblemView` from `report/user-report/src/graph/decision.ts`. |
| folderContents | `nodes/children.ts:20` | buildPlan | `report/user-report/data/finding-plan.ts:31` | 0.72 | Structure | Replace the local body with a call to `buildPlan` from `report/user-report/data/finding-plan.ts`. |
| ancestorChain | `nodes/children.ts:36` | roleEdges | `report/user-report/data/graph-roles.ts:66` | 0.71 | Structure | Replace the local body with a call to `roleEdges` from `report/user-report/data/graph-roles.ts`. |
| ancestorChain | `nodes/children.ts:36` | matchedRanges | `report/user-report/data/role-marks.ts:67` | 0.67 | Structure | Replace the local body with a call to `matchedRanges` from `report/user-report/data/role-marks.ts`. |
| missingRequiredChild | `nodes/children.ts:52` | walk | `entities/tree/match.ts:58` | 0.65 | Structure | Replace the local body with a call to `walk` from `entities/tree/match.ts`. |
| rolesOf | `nodes/children.ts:86` | rolesAtPath | `entities/location/homes.ts:162` | 0.71 | Structure | Replace the local body with a call to `rolesAtPath` from `entities/location/homes.ts`. |
| rolesOf | `nodes/children.ts:86` | targetPaths | `report/errorTypes/types/wrongAction.ts:23` | 0.70 | Structure | Replace the local body with a call to `targetPaths` from `report/errorTypes/types/wrongAction.ts`. |
| childOf | `nodes/children.ts:96` | make | `entities/tree/build.ts:32` | 0.73 | Structure | Replace the local body with a call to `make` from `entities/tree/build.ts`. |
| compileChild | `nodes/children.ts:116` | useZoomPan#anon@127#anon@129 | `report/user-report/src/components/access-graph/useZoomPan.ts:129` | 0.68 | Structure | Replace the local body with a call to `useZoomPan#anon@127#anon@129` from `report/user-report/src/components/access-graph/useZoomPan.ts`. |
| compileChild | `nodes/children.ts:116` | dynamicMapAnswer | `css/resolve/expression.ts:190` | 0.65 | Structure | Replace the local body with a call to `dynamicMapAnswer` from `css/resolve/expression.ts`. |
| decisionsOf | `nodes/finally/emit.ts:32` | importsOf | `entities/ast/file-imports.ts:68` | 0.72 | Structure | Replace the local body with a call to `importsOf` from `entities/ast/file-imports.ts`. |
| decisionsOf | `nodes/finally/emit.ts:32` | assignmentsFact | `entities/ast/assignments.ts:87` | 0.71 | Structure | Replace the local body with a call to `assignmentsFact` from `entities/ast/assignments.ts`. |
| decisionsOf#anon@44 | `nodes/finally/emit.ts:44` | elementsOf#anon@222 | `frameworks/react/index.ts:222` | 0.67 | Signature | Replace the local body with a call to `elementsOf#anon@222` from `frameworks/react/index.ts`. |
| decisionsOf#anon@44 | `nodes/finally/emit.ts:44` | exportsOf#anon@87 | `entities/ast/file-exports.ts:87` | 0.67 | Signature | Replace the local body with a call to `exportsOf#anon@87` from `entities/ast/file-exports.ts`. |
| emitFindings | `nodes/finally/emit.ts:54` | checkTree | `entities/tree/entries.ts:118` | 0.70 | Structure | Replace the local body with a call to `checkTree` from `entities/tree/entries.ts`. |
| emitFindings | `nodes/finally/emit.ts:54` | reportUndeclared | `entities/tree/entries.ts:97` | 0.69 | Structure | Replace the local body with a call to `reportUndeclared` from `entities/tree/entries.ts`. |
| checkFinally | `nodes/finally/index.ts:32` | attachClassList | `css/styled/markup.ts:62` | 0.73 | Structure | Replace the local body with a call to `attachClassList` from `css/styled/markup.ts`. |
| checkFinally | `nodes/finally/index.ts:32` | walkRecord | `report/user-report/shared/describe.ts:72` | 0.69 | Structure | Replace the local body with a call to `walkRecord` from `report/user-report/shared/describe.ts`. |
| accessorsOf#anon@20 | `nodes/finally/relations-access.ts:20` | homesOf#anon@60 | `report/user-report/data/roles.ts:60` | 0.66 | Control flow | Replace the local body with a call to `homesOf#anon@60` from `report/user-report/data/roles.ts`. |
| checkRoleAccess | `nodes/finally/relations-access.ts:30` | declarationMark | `report/user-report/data/role-marks.ts:24` | 0.73 | Structure | Replace the local body with a call to `declarationMark` from `report/user-report/data/role-marks.ts`. |
| checkRoleAccess | `nodes/finally/relations-access.ts:30` | checkEntry | `invariants/index.ts:190` | 0.71 | Structure | Replace the local body with a call to `checkEntry` from `invariants/index.ts`. |
| sourceRolesOf | `nodes/finally/relations-edge.ts:32` | namesOfParameter | `frameworks/react/index.ts:98` | 0.67 | Structure | Replace the local body with a call to `namesOfParameter` from `frameworks/react/index.ts`. |
| targetRolesOf | `nodes/finally/relations-edge.ts:40` | writePath | `entities/kinds.ts:106` | 0.72 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| targetRolesOf | `nodes/finally/relations-edge.ts:40` | exportPiece | `entities/kinds.ts:143` | 0.69 | Structure | Replace the local body with a call to `exportPiece` from `entities/kinds.ts`. |
| pairOf | `nodes/finally/relations-edge.ts:59` | taggedWriteOf | `entities/ast/assignments-tagged.ts:180` | 0.74 | Structure | Replace the local body with a call to `taggedWriteOf` from `entities/ast/assignments-tagged.ts`. |
| pairOf | `nodes/finally/relations-edge.ts:59` | assertionOf | `entities/ast/variables.ts:77` | 0.72 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| routeOf | `nodes/finally/relations-edge.ts:79` | memberType | `entities/ast/classes.ts:18` | 0.67 | Structure | Replace the local body with a call to `memberType` from `entities/ast/classes.ts`. |
| destOf | `nodes/finally/relations-edge.ts:92` | folderOf | `report/errorTypes/vocabulary/places.ts:15` | 0.67 | Structure | Replace the local body with a call to `folderOf` from `report/errorTypes/vocabulary/places.ts`. |
| destOf#anon@96 | `nodes/finally/relations-edge.ts:96` | childrenOf#anon@23 | `report/user-report/src/screens/tree-screen/reads.ts:23` | 0.68 | Structure | Replace the local body with a call to `childrenOf#anon@23` from `report/user-report/src/screens/tree-screen/reads.ts`. |
| destOf#anon@97 | `nodes/finally/relations-edge.ts:97` | movableHome | `report/errorTypes/destinations.ts:119` | 0.65 | AST | Replace the local body with a call to `movableHome` from `report/errorTypes/destinations.ts`. |
| groupOf | `nodes/finally/relations-edge.ts:105` | countReferences | `entities/ast/usage.ts:13` | 0.73 | Structure | Replace the local body with a call to `countReferences` from `entities/ast/usage.ts`. |
| groupOf | `nodes/finally/relations-edge.ts:105` | buildAccessGraph | `report/user-report/data/graph.ts:84` | 0.72 | Structure | Replace the local body with a call to `buildAccessGraph` from `report/user-report/data/graph.ts`. |
| judgeEdge | `nodes/finally/relations-edge.ts:134` | variableInitializer | `entities/ast/variables.ts:42` | 0.74 | Structure | Replace the local body with a call to `variableInitializer` from `entities/ast/variables.ts`. |
| judgeEdge | `nodes/finally/relations-edge.ts:134` | nextDeclOf | `entities/ast/resolve.ts:65` | 0.74 | Structure | Replace the local body with a call to `nextDeclOf` from `entities/ast/resolve.ts`. |
| ownerRoleOf | `nodes/finally/relations-group.ts:48` | tooltipOf | `report/user-report/src/components/access-graph/NodeBox.tsx:60` | 0.71 | Structure | Replace the local body with a call to `tooltipOf` from `report/user-report/src/components/access-graph/NodeBox.tsx`. |
| ownerRoleOf | `nodes/finally/relations-group.ts:48` | reportMessage | `report/user-report/data/invariants.ts:23` | 0.71 | Structure | Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`. |
| whyCodeOf | `nodes/finally/relations-group.ts:64` | writePath | `entities/kinds.ts:106` | 0.73 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| tokenOf | `nodes/finally/relations-group.ts:70` | buildAccessGraph | `report/user-report/data/graph.ts:84` | 0.66 | Structure | Replace the local body with a call to `buildAccessGraph` from `report/user-report/data/graph.ts`. |
| relationFix | `nodes/finally/relations-group.ts:97` | reportMessage | `report/user-report/data/invariants.ts:23` | 0.68 | Structure | Replace the local body with a call to `reportMessage` from `report/user-report/data/invariants.ts`. |
| relationFix | `nodes/finally/relations-group.ts:97` | headOf | `report/user-report/src/graph/representation/wrongAction.ts:31` | 0.68 | Structure | Replace the local body with a call to `headOf` from `report/user-report/src/graph/representation/wrongAction.ts`. |
| describeGroup | `nodes/finally/relations-group.ts:122` | declarationMark | `report/user-report/data/role-marks.ts:24` | 0.74 | Structure | Replace the local body with a call to `declarationMark` from `report/user-report/data/role-marks.ts`. |
| describeGroup | `nodes/finally/relations-group.ts:122` | collectProblems | `css/resolve/resolve.ts:57` | 0.68 | Structure | Replace the local body with a call to `collectProblems` from `css/resolve/resolve.ts`. |
| uniqueEdges | `nodes/finally/relations.ts:20` | matchedRanges | `report/user-report/data/role-marks.ts:67` | 0.71 | Structure | Replace the local body with a call to `matchedRanges` from `report/user-report/data/role-marks.ts`. |
| uniqueEdges | `nodes/finally/relations.ts:20` | selectorFacts | `css/styled/document.ts:74` | 0.67 | Structure | Replace the local body with a call to `selectorFacts` from `css/styled/document.ts`. |
| judgedEdge#anon@42 | `nodes/finally/relations.ts:42` | [RELATION.IMPORT]#anon@196 | `entities/kinds.ts:196` | 0.68 | AST | Replace the local body with a call to `[RELATION.IMPORT]#anon@196` from `entities/kinds.ts`. |
| judgedEdge#anon@42 | `nodes/finally/relations.ts:42` | callsOf#anon@70#anon@72 | `entities/kinds.ts:72` | 0.68 | AST | Replace the local body with a call to `callsOf#anon@70#anon@72` from `entities/kinds.ts`. |
| ownedEdges | `nodes/finally/relations.ts:46` | callsFact | `entities/ast/calls.ts:135` | 0.73 | Structure | Replace the local body with a call to `callsFact` from `entities/ast/calls.ts`. |
| ownedEdges | `nodes/finally/relations.ts:46` | roleEdgesOf | `report/user-report/src/screens/GraphScreen.tsx:37` | 0.67 | Structure | Replace the local body with a call to `roleEdgesOf` from `report/user-report/src/screens/GraphScreen.tsx`. |
| collectRefusals | `nodes/finally/relations.ts:72` | byName | `code-roles/connector.ts:62` | 0.66 | Structure | Replace the local body with a call to `byName` from `code-roles/connector.ts`. |
| checkRelations | `nodes/finally/relations.ts:83` | useExpanded#anon@55 | `report/user-report/src/screens/TreeScreen.tsx:55` | 0.72 | Structure | Replace the local body with a call to `useExpanded#anon@55` from `report/user-report/src/screens/TreeScreen.tsx`. |
| checkRelations | `nodes/finally/relations.ts:83` | variablesOf#anon@26 | `css/syntax/scss.ts:26` | 0.71 | Structure | Replace the local body with a call to `variablesOf#anon@26` from `css/syntax/scss.ts`. |
| homesOutside | `nodes/finally/required.ts:26` | byName | `code-roles/connector.ts:62` | 0.67 | Structure | Replace the local body with a call to `byName` from `code-roles/connector.ts`. |
| homesOutside | `nodes/finally/required.ts:26` | importNameModules | `entities/ast/resolve.ts:298` | 0.67 | Structure | Replace the local body with a call to `importNameModules` from `entities/ast/resolve.ts`. |
| foreignFolder | `nodes/finally/required.ts:39` | recordProblem | `css/resolve/resolve.ts:40` | 0.72 | Structure | Replace the local body with a call to `recordProblem` from `css/resolve/resolve.ts`. |
| foreignFolder | `nodes/finally/required.ts:39` | walkEntry | `report/user-report/shared/describe.ts:50` | 0.72 | Structure | Replace the local body with a call to `walkEntry` from `report/user-report/shared/describe.ts`. |
| missingChild | `nodes/finally/required.ts:68` | recordProblem | `css/resolve/resolve.ts:40` | 0.75 | Structure | Replace the local body with a call to `recordProblem` from `css/resolve/resolve.ts`. |
| missingChild | `nodes/finally/required.ts:68` | collectReading | `css/resolve/resolve.ts:73` | 0.73 | Structure | Replace the local body with a call to `collectReading` from `css/resolve/resolve.ts`. |
| checkOwner | `nodes/finally/required.ts:97` | materialiseResolution | `css/index.ts:76` | 0.74 | Structure | Replace the local body with a call to `materialiseResolution` from `css/index.ts`. |
| checkOwner | `nodes/finally/required.ts:97` | checkEntry | `invariants/index.ts:190` | 0.73 | Structure | Replace the local body with a call to `checkEntry` from `invariants/index.ts`. |
| rolePlace | `nodes/finally/roles.ts:23` | roleEdge | `report/user-report/data/graph-roles.ts:31` | 0.68 | Structure | Replace the local body with a call to `roleEdge` from `report/user-report/data/graph-roles.ts`. |
| rolePlace | `nodes/finally/roles.ts:23` | edgeOf | `report/user-report/data/graph-edges.ts:31` | 0.66 | Structure | Replace the local body with a call to `edgeOf` from `report/user-report/data/graph-edges.ts`. |
| allowedPlaces | `nodes/finally/roles.ts:38` | matchedRanges | `report/user-report/data/role-marks.ts:67` | 0.67 | Structure | Replace the local body with a call to `matchedRanges` from `report/user-report/data/role-marks.ts`. |
| allowedPlaces | `nodes/finally/roles.ts:38` | actionRoleEdges | `report/user-report/data/graph-roles.ts:52` | 0.66 | Structure | Replace the local body with a call to `actionRoleEdges` from `report/user-report/data/graph-roles.ts`. |
| filesIn#anon@48 | `nodes/similar.ts:48` | applyClaimsToSharers#anon@192 | `entities/tree/build.ts:192` | 0.66 | Structure | Replace the local body with a call to `applyClaimsToSharers#anon@192` from `entities/tree/build.ts`. |
| rolesOfFile#anon@65 | `nodes/similar.ts:65` | read | `entities/ast/depth.ts:110` | 0.68 | Structure | Replace the local body with a call to `read` from `entities/ast/depth.ts`. |
| rolesOfFile#anon@65 | `nodes/similar.ts:65` | classifyFile | `code-roles/project.ts:86` | 0.67 | Structure | Replace the local body with a call to `classifyFile` from `code-roles/project.ts`. |
| rolesInFolder | `nodes/similar.ts:79` | classAttributes | `frameworks/index.ts:82` | 0.70 | Structure | Replace the local body with a call to `classAttributes` from `frameworks/index.ts`. |
| rolesInFolder | `nodes/similar.ts:79` | loopKindsOf | `report/user-report/src/components/access-graph/loops.ts:27` | 0.66 | Structure | Replace the local body with a call to `loopKindsOf` from `report/user-report/src/components/access-graph/loops.ts`. |
| isDeclaredPath | `nodes/similar.ts:103` | declarationMark#anon@26 | `report/user-report/data/role-marks.ts:26` | 0.71 | Structure | Replace the local body with a call to `declarationMark#anon@26` from `report/user-report/data/role-marks.ts`. |
| isDeclaredPath | `nodes/similar.ts:103` | pathInRole | `entities/location.ts:54` | 0.71 | Structure | Replace the local body with a call to `pathInRole` from `entities/location.ts`. |
| resembles | `nodes/similar.ts:113` | callImport | `entities/ast/file-imports.ts:35` | 0.76 | Structure | Replace the local body with a call to `callImport` from `entities/ast/file-imports.ts`. |
| resembles | `nodes/similar.ts:113` | joinedText | `css/resolve/expression.ts:229` | 0.73 | Structure | Replace the local body with a call to `joinedText` from `css/resolve/expression.ts`. |
| folderRoles | `nodes/similar.ts:148` | folderOwner | `entities/tree/match.ts:89` | 0.72 | Structure | Replace the local body with a call to `folderOwner` from `entities/tree/match.ts`. |
| folderRoles | `nodes/similar.ts:148` | methodNameOf | `entities/ast/assignments-tagged.ts:162` | 0.69 | Structure | Replace the local body with a call to `methodNameOf` from `entities/ast/assignments-tagged.ts`. |
| similarNodes | `nodes/similar.ts:158` | callsFact | `entities/ast/calls.ts:135` | 0.73 | Structure | Replace the local body with a call to `callsFact` from `entities/ast/calls.ts`. |
| similarNodes | `nodes/similar.ts:158` | destinationsIn | `entities/location/homes.ts:83` | 0.70 | Structure | Replace the local body with a call to `destinationsIn` from `entities/location/homes.ts`. |
| similarNodes#anon@166 | `nodes/similar.ts:166` | invariantLines#anon@122 | `report/render-report.ts:122` | 0.70 | Signature | Replace the local body with a call to `invariantLines#anon@122` from `report/render-report.ts`. |
| similarNodes#anon@166 | `nodes/similar.ts:166` | enrichFindings#anon@191 | `report/user-report/data/findings.ts:191` | 0.68 | Signature | Replace the local body with a call to `enrichFindings#anon@191` from `report/user-report/data/findings.ts`. |

## Inside `utils` — utils folder duplicates (53)

| Local util | Location | Canonical | Canonical location | Confidence | Top signal | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| article | `utils/article.ts:5` | writePath | `entities/kinds.ts:106` | 0.66 | Structure | Replace the local body with a call to `writePath` from `entities/kinds.ts`. |
| article | `utils/article.ts:5` | rolesSuffix | `report/errorTypes/vocabulary/phrases.ts:119` | 0.65 | Structure | Replace the local body with a call to `rolesSuffix` from `report/errorTypes/vocabulary/phrases.ts`. |
| readOf | `utils/configs.ts:56` | ensureDir | `report/user-report/data/file-tree.ts:61` | 0.66 | Structure | Replace the local body with a call to `ensureDir` from `report/user-report/data/file-tree.ts`. |
| loadConfigs | `utils/configs.ts:69` | documentFacts | `css/styled/document.ts:257` | 0.69 | Structure | Replace the local body with a call to `documentFacts` from `css/styled/document.ts`. |
| loadConfigs | `utils/configs.ts:69` | buildProblemView | `report/user-report/src/graph/decision.ts:54` | 0.66 | Structure | Replace the local body with a call to `buildProblemView` from `report/user-report/src/graph/decision.ts`. |
| configFacts | `utils/configs.ts:97` | placementMarks | `report/user-report/src/graph/representation/placement.ts:16` | 0.74 | Structure | Replace the local body with a call to `placementMarks` from `report/user-report/src/graph/representation/placement.ts`. |
| configFacts | `utils/configs.ts:97` | contributionsOf | `report/errorTypes/destinations.ts:92` | 0.68 | Structure | Replace the local body with a call to `contributionsOf` from `report/errorTypes/destinations.ts`. |
| dispatchOn | `utils/dispatch.ts:18` | resolvePlace | `invariants/index.ts:75` | 0.73 | Structure | Replace the local body with a call to `resolvePlace` from `invariants/index.ts`. |
| dispatchOn | `utils/dispatch.ts:18` | namedAnswer | `css/resolve/path-answer.ts:76` | 0.69 | Structure | Replace the local body with a call to `namedAnswer` from `css/resolve/path-answer.ts`. |
| isObj | `utils/field.ts:34` | isToken | `report/render-report.ts:34` | 0.73 | Control flow | Replace the local body with a call to `isToken` from `report/render-report.ts`. |
| isObj | `utils/field.ts:34` | isScopeRecord | `entities/location.ts:39` | 0.71 | AST | Replace the local body with a call to `isScopeRecord` from `entities/location.ts`. |
| readOne | `utils/field.ts:53` | readField | `entities/queries.ts:94` | 0.80 | Structure | Replace the local body with a call to `readField` from `entities/queries.ts`. |
| fieldOf#anon@74 | `utils/field.ts:74` | branchOf | `invariants/vars.ts:101` | 0.72 | Structure | Replace the local body with a call to `branchOf` from `invariants/vars.ts`. |
| fieldOf#anon@74 | `utils/field.ts:74` | resolvePlace | `invariants/index.ts:75` | 0.72 | Structure | Replace the local body with a call to `resolvePlace` from `invariants/index.ts`. |
| collectFiles | `utils/files.ts:22` | chainOf | `report/user-report/src/screens/tree-screen/reads.ts:40` | 0.69 | Structure | Replace the local body with a call to `chainOf` from `report/user-report/src/screens/tree-screen/reads.ts`. |
| collectFiles | `utils/files.ts:22` | propertiesReader#anon@40 | `css/tailwind/tailwind.ts:40` | 0.67 | Structure | Replace the local body with a call to `propertiesReader#anon@40` from `css/tailwind/tailwind.ts`. |
| pathsOf | `utils/imports.ts:35` | declaredActions | `entities/kinds.ts:238` | 0.66 | Structure | Replace the local body with a call to `declaredActions` from `entities/kinds.ts`. |
| foldersOf | `utils/imports.ts:50` | chainOf | `report/user-report/src/screens/tree-screen/reads.ts:40` | 0.69 | Structure | Replace the local body with a call to `chainOf` from `report/user-report/src/screens/tree-screen/reads.ts`. |
| foldersOf | `utils/imports.ts:50` | fileLanding | `report/user-report/data/nodes.ts:33` | 0.65 | Structure | Replace the local body with a call to `fileLanding` from `report/user-report/data/nodes.ts`. |
| resolutionHost | `utils/imports.ts:66` | documentFacts | `css/styled/document.ts:257` | 0.71 | Structure | Replace the local body with a call to `documentFacts` from `css/styled/document.ts`. |
| resolveImport#anon@118 | `utils/imports.ts:118` | caption | `report/user-report/src/graph/representation/fileContents.ts:54` | 0.75 | Structure | Replace the local body with a call to `caption` from `report/user-report/src/graph/representation/fileContents.ts`. |
| resolveImport#anon@118 | `utils/imports.ts:118` | attributeValueText | `frameworks/react/index.ts:72` | 0.73 | Structure | Replace the local body with a call to `attributeValueText` from `frameworks/react/index.ts`. |
| keyedDefs | `utils/keyed.ts:18` | listHit | `invariants/vars.ts:53` | 0.66 | Structure | Replace the local body with a call to `listHit` from `invariants/vars.ts`. |
| keyedDefs | `utils/keyed.ts:18` | roleEdgesOf | `report/user-report/src/screens/GraphScreen.tsx:37` | 0.65 | Structure | Replace the local body with a call to `roleEdgesOf` from `report/user-report/src/screens/GraphScreen.tsx`. |
| pathTemplate | `utils/path-label.ts:11` | orphanLines | `report/render-report.ts:110` | 0.73 | Structure | Replace the local body with a call to `orphanLines` from `report/render-report.ts`. |
| pathTemplate | `utils/path-label.ts:11` | rolesSuffix | `report/errorTypes/vocabulary/phrases.ts:119` | 0.73 | Structure | Replace the local body with a call to `rolesSuffix` from `report/errorTypes/vocabulary/phrases.ts`. |
| tailPath | `utils/path-label.ts:26` | homeDir | `entities/location/homes.ts:47` | 0.66 | Structure | Replace the local body with a call to `homeDir` from `entities/location/homes.ts`. |
| tailPath | `utils/path-label.ts:26` | dirOf | `entities/location/place.ts:66` | 0.66 | Structure | Replace the local body with a call to `dirOf` from `entities/location/place.ts`. |
| expandBraces | `utils/pattern.ts:19` | invariantLines | `report/render-report.ts:118` | 0.73 | Structure | Replace the local body with a call to `invariantLines` from `report/render-report.ts`. |
| expandBraces | `utils/pattern.ts:19` | utilityValue | `css/tailwind/tailwind.ts:85` | 0.69 | Structure | Replace the local body with a call to `utilityValue` from `css/tailwind/tailwind.ts`. |
| braceToken | `utils/pattern.ts:35` | tokenLiteral | `css/core/values.ts:58` | 0.69 | Structure | Replace the local body with a call to `tokenLiteral` from `css/core/values.ts`. |
| braceToken | `utils/pattern.ts:35` | assertionOf | `entities/ast/variables.ts:77` | 0.69 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| globToken | `utils/pattern.ts:43` | valueEndAt | `css/core/scope.ts:63` | 0.65 | Structure | Replace the local body with a call to `valueEndAt` from `css/core/scope.ts`. |
| globToRegex | `utils/pattern.ts:53` | addOrder | `css/styled/document.ts:52` | 0.69 | Structure | Replace the local body with a call to `addOrder` from `css/styled/document.ts`. |
| underscoreConvention | `utils/pattern.ts:94` | exportPiece | `entities/kinds.ts:143` | 0.73 | Structure | Replace the local body with a call to `exportPiece` from `entities/kinds.ts`. |
| underscoreConvention | `utils/pattern.ts:94` | relationOf | `entities/ast/assignments.ts:49` | 0.69 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| dashConvention | `utils/pattern.ts:100` | exportPiece | `entities/kinds.ts:143` | 0.73 | Structure | Replace the local body with a call to `exportPiece` from `entities/kinds.ts`. |
| dashConvention | `utils/pattern.ts:100` | relationOf | `entities/ast/assignments.ts:49` | 0.69 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| conventionOf | `utils/pattern.ts:106` | relationOf | `entities/ast/assignments.ts:49` | 0.66 | Structure | Replace the local body with a call to `relationOf` from `entities/ast/assignments.ts`. |
| patternBody | `utils/pattern.ts:128` | utilityFacts | `css/tailwind/tailwind.ts:118` | 0.66 | Structure | Replace the local body with a call to `utilityFacts` from `css/tailwind/tailwind.ts`. |
| rankedOffers | `utils/rank.ts:14` | allMatches | `entities/tree/match.ts:77` | 0.65 | Structure | Replace the local body with a call to `allMatches` from `entities/tree/match.ts`. |
| readWhen | `utils/read-when.ts:12` | collectScalars | `invariants/vars.ts:79` | 0.68 | Structure | Replace the local body with a call to `collectScalars` from `invariants/vars.ts`. |
| recordWithout | `utils/record.ts:13` | violationsOf | `invariants/index.ts:92` | 0.74 | Structure | Replace the local body with a call to `violationsOf` from `invariants/index.ts`. |
| recordWithout | `utils/record.ts:13` | enrich | `frameworks/react/index.ts:225` | 0.74 | Structure | Replace the local body with a call to `enrich` from `frameworks/react/index.ts`. |
| resolveReference | `utils/resolve.ts:16` | assertionOf | `entities/ast/variables.ts:77` | 0.74 | Structure | Replace the local body with a call to `assertionOf` from `entities/ast/variables.ts`. |
| resolveReference | `utils/resolve.ts:16` | returnTypeOf | `entities/ast/resolve.ts:229` | 0.73 | Structure | Replace the local body with a call to `returnTypeOf` from `entities/ast/resolve.ts`. |
| seenAdd | `utils/seen.ts:18` | useExpanded#anon@55 | `report/user-report/src/screens/TreeScreen.tsx:55` | 0.73 | Structure | Replace the local body with a call to `useExpanded#anon@55` from `report/user-report/src/screens/TreeScreen.tsx`. |
| seenAdd | `utils/seen.ts:18` | checkFinally | `nodes/finally/index.ts:32` | 0.72 | Structure | Replace the local body with a call to `checkFinally` from `nodes/finally/index.ts`. |
| speakOnce | `utils/speak.ts:12` | descendantsOf#anon@321 | `entities/ast/tree.ts:321` | 0.73 | Structure | Replace the local body with a call to `descendantsOf#anon@321` from `entities/ast/tree.ts`. |
| speakOnce | `utils/speak.ts:12` | isDirective | `css/resolve/directive.ts:61` | 0.71 | Structure | Replace the local body with a call to `isDirective` from `css/resolve/directive.ts`. |
| partsOf | `utils/split.ts:11` | leafOf | `entities/location/place.ts:40` | 0.69 | Structure | Replace the local body with a call to `leafOf` from `entities/location/place.ts`. |
| worstWhenAllRefuse | `utils/verdicts.ts:14` | ownValueAnswer | `css/resolve/path-answer.ts:20` | 0.66 | Structure | Replace the local body with a call to `ownValueAnswer` from `css/resolve/path-answer.ts`. |
| worstWhenAllRefuse | `utils/verdicts.ts:14` | narrowingOf | `invariants/list-vars.ts:16` | 0.65 | Structure | Replace the local body with a call to `narrowingOf` from `invariants/list-vars.ts`. |

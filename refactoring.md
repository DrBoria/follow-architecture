# follow-architecture — ревью и план рефакторинга

Дата: 2026-07-22. Обзор текущего кода (git-история не учитывалась).
Целевой формат конфига — [md-prettify/architecture.yaml](/c:/Users/mikita.dusmikeev/Work/chomp-2/md-prettify/architecture.yaml): ровно 4 сущности — `aliases`, `nodes`, `codeRoles`, `invariants`. Область сканирования (`files`/`ignores`/`ignoreDirs`/`exts`) в yaml НЕ живёт — это забота инструмента: CLI-флаги `--files`/`--ignore` и опции ESLint-правила `ignoreDirs`/`ignores`.

Состояние на момент ревью: `bun test` → **7 pass, 1 fail, 1 error** — CLI-тест падает с `Cannot find module './primitives' from 'code-roles\classify.js'`. Плагин в текущем виде **не запускается ни как CLI, ни как ESLint-правило**.

---

## 1. Целевая архитектура (4 сущности, без смешения)

Каждая сущность — своя папка, свой normalize, свой checker. Общие механизмы — в `utils/` и `report/`, и они не знают про сущности.

```
follow-architecture/
├── aliases.js            # сущность 1: alias → path (уже ок)
├── nodes/                # сущность 2: дерево папок + имена
│   ├── tree.js           #   buildTree / checkTree / matchers
│   └── children.js       #   compileChild / nodePrefixRe
├── code-roles/           # сущность 3: роли из ts-morph-фактов
│   ├── roles.js          #   normalize
│   ├── classify.js       #   только классификация: исполнение infer-фильтров над кандидатами
│   └── assert.js         #   assert.structure / assert.actions (сейчас в classify.js)
├── invariants/           # сущность 4: правила per-file
│   ├── index.js          #   оркестрация гейтов + исполнение forbid-фильтров
│   ├── normalize.js
│   └── where.js / when.js
├── ast.js                # ВСЁ про ts-morph в одном месте: createTsProject / loadSourceFile + SK / isFunctionNode / resolveSyntaxKind + сбор generic-фактов (lines, path, imports, exports, descendants, candidates, calls, ...)
├── utils/                # общие механизмы (не знают сущностей)
│   ├── imports.js        #   resolveImport / toRel
│   ├── queries.js        #   generic filter-движок (equals/in/gt/length/every/some/none/...) — по модели Keystone GraphQL filters, ноль семантики
│   ├── pattern.js        #   ОДИН компилятор паттернов
│   └── list.js
├── report/               # finding-фабрика + markdown-отчёт
├── pipeline.js           # checkFile: конвейер по 4 сущностям (сейчас utils/check-file.js)
├── main.js               # CLI
└── config.js             # ESLint-плагин
```

---

## 2. Что поддерживает / не поддерживает текущий код

Сопоставление с [architecture.yaml](/c:/Users/mikita.dusmikeev/Work/chomp-2/md-prettify/architecture.yaml).

### 2.1 `aliases` — ✅ полностью

[aliases.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/aliases.js) — плоский map, нормализация слэшей. Всё, что нужно.

### 2.2 `nodes` — ✅ в основном, но с оговорками

| Фича из YAML | Статус |
| --- | --- |
| `slug`, `name` (с `{kebab-case}`/`{camelCase}`/`{PascalCase}`/`{name}`), `parent`, `closed` | ✅ [nodes/tree.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/tree.js) |
| `children` — строки-шаблоны и `{name, forbidden, report}` | ✅ |
| `roles.required` / `roles.forbidden` на ноде | ✅ [nodes/roles.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/roles.js) (но см. §3.1 — смешение доменов) |
| `report` на ноде/ребёнке | ✅ |
| `parent: "."` (root) | ✅ |
| `{ spec: "..." }` у children (fileSpecs) | ⚠️ мёртвый код: `buildArchitecture` зовёт `buildTree(raw.nodes)` без второй аргументы, `fileSpecs` всегда `{}`. В YAML нет секции fileSpecs — выкинуть |

### 2.3 `codeRoles` — ❌ в основном не работает

| Фича из YAML | Статус |
| --- | --- |
| `infer`: 12 именованных kind'ов (`functionLike`, `noAssignmentToNonLocal`, `noCallToModules`, `returnsValueOrVoid`, `noLoopStatement`, `variableDeclaration`, `initializerIsObjectLiteral`, `objectLiteralPropertyCountAtLeast`, `objectLiteralHasMutablePropertyTypes`, `returnsObjectLiteral`, `returnedObjectHasMethodProperties`) | ❌ (а) реализации нет (`code-roles/primitives.js` отсутствует на диске); (б) **сама концепция отклонена**: именованные семантические предикаты — это обёртки вокруг ts-morph, которых быть не должно. Целевой формат — generic-факты ts-morph + filter-движок (§2.3.1) |
| `assert.structure.forbidden`: SyntaxKind-имена (`ClassDeclaration`, `AnyKeyword`) | ⚠️ частично в [classify.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/code-roles/classify.js:33) |
| `assert.structure.forbidden`: спец-имена (`AsExpressionToUnknown`, `nestedFunctionDeclaration`, `objectLiteralWithMutableMembers`, `assignmentToNonLocal`, `localState`, `singleCallForwardingAllParams`) | ❌ `STRUCTURE_FORBIDDEN` — не определена нигде |
| `assert.actions` (`deny: [roles]`, `deny: all`, `allow: {role: {min,max}}`, `unresolved: warn`) | ⚠️ частично в classify.js; `roleOfAction` — не определена нигде; `allow: true` (из YAML) не обрабатывается осмысленно |
| `noCallToModules.modules` — списки, где есть и npm-имена, и пути файлов (`apps/backend/host.ts`) | ❌ нет реализации вообще |

#### 2.3.1 Целевой формат: **generic-факты ts-morph + filter-движок** (по модели Keystone GraphQL filters)

**Решение (принято по итогам ревью, финальная форма):** в плагине нет ни одного предиката, ни одного сравнения, ни одного `max`/`limit`/`atLeast`. Плагин = **сбор фактов** + **один generic query-движок** в [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils). `infer`, `when`, `forbid`, `assert` — это **списки фильтров** (AND), а фильтры — данные YAML, не код.

**1. Факты** — названы натурально по ts-morph API, без всякой логики:

| Уровень | Факт | Что это |
| --- | --- | --- |
| файл | `lines` | число строк |
| файл | `imports` | список разрешённых импортов `{ module, name, local, line }` (через aliases) |
| файл | `exports` | список экспортов `{ name, local, line }` (имена — через aliases) |
| файл | `path` | `{ dir, fileName, filesPerFolder, folderFiles, subfolders, sharedPrefixes }` — всё про путь в одном объекте |
| файл | `scopeAccesses` | `{ name, kind, line }` для каждого property-access в файле (для `location`-проверок) |
| файл | `descendants` | список потомков файла `{ kind, depth }` (топ-уровень = `depth: 0`) |
| файл | `candidates` | список кандидатов (функции/переменные) с фактами ниже |
| файл | `roles` | список ролей (вывод infer) |
| кандидат | `kind` / `name` / `line` / `role` / `parentName` | базовые факты |
| кандидат | `moduleScope` / `exported` / `mutable` / `lines` | где и как объявлен |
| кандидат | `descendants` | список потомков `{ kind, depth }` |
| кандидат | `returns` | список `{ kind, exprKind, origin, members }` (origin = левый идентификатор цепочки, members — у object literal) |
| кандидат | `initializer` | `{ kind, exprKind, origin, members }` или null |
| кандидат | `calls` | список `{ kind, origin, action, module, forwardsAllParams, targetRole }` (единая сущность вызова) |
| кандидат | `assignments` / `declarations` / `parameters` / `mutatedParams` | мутации, декларации, параметры |
| кандидат | `declarations` | список `{ kind, ... }` |
| кандидат | `exported` | boolean: узел экспортирован |
| кандидат | `parameters` | список `{ name, type, optional, rest }` |
| кандидат | `lines` | число строк тела (для «функция слишком длинная») |

**2. Фильтры** — один набор на любой тип факта, по модели [Keystone filters](https://keystonejs.com/docs/graphql/filters/):

| Фильтр | Тип факта | Пример |
| --- | --- | --- |
| `equals`, `not` | любой | `kind: { equals: VariableDeclaration }` |
| `lt`, `lte`, `gt`, `gte` | число | `lines: { gt: 200 }` |
| `in`, `notIn` | скаляр/список | `kind: { in: [FunctionDeclaration, ArrowFunction] }` |
| `contains`, `startsWith`, `endsWith` | строка | `name: { startsWith: "use" }` |
| `isSet` | nullable | `returns: { isSet: true }` |
| `length` | список | `properties: { length: { gte: 3 } }` |
| `every`, `some`, `none` | список (вложенные фильтры) | `calls: { none: { resolvedModule: { in: [vscode, mobx] } } }` |

**Библиотеки: решение — не устанавливать.** Поиск по npm готового Keystone-style filter-движка: ничего целевого нет. `json-rules-engine` (1.65M dl/мес) — business-rule движок со своим форматом (fired rules, операторы `$eq`/`$gt`/`$in`, deps debug/params/object-hash) — пришлось бы писать адаптер, и «сэкономленного» кода не осталось бы; `odata-query` — чужой OData v4 flavor. А нужен рекурсивный матчер ~100 строк на 16 фильтров — свой `utils/queries.js` дешевле и проще в дебаге, чем интеграция чужого формата.

Пример переписанных ролей (смысл 1:1, вся семантика — в YAML, в плагине — только факты и движок):

```yaml
pureFunction:
  infer:
    - kind: { in: [FunctionDeclaration, MethodDeclaration, ArrowFunction, FunctionExpression] }
    - assignments: { none: { scope: { not: { equals: local } } } }
    - calls: { none: { resolvedModule: { in: [vscode, webstorm, mobx, mobx-state-tree, redux, "@reduxjs/toolkit", zustand, apps/backend/host.ts] } } }
    - returns: { isSet: true }
localState:
  infer:
    - kind: { equals: VariableDeclaration }
    - initializer: { equals: ObjectLiteralExpression }
    - properties: { length: { gte: 3 } }
    - properties: { some: { mutable: { equals: true } } }
```

Последствия решения:
- `code-roles/primitives.js` и «~10 именованных query-операторов» **не создаются** — вместо них [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils) (filter-движок, ~12 generic-фильтров, ноль семантики) + сбор фактов в `ast.js` (там же, где ts-morph);
- **YAML нужно переписать**: текущий `md-prettify/architecture.yaml` (секция `codeRoles`, строки 239–370) — исходный формат с именованными kind'ами, несовместим с целевым;
- тот же принцип для `assert.structure.forbidden`: спец-имена (`AsExpressionToUnknown`, `nestedFunctionDeclaration`, ...) — та же категория мусора. Целевой формат — фильтры над фактами кандидата (например `descendants: { some: { kind: { equals: AsExpression } } }`), а факт, которого нет в таблице выше, добавляется в сбор фактов как ещё один raw-счётчик — **никогда** как именованное правило.

### 2.4 `invariants` — ❌ ядро отсутствует

| Фича из YAML | Статус |
| --- | --- |
| Гейты `where` / `except` (glob) | ✅ [where.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/where.js), index.js |
| Гейт `when: rolePresent(...)` / `roleInside(...)` | ⚠️ [when.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/when.js) есть, но с багом (§4.3) и кросс-доменным импортом (§3.2) |
| Топ-уровневый `report` (finding для каждого подходящего файла) | ✅ index.js |
| `forbid: type: imports` | ❌ |
| `forbid: type: syntax` (`kind`, `pattern`, `typeKeyword`, `scope`) | ❌ (`resolveSyntaxKind` есть в ast.js, чекера нет) |
| `forbid: type: structure` — 13 именованных киндов | ❌ (а) чекеров нет; (б) **сама концепция отклонена**: в плагине нет ни одного кинда — только факты + фильтры, 5 из 13 — проект-правила md-prettify, которые выкидываются (§2.4.1) |
| `assert.roles.exactly` | ❌ |
| `must` (required imports) | ⚠️ нормализуется, но `checkMust` отсутствует (модуль `invariants/forbidden.js` **нет на диске**) |
| `children` (вложенные инварианты) | ✅ рекурсия в index.js |
| `node` (привязка к слугу ноды) | ⚠️ нормализуется, никогда не используется — либо реализовать гейт, либо выкинуть из формата |

**Главный пробел:** [invariants/index.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/index.js:10) требует `./forbidden` с `checkForbid, checkMust, checkAssert` — модуля нет. То есть **вся проверяющая часть инвариантов отсутствует**, при этом гейты (`where`/`except`/`when`) уже написаны и корректно отделены.

#### 2.4.1 Целевой формат `forbid: structure`: факты + фильтры, а не именованные кинды

**Решение (принято по итогам ревью, то же, что §2.3.1 для codeRoles):** плагин не содержит предметных правил и не содержит сравнений. Все 13 киндов — это либо **факты + фильтры** (выражаются в YAML), либо **мусор** (выкидывается).

**Выражаются через факты + фильтры (§2.3.1):**

| kind | Как в целевом формате |
| --- | --- |
| `maxLines` | факт `lines` + фильтр `{ gt: N }` (N — из YAML) |
| `onlyExportDeclarations` | факт `descendants` (depth 0) + фильтр `{ every: { kind: { in: [ExportDeclaration] } } }` |
| `fileIsOnlyReExports` | факт `descendants` (depth 0) + фильтр `{ every: { kind: { in: [ExportDeclaration, ImportDeclaration] } } }` (список — из YAML) |
| `maxFilesPerFolder` | факт `path.filesPerFolder` + фильтр `{ gt: N }` |
| `moduleScopeMutableVariableDeclaration` | факт `candidates` + фильтр `{ some: { moduleScope: { equals: true }, mutable: { equals: true } } }` |
| `requiredFile` | glob-совпадение `where` — уже есть в гейтах, ничего нового |
| `parameterTypeNameSuffix` / `exportedNameContainsUnderscore` | факт `name` + фильтры `{ startsWith }` / `{ contains }` |
| `imports` / `syntax` / `roles.exactly` | факты `imports` / `descendants` / `roles` + фильтры `in`/`notIn`/`equals` |

**Мусор (выкидывается из плагина безвозвратно, в YAML заменяется фильтром или умирает):**

| kind | Почему это мусор |
| --- | --- |
| `sameBasenameInMultipleFolders` | политика проекта «не дублировать имена» — не факт ts-morph |
| `sharedBasenamePrefix` | конвенция именования конкретного проекта |
| `filenameContainsParentFolderName` | конвенция именования конкретного проекта (если всё-таки нужно — фильтр `name: { contains: <parentFolder> }` в YAML, без кода) |
| `emptyBodyOrSingleCallForwardingAllParams` | предметная эвристика; если нужно — факты `descendants` + `calls` + фильтры в YAML |
| `maxLocalVariableDeclarationsOfCollectionType` | «CollectionType» — тип из проекта; если нужно — факт `declarations` + фильтр по `type` в YAML |

Принцип: **в плагине нет ни одного кинда — есть факты и один filter-движок.** Всё, что не выражается фактами + фильтрами, либо формулируется так в YAML, либо умирает при переписывании.

**Последствия:**
- `invariants/forbidden.js` в его исходной спецификации **не создаётся** — инварианты исполняются тем же [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils) над фактами файла/кандидата;
- секция `invariants` в [md-prettify/architecture.yaml](/c:/Users/mikita.dusmikeev/Work/chomp-2/md-prettify/architecture.yaml) переписывается вместе с `codeRoles` в формат «факт + фильтр»;
- тот же принцип уже действует для `assert.structure.forbidden` в codeRoles (§2.3.1).

### 2.5 Достаточность формата: что выражается в architecture.yaml

Проверка по категориям — покрывается ли «факты + фильтры» (§2.3.1) всё, что может понадобиться:

| Категория | Выражается | Как |
| --- | --- | --- |
| Имена файлов | ✅ | файл: `name` (basename) + `startsWith`/`contains`/`endsWith`/`in`/`notIn`; путь — гейты `where`/`except` (glob) |
| Имена функций/переменных/экспортов | ✅ | кандидат: `name` + те же строковые фильтры; «только camelCase-экспорты» = `exported: { equals: true }` + `name: { not: { contains: "_" } }` |
| Раздробление файлов (лимит строк, файлов в папке) | ✅ | `lines: { gt: N }`, `path.filesPerFolder: { gt: N }` — N из YAML |
| Раздробление функций (слишком длинная, вложенные, пустая) | ✅ | кандидат: `lines: { gt: N }`; `descendants: { some: { kind: { equals: FunctionDeclaration } } }`; `descendants: { length: { equals: 0 } }` |
| «Одна роль на файл» / состав ролей | ✅ | файл: `roles` + `equals`/`in` (список) |
| Импорты/вызовы в запрещённые модули | ✅ | `imports` / `calls.resolvedModule` + `in`/`notIn` |
| Параметры (тип, суффикс, количество) | ✅ | `parameters` + `length`/`some: { type: { endsWith: "Store" } }` |
| Синтаксис (классы, `any`, `as unknown`) | ✅ | `descendants` + `kind: { in: [...] }` |

**Вывод: формат generic-достаточен.** Всё, что встречается в реальных правилах (имена, лимиты, состав, раздробление), — это «факт + фильтр»; ни в одном случае не требуется новый код в плагине. Единственное расширение таблицы фактов, потребованное этой проверкой — `exported`, `parameters`, кандидат-`lines` (добавлены в таблицу §2.3.1).

### 2.6 CLI-поверхность

| Фича | Статус |
| --- | --- |
| `--config` (yaml/yml/json/js), `--ignore`, `--files`, `--out`, `--check`, `[cwd]` | ✅ [main.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/main.js) |
| Область сканирования: `--files`/`--ignore` (CLI), `ignoreDirs`/`ignores` (опции ESLint-правила); `exts` фиксированы (`.ts`, `.tsx`, `.js`, `.jsx`) | ✅ (из yaml вынесена) |
| orphan-файлы в отчёте | ❌ сломано, см. §4.1 |
| ESLint-правило + `flatConfig` | ⚠️ код есть, но несовместим с CLI-путём (§5) и падает по цепочке на отсутствующих модулях |

---

## 3. Смешение доменов (главная архитектурная проблема)

### 3.1 `nodes` делает работу `code-roles` — [nodes/roles.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/roles.js)

`checkNodeRoles` читает `ctx.roles` — это **вывод** code-roles-классификации. Нода не должна знать, как роли вычисляются: ей нужен только факт «роль R присутствует в файле».

**Как должно быть:** конвейер (pipeline.js) передаёт нодам результат классификации как готовый `Set<string>` через явный параметр, а не через общий `ctx`. Файл `nodes/roles.js` при этом остаётся в папке `nodes/` — это нормально: ожидание ролей на ноде описано в секции `nodes` YAML. Запрещено лишь, чтобы `nodes/*` сам вызывал что-то из `code-roles/*`. Сейчас прямого импорта нет (данные идут через ctx), но сам `ctx` — общее мутатируемое поле, и именно через него происходит смешение.

### 3.2 `invariants` тянет AST-помощник из `code-roles` — [invariants/when.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/when.js:9)

`const { nearestFunction } = require("../code-roles/classify")` — прямой импорт из чужой сущности. `nearestFunction` — это просто AST-хелпер, ему место в [ast.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js), откуда его могут брать обе сущности.

Сами `rolePresent`/`roleInside` как гейты — это **законно**: `when` в YAML и есть декларативная связь «инвариант → роли», данные приходят как готовый `roleCtx`. Но передавать их нужно параметром в `checkInvariants`, а не через общий `ctx.roleCtx`.

### 3.3 `code-roles/classify.js` делает две работы

[classify.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/code-roles/classify.js) одновременно (а) классифицирует ноды в роли и (б) проверяет `assert` ролей (`checkRoleAssert`, ~60 строк). Это две разные подзадачи сущности:

- `infer` + классификация → `classify.js`;
- `assert.structure` / `assert.actions` → отдельный `assert.js`.

Плюс `checkRoleAssert` шлёт findings с **хардкодом сообщений** (`Role "X" forbids structure "Y"`) в обход `report/`-механизма — все остальные сущности эмитят через `findingFrom` с поддержкой `report` из YAML. Роль-assert-нарушения не могут нести пользовательский `report` — это нарушение контракта отчёта.

### 3.4 Проектные концепции в generic-движке

- **`featureFolders`** в [main.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/main.js:31) — «фича» это концепция конкретного проекта (md-prettify), а не универсального движка. В целевом YAML её нет. **Выкинуть**: если инвариантам нужен «родительский фолдер», это покрывается `{dir}`/`{path}`-переменными и glob'ами.
- **`sliceOf`** (`*.v` vertical slice) в [utils/imports.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/imports.js:48) — та же проблема: концепция чужого проекта в общем механизме. Плюс **не используется нигде**. Выкинуть.
- **`ctx.slice`** в [invariants/name.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/name.js:6) — берётся из ctx, который никогда его не заполняет. Выкинуть.
- **`docs: "Enforces the vertical-slice architecture..."`** в [config.js:50](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/config.js:50) — описание правила привязано к чужой архитектуре; заменить на «architecture defined in architecture.yaml».
- **пример `widget.ts`** в комментарии [nodes/tree.js:29](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/tree.js:29) — нейтральный пример, допустимо, но переименовать в `example.ts` при правке файла.
- **примеры с `feature`/`service`** в [README.md](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/README.md) (11 вхождений) — переписать на нейтральные имена в рамках этапа 3 (п. 20).

### 3.5 Оркестратор лежит в `utils/`

[utils/check-file.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/check-file.js) — это **ядро конвейера**, которое знает все 4 сущности одновременно. `utils/` должен быть для механизмов, не знающих сущностей. Перенести на корень как `pipeline.js`.

---

## 4. Критические баги и сломанное

### 4.1 Отсутствующие модули (плагин не запускается)

| Требует | Модуль | Где |
| --- | --- | --- |
| `./utils/ts` (`createTsProject`) | **нет** (цель — в существующем `ast.js` на корне, см. этап 0 п. 1) | [main.js:14](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/main.js:14), [config.js:9](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/config.js:9) |
| `./primitives` (`fileCtx`, `satisfiesRole`) | **нет** | [classify.js:9](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/code-roles/classify.js:9) |
| `./forbidden` (`checkForbid`, `checkMust`, `checkAssert`) | **нет** | [invariants/index.js:10](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/index.js:10) |
| `STRUCTURE_FORBIDDEN` | не определена | [classify.js:37](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/code-roles/classify.js:37) |
| `roleOfAction` | не определена | [classify.js:52](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/code-roles/classify.js:52) |

### 4.2 Orphan-детект сломан — [nodes/tree.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/tree.js:168)

`matchers` проверяет `i.where?.re` — но `where` после normalize это **массив строк**, `.re` нигде не компилируется. `shouldCheck` всегда `false` → **каждый файл считается orphan**, секция Findings пуста. CLI-тест сейчас этого не ловит, потому что падает раньше (на `./primitives`).

### 4.3 `rolePresent` не видит роли функций — [invariants/when.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/when.js:31)

```js
const present = new Set([...roleCtx.functionNames.values(), ...roleCtx.variableRoles.values()].filter(Boolean));
```

`functionRoles` (Map fn→role) в объединение не входит. Роль, вычисленная на функции, но не имеющей имени (arrow function), `rolePresent` не увидит. Нужно `[...roleCtx.functionRoles.values(), ...]`.

### 4.4 `ctx.captures` не заполняется

[invariants/name.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/name.js:6) раскидывает `...ctx.captures` в переменные отчёта, но `buildFileContext` в [utils/check-file.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/check-file.js) поле `captures` не создаёт. Все `{feature}`-плейсхолдеры в `report` из YAML будут выводиться как есть.

### 4.5 Циклический require `main.js` ⇄ `config.js`

[config.js:6](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/config.js:6) требует `./main` в топе, [main.js:79](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/main.js:79) требует `./config` (лениво, внутри `main()`). Работает только потому, что деструктурирование в config.js срабатывает до полной загрузки main.js, а вызовы happen позже. Хрупко: любой новый топ-уровневый вызов `loadArchitecture` в config.js упадёт на `undefined`. `parseArgs` вынести в отдельный модуль (это CLI-забота, не ESLint-плагина).

### 4.6 `flatConfig` несовместим со схемой правила — [config.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/config.js:110)

`flatConfig` кладёт в опцию правила **объект** архитектуры, а схема правила объявляет `config: { type: "string" }` → ESLint отклонит конфиг на валидации. Плюс `loadArchitecture` в правиле вызывается **на каждый файл** (перечитывание + перепарсинг YAML), и `createTsProject()` — тоже на каждый файл.

### 4.7 Фрагильный парсинг `roleInside`

Регулярка `^roleInside\(([^,]+),\s*([^)]+)\)$` не терпит вложенных запятых/несколько вариантов после второй запятой. Для YAML-формата `roleInside(factory | orchestrator, localState)` хватает, но стоит парсить явно, а не regex'ом.

---

## 5. Несогласованные контракты

### 5.1 Две сигнатуры `checkFile`

- CLI: 8 аргументов (включая `repoFiles`, `featureFolders`) — [main.js:109](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/main.js:109)
- ESLint: 6 аргументов — [config.js:84](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/config.js:84)

В ESLint-пути `repoFiles` пустой → все cross-folder инварианты (`sameBasenameInMultipleFolders`, `maxFilesPerFolder`, `sharedBasenamePrefix`, `requiredFile`) **молча не работают** в редакторе. Нужна одна сигнатура: `checkFile(abs, arch, project, fileSet)`, где `fileSet` — описание набора файлов (список rel-путей + пофолдерные списки), одинаково доступное и CLI, и ESLint.

### 5.2 Два компилятора паттернов

- [nodes/children.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/children.js) — свой regex для плейсхолдеров: `\{([A-Za-z-]+)\}`
- [utils/pattern.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/pattern.js:42) — `compilePattern` с `\{([A-Za-z][A-Za-z0-9_-]*)\}`

Разные классы символов → одна и та же строка из YAML захватывает по-разному в зависимости от того, через какую сущность прошла. `compilePattern` сейчас **не используется никем**. Оставить один компилятор в `utils/pattern.js` и использовать его везде.

### 5.3 Форм findings: два пути

`nodes/roles.js` собирает findings руками (`{ file, rule, key, message, ... }`), игнорируя `findingFrom` и `report` из YAML (у ноды есть `report` для closed-нарушений, а вот для roles-нарушений отчёт хардкодирован). Все findings обязаны идти через `report/report.js`.

### 5.4 Двойная нормализация списков

`listOf` есть и в [utils/list.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/list.js), и локально в [invariants/normalize.js:8](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/normalize.js:8) (с разными семантиками: один мапит `Array.isArray ? v : [v]`, другой `v == null ? [] : ...`). Убить локальный, оставить общий.

---

## 6. Мёртвый код / лишнее (выкинуть)

| Что | Где | Почему |
| --- | --- | --- |
| `sliceOf` | [utils/imports.js:48](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/imports.js:48) | не используется; чужая проектная концепция (`*.v`) |
| `importEntry`, `resolveImport` | [utils/imports.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/imports.js) | не используются никем (forbid-imports ещё не написан — вернуть вместе с ним) |
| `compilePattern`, `checkRegex` | [utils/pattern.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/pattern.js) | не используются (см. §5.2 — сделать их единственным компилятором) |
| `listOf` | [utils/list.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/list.js) | не используется (локальные копии в normalize) |
| `STATEMENT_KINDS`, `LOOP_KINDS`, `TYPE_DECL_KINDS`, `CALL_TARGET_KINDS`, `EXPRESSION_KINDS`, `BRANCH_KINDS`, `WRITE_OPERATOR_TOKENS`, `isBuiltinSymbol`, `isExternalSymbol`, `isStatementNode`, `isLoopNode`, `isTypeOnlyDecl`, `isCallTarget`, `isBranchNode` | [ast.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js) | из всего ast.js реально используются только `SK`, `isFunctionNode`, `resolveSyntaxKind`. Остальное — инфраструктура под CFG/PDG/CallGraph, которой нет. Либо выкинуть, либо реализовать infer-канды, которые её потребляют, — но не держать мёртвым |
| `resolveSpecChild` + ветка `spec` в `normalizeChild` | [nodes/tree.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/tree.js:21) | fileSpecs в целевом YAML нет; `buildTree` всегда получает `{}` |
| поле `node` инварианта | [invariants/normalize.js:17](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/normalize.js:17) | нормализуется, не используется; в YAML тоже нет. Либо гейт, либо удалить из формата |
| `pnpm-lock.yaml` | в корне плагина | репозиторий на bun; `bun.lock` уже есть |
| `featureFolders` | [main.js:31](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/main.js:31), check-file.js | проектная концепция, в YAML нет |

---

## 6a. Что именно было удалено (по файлам) и куда ушла функциональность

Старая плоская структура (`entities/*.js` + `invariants/*.js` + один `utils.js` + `report/eslint.js`) заменена 4-сущностной (`nodes/`, `code-roles/`, `aliases.js`, `invariants/`, `utils/`, `report/`). Ниже — честный пофайловый учёт: что содержало каждый удалённый файл, куда переехала его работа, и что **бессовестно утеряно** (не переписано в новый filter-движок).

### Источниковые файлы (10)

| Удалён (HEAD) | Было строк | Что содержал | Куда ушло | Статус |
| --- | --- | --- | --- | --- |
| `entities/aliases.js` | 10 | резолв алиасов (`{aliases: {…}}` → нормализованный словарь) | [aliases.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/aliases.js) (корень, 12) | ✅ перенесено 1:1 |
| `entities/nodes.js` | 134 | сбор дерева нод, `closed`/`forbidden`, детект children | [nodes/tree.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/tree.js) (191) + [nodes/children.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/children.js) (40) + [nodes/connector.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/connector.js) (52) + [nodes/finally.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/finally.js) (299) | ✅ перенесено + расширено (variant-aware home в `finally.js`) |
| `invariants/forbidden.js` | 98 | именованные `forbid.kind` (imports/syntax/structure) | [invariants/index.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/index.js) (164) + [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/queries.js) (155) — единый filter-движок | ✅ переписано в «факт + фильтр» |
| `invariants/when.js` | 20 | гейты `when`/`except` | [invariants/where.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/where.js) (12) + [invariants/normalize.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/invariants/normalize.js) (30) | ✅ перенесено |
| `invariants/ast-helpers.js` | 26 | мелкие AST-хелперы | [ast.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js) (746) | ✅ влит в `ast.js` |
| `invariants/ast-cfg-pdg.js` | 59 | CFG/PDG (control/data flow) | — | ⚠️ **утеряно**: в новом движке нет CFG/PDG; потребовали бы infer-канды, которых нет |
| `invariants/flow-structure.js` | 50 | `maxStatementKinds`, `maxCallersPerFunction`, `noCallGraphCycles` | — | ⚠️ **утеряно**: CallGraph/циклы/лимит вызывающих не переписаны |
| `invariants/folder-structure.js` | 377 | **16 именованных `forbid.kind`** (см. ниже) | частично: факты `path.filesPerFolder` ([ast.js:433](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js:433)) и `emptyBody` ([ast.js:674](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js:674)) | ⚠️ **частично утеряно** — см. таблицу ниже |
| `report/eslint.js` | 45 | формат вывода ESLint | [report/report.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/report/report.js) (54) + [report/user-report.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/report/user-report.js) | ✅ перенесено |
| `utils.js` | 130 | мешалка: импорты, паттерны, списки, отчёт | [utils/imports.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/imports.js) (47) + [utils/pattern.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/pattern.js) (85) + [utils/list.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/list.js) (5) + [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/queries.js) (155) + [utils/report.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/report.js) (4) | ✅ распилено по сущностям |

### Тестовые файлы (4)

| Удалён (HEAD) | Было строк | Замена |
| --- | --- | --- |
| `tests/invariants.test.mjs` | 739 | [tests/invariants/invariants.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/invariants) + [tests/queries/queries.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/queries) |
| `tests/nodes.test.mjs` | 179 | [tests/nodes/multi-parent.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/nodes) + [tests/finally-follow-architecture/{home,location,home-multi-parent}.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/finally-follow-architecture) |
| `tests/utils.test.mjs` | 129 | [tests/pattern/pattern.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/pattern) + [tests/ast/ast.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/ast) |
| `tests/e2e.test.mjs` | 94 | [tests/cli/cli.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/cli) + [tests/report/report.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/report) |

Итого: **14 файлов, −2090 строк** (git `diff --stat HEAD --diff-filter=D`).

### ⚠️ Что реально утеряно как способность (а не «перенесено»)

`folder-structure.js` (377 строк) нёс 16 именованных `forbid.kind` + 3 flow-кинда. В новом filter-движке переписаны **только 2 факта** (`filesPerFolder`, `emptyBody`). Остальное — именованные предикаты, которых в новом движке нет. Текущий `architecture.yaml` **ни одного** из них не использует, поэтому линт не падает — но способность удалена:

| Именованный `forbid.kind` (было) | Есть в новом движке? | Как выразить «факт + фильтр» |
| --- | --- | --- |
| `maxLines` | ✅ | `{lines: {gt: N}}` (факт `lines` есть) |
| `maxFilesPerFolder` | ✅ | `{path: {filesPerFolder: {gt: N}}}` |
| `noEmptyFunctions` | ✅ | `{emptyBody: {equals: true}}` |
| `noFolderNameInFilename` | ❌ | нужен факт `path.folderName` + фильтр |
| `noDuplicateBasenamePrefix` | ❌ | нужен факт по basename-префиксу в папке |
| `noEntitySpread` | ❌ | нужен факт по spread-операторам |
| `storeTypeInParam` | ❌ | нужен факт по типам параметров |
| `maxSelfPropsPerMethod` | ❌ | нужен факт по self-мутациям в методе |
| `noLocalStateAssignments` | ❌ | нужен факт по локальным присваиваниям |
| `maxMethodsInReturnedObject` | ❌ | нужен факт по объекту, возвращаемому fn |
| `maxExportsPerFile` | ❌ | нужен факт `exports.length` |
| `noNestedFunctions` | ❌ | нужен факт по вложенным fn |
| `maxLocalCollections` | ❌ | нужен факт по локальным коллекциям |
| `barrel` / `reExportOnly` | ❌ | нужен факт по re-export'ам |
| `maxStatementKinds` / `maxCallersPerFunction` / `noCallGraphCycles` (flow) | ❌ | нужен CallGraph-факт |

**Решение на выбор** (пока не принято): (а) вернуть эти 14 киндов как **generic-факты + фильтры** в `ast.js`/`utils/queries.js` (без именованного кода — только факты, как в §2.3.1), или (б) зафиксировать как **осознанно отброшенные** способности и закрыть этот список. Пока это «висяк»: формат в README/§2.3.1 их не упоминает, а YAML их не использует.

---

## 7. README устарел

[README.md](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/README.md) описывает **другую, более старую версию API**:

- `when` описан как JS-функция/строка с `ctx` (включая `ctx.file`, `ctx.imports`, `ctx.enclosingFunctionName`) — в коде `when` это строка-предикат `rolePresent`/`roleInside`, а `ctx` имеет совсем другой вид;
- `forbid.type: "fileContent"` (построчный regex) — в коде такого типа нет, в YAML тоже;
- нет ни слова о `codeRoles`, `assert.roles.exactly`, `type: "structure"` (13 киндов), `roles.required/forbidden` на нодах;
- CLI-флаги: в README нет `--files`, в коде нет `[cwd]`-описания как в README;
- ESLint-опции: README описывает `{ config: "architecture.json" }`, а `flatConfig` передаёт объект;
- таблица `ctx` в README не совпадает с реальным `buildFileContext`.

README переписать после рефакторинга по фактическому формату (он должен 1:1 отражать структуру architecture.yaml).

---

## 8. План рефакторинга (порядок)

**Этап 0 — собрать скелет, чтобы плагин запускался**
1. `ast.js` (корень) — единственный вход в ts-morph, всё в одном файле: `createTsProject(cwd)` (один `Project` на run: минимальные compilerOptions, `skipAddingFilesFromTsConfig: true`, **без** `files`/`include`/`paths` из tsconfig репо — алиасы только из `aliases` в YAML; опционально подсмотреть из tsconfig лишь `compilerOptions` для синтаксических фич) + `loadSourceFile(project, absPath)` + уже существующие `SK` / `isFunctionNode` / `resolveSyntaxKind`. Ноль знания про сущности — чистый механизм «путь → AST». Отдельного `utils/ts.js` не создаётся. ESLint-путь: один Project на create правила, не на файл (§5).
2. `utils/queries.js` — generic filter-движок (§2.3.1): `equals`, `not`, `lt/lte/gt/gte`, `in/notIn`, `contains/startsWith/endsWith`, `isSet`, `length`, `every/some/none` — по модели Keystone GraphQL filters, ноль семантики. Исполняет списки фильтров (AND) над любым объектом фактов.
3. Сбор generic-фактов в `ast.js` (§2.3.1): `lines`, `imports`, `exports`, `path`, `scopeAccesses`, `descendants`, `candidates`, `roles` (файл); `kind`, `name`, `descendants`, `returns`, `initializer`, `calls`, `assignments`, `declarations`, `parameters`, `mutatedParams` (кандидат). Названия — натурально из ts-morph, без сравнений.
4. Переписать секцию `codeRoles` в [md-prettify/architecture.yaml](/c:/Users/mikita.dusmikeev/Work/chomp-2/md-prettify/architecture.yaml) (и `assert.structure.forbidden`) на «факт + фильтр» — 1:1 по смыслу текущих четырёх ролей.
5. `invariants/index.js` — исполнение `forbid`-фильтров (imports / syntax / structure) тем же `utils/queries.js` над фактами файла/кандидата + `checkMust` + `assert.roles.exactly`. Отдельного `forbidden.js`/`forbid/` с именованными киндами **не создаётся**.
6. Определить `STRUCTURE_FORBIDDEN` и `roleOfAction` в `code-roles/assert.js` (в целевом формате — как фильтры над фактами, см. §2.3.1).
7. Починить `matchers` (компилировать `where`-глобы в regex через общий компилятор) и `rolePresent` (§4.3).
8. Заполнять `ctx.captures` в конвейере.
9. `bun test` зелёный + CLI-прогон на md-prettify.

**Этап 1 — разделить домены**
10. `classify.js` → только классификация (исполнение infer-фильтров через `utils/queries.js`); `assert.js` — проверки assert (с `report`-контрактом через `findingFrom`).
11. `nearestFunction` перенести в `ast.js`; убрать импорт из `code-roles` в `invariants/when.js`.
12. Явные параметры вместо общего мутабельного `ctx`: `checkNodeRoles(ctx, arch, out, roleNames: Set)`, `checkInvariants(invariants, ctx, out, findingFrom, roleCtx)`.
13. `utils/check-file.js` → `pipeline.js` на корне.
14. Убрать `featureFolders`, `sliceOf`, `ctx.slice`, fileSpecs-ветку, поле `node` инварианта.

**Этап 2 — единые контракты**
15. Одна сигнатура `checkFile(abs, arch, project, fileSet)`; ESLint-правило строит `fileSet` из `repoFiles` (readDir по дереву до корня архитектуры — один раз на run, не на файл).
16. Один компилятор паттернов (`utils/pattern.js`), один `listOf` (`utils/list.js`), все findings через `findingFrom`.
17. Разорвать цикл `main` ⇄ `config`: `parseArgs` → `cli/args.js`; `config.js` не требует `main.js` (общее — в `load.js`).
18. Исправить `flatConfig` (схема правила принимает объект; `loadArchitecture` и `createTsProject` — один раз на create, не на файл).

**Этап 3 — чистка и документация**
19. Выкинуть мёртвый код из §6, удалить `pnpm-lock.yaml`.
20. Переписать README по фактическому формату (включая «факт + фильтр» из §2.3.1).
21. Тесты: по одному на каждый фильтр `utils/queries.js`, каждый гейт; CLI-тест на orphan-детект; ESLint-тест через Linter (чтобы ловить расхождение CLI/ESLint путей — §5.1).

---

## 8a. Раунд: de-hardcode action, `home` → `path`, `scopeRoots` → dot-joined `scopeAccessors`

Три требования, закрытые в этом раунде:

1. **Никакого хардкода `role === "action"` в правиле.** Удалены оба места в [nodes/finally.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/finally.js):
   - спец-ветка в сообщении misfit («move it OUT as a plain exported function… actions/… store.ts») — теперь единое сообщение для любой роли: ``A `<role>` (`<label>`) belong in `<destination>` ``;
   - action-язык в `fix` финального findings — теперь generic: «Move each listed item to the destination named next to it — the architecture declares where every code-role lives».
   - Action-специфичная подсказка теперь живёт **в yaml** через существующий механизм role-level `report` (как у `sharedTypes`): `md-prettify/architecture.yaml` → роль `action` получила `report.message/fix` с переменными `{what}`, `{path}`, `{destination}`, `{destinationSlug}`. Переименуешь роль в `event`/`sobytie` — логика не сломается, т.к. в коде правила нет ни имени роли, ни слова `actions`.

2. **Оператор `home` удалён, добавлен `path`** — тот же интерфейс, что у `location.allowedFrom` (строка-glob / `{node: slug}` / query). Реализован в [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/queries.js) (matchScalar, KNOWN_OPS). В `infer` ролей пишется `path: {node: backend-feature-actions}` или `path: "apps/backend/*/actions/**"`. Node-level поле `home:` на нодах (декларация «домов» ролей) — легитимная отдельная сущность, осталось как есть.

3. **`scopeRoots` удалён полностью.** `scopeAccessors` теперь принимает **dot-joined префиксы цепочки** — единое поле для всех форм доступа, longest-match-wins:
   - `getRoot` → `getRoot(self).x` (call-rooted, Identifier callee);
   - `global` → `global.x.y` (identifier-rooted);
   - `self.root` → `self.root.storeA.doX()`;
   - `parent.get` → `parent.get("name").feature` (call с PropertyAccess callee).
   Реализация: [ast.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js) `scopeAccessOf` строит сегменты базы цепочки и сравнивает с `acc.split(".")`. Убран из main.js / pipeline.js / roles.js / finally.js / yaml.

4. **Позиционное связывание `{placeholder}` в `allowedFrom`** ([nodes/tree.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/nodes/tree.js)). Проблема: в реальном yaml фичевые папки — **литеральные** ноды (`backend-document` и т.д.), а `{kebab-case}` встречается только в `allowedFrom`-глобах. Без связывания `targetCapsFor` возвращал `{}`, и `entryMatches` трактовал несвязанный плейсхолдер как wildcard → кросс-фиче импорты молча проходили. Фикс: `placeholderPositions(arch)` сканирует все `allowedFrom`-глобы и находит фиксированный индекс сегмента плейсхолдера; `targetCapsFor` связывает его с сегментом целевого пути (секции с `{` пропускаются). Имя роли/фичи теперь берётся из самого пути, а не из дерева нод.

**Итог проверки:** vitest 150/150 (кросс-стор тест: plain-function actions + `path:`-infer + 4 формы dot-доступа; новый блок «literal feature folders»: свой-фиче импорт проходит, кросс-фиче импорт флажится и под template-архитектурой, и под реальной формой с литеральными папками); скан md-prettify — 45 findings, все легитимные: кросс-фиче импорты (reparse/resolve → document/store.ts) теперь флажатся, state-bag, `editor/` не узел, store.ts >200 строк, unused vars, complexity.

## 8b. Раунд: `path` → `location`, `assert.actions` → `assert.descendants`, структурированные `scopeAccessors`

Три требования, закрытые в этом раунде:

1. **Оператор `path` переименован в `location`** — переиспользование уже имеющегося интерфейса `location` (та же entry-форма: строка-glob / `{node: slug}` / query), а не нового имени. [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils/queries.js): KNOWN_OPS + case в matchScalar. Один общий query для нод и для code-roles. Поле-факт `path` (относительный путь файла) и доступ к фактам вида `path.filesPerFolder` — не тронуты, это другое.

2. **`assert.actions` / `checkActions` → `assert.descendants` / `checkDescendants`** ([code-roles/assert.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/code-roles/assert.js)). Имя механизма не могло называться в честь единственной записи реального yaml — это хардкод по имени. Теперь имя описывает механику: проверка по потомкам кандидата.

3. **`scopeAccessors` — структурированные `{ kind, segments }` вместо плоских dot-joined строк.** Плоский список (`getRoot`, `get`, `global`, `self.root`, `parent.get`) был неоднозначен: невозможно было адекватно разделить, что берётся через `getRoot()`, что через `get`, что через `self.root.value`. Теперь kind = базовая форма цепочки, и аксессор никогда не конкурирует с другим kind на одной цепочке:
   - `call` — `getRoot(self).x` (вызов с Identifier-callee);
   - `identifier` — `global.x.y`, `self.root.x` (обычный идентификатор; segments = базовый идентификатор + ведущие свойства, longest wins);
   - `methodCall` — `parent.get("name").x` (вызов с PropertyAccess-callee).
   Реализация: [ast.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js) `scopeAccessOf` сначала классифицирует форму базы цепочки, затем ищет аксессор того же kind с точным совпадением сегментов (никакого prefix-сопоставления). Нормализация с валидацией — [code-roles/roles.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/code-roles/roles.js) `normalizeScopeAccessor` (плоская строка = явная ошибка); union по архитектуре — [main.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/main.js) (dedupe по `kind:segments`).

**Итог проверки:** vitest 150/150; реальный yaml переведён на структурированную форму; документация ([how-to-use-actions-in-mobx.md](/c:/Users/mikita.dusmikeev/Work/chomp-2/how-to-use-actions-in-mobx.md)) обновлена.

## 8c. Раунд: фабрика в `actions/` больше не легальна

Предыдущий гайд (от другого агента) описывал **устаревший** плагин: `calledBy: {equals: "actions"}`-инференс и строки ast.js 641/686. В текущем yaml роль `action` выводится по **локации** (`infer: [location: {node: backend-feature-actions}]`), и из этого следовала дыра: ЛЮБАЯ функция в `actions/` (включая стрелку фабрики) получала роль `action`, узел не имел `kind` → `fitsRole` проходил → фабрика `createXActions = (self) => ({...})` была легальна, а `state-lives-in-store` её exempt-ил.

Фикс — **100% config-level, в yaml, без единой строки кода плагина**:

1. **`action` infer** ([md-prettify/architecture.yaml](/c:/Users/mikita.dusmikeev/Work/chomp-2/md-prettify/architecture.yaml)): второе AND-условие `returns: { none: { exprKind: { equals: ObjectLiteralExpression } } }` — функция, чьё тело **возвращает объект-литерал**, не action. Дискриминатор — факт `returns` из [ast.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/ast.js) (`exprKind` = ts-morph kind выражения, сданного return / expression-body). Обычный action (`returns: []`) проходит, фабрика (`exprKind: "ObjectLiteralExpression"`) исключается → падает в `pureFunction`.
2. **`backend-feature-actions` узел**: `kind: [action]` — фабрика-`pureFunction` в `actions/` теперь misfit по `checkFinally` (`A \`pureFunction\` (createXActions) belong in …`), плюс её `self.x = 1` флажится инвариантом (exemption `role: {not: "action"}` на неё уже не распространяется).

Условие generic: ни одно имя роли, библиотеки или папки в нём нет — любой location-inferred role несёт тот же `returns.none.exprKind`.

**`state.param = value` легально** — это и есть action; инвариант exempt-ит `role: action`, и менять тут ничего не нужно. Фабрика — единственный запрещённый shape.

**Итог проверки:** vitest 152/152 (новый [action-shape.test.mjs](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/tests/finally-follow-architecture/action-shape.test.mjs): plain action → 0 findings, фабрика → misfit + state-bag); скан md-prettify — 45 findings (без изменений, `actions/` пока не существуют). [how-to-use-actions-in-mobx.md](/c:/Users/mikita.dusmikeev/Work/chomp-2/how-to-use-actions-in-mobx.md) — раздел «What an action is (and what is not)».

## 9. Итог

- **Поддерживается сейчас:** aliases, nodes (дерево, closed/forbidden, роли на нодах), гейты инвариантов (where/except/when), топ-уровневый report, CLI-флаги, markdown-отчёт.
- **Не поддерживается:** весь `infer` codeRoles, почти весь `assert` codeRoles, все `forbid`-типы инвариантов (imports/syntax/structure), `assert.roles.exactly`, `must`, captures в отчётах, orphan-детект (сломан), ESLint-путь (несогласован с CLI).
- **Смешение доменов:** nodes→code-roles через общий ctx; invariants→code-roles прямой импорт; classify.js делает работу assert; проектные концепции (`featureFolders`, `*.v` slice) в generic-движке; оркестратор в `utils/`.
- **Ключевое решение (codeRoles + invariants + assert):** в плагине нет ни одного именованного предиката, кинда или сравнения. Плагин = **generic-факты ts-morph** (названия натурально из ts-morph: `lines`, `path`, `imports`, `descendants`, `candidates`, `calls`, `assignments`, ...) + **один filter-движок** [utils/queries.js](/c:/Users/mikita.dusmikeev/Work/chomp-2/follow-architecture/utils) по модели Keystone GraphQL filters (`equals`, `in`, `gt`, `length`, `every/some/none`, ...). Вся семантика — в YAML как «факт + фильтр». YAML (секция `codeRoles` + `assert.structure.forbidden` + `invariants.forbid`) переписывается 1:1 по смыслу (§2.3.1, §2.4.1).
- **Библиотеки: не устанавливать.** Готового Keystone-style filter-движка в npm нет; ближайшие (`json-rules-engine`, `odata-query`) — чужие форматы, над которыми пришлось бы писать адаптер. Движок = ~100 строк своего кода (§2.3.1).
- **Достаточность формата:** проверено по категориям — имена файлов, имена функций/экспортов, лимиты строк/файлов, раздробление функций, состав ролей, импорты/вызовы, параметры — всё выражается «факт + фильтр» без нового кода в плагине (§2.5).
- **Главное:** два отсутствующих модуля (`ast.js` на корне — вход в ts-morph + сбор фактов, `utils/queries.js` — filter-движок) — это и есть весь непрописанный объём движка; `invariants/forbidden.js` с именованными киндами не создаётся вовсе. Остальное — разделение, контракты и чистка.


---

## 8d. Раунд: `home` удалён — единый интерфейс `location`

Узловое поле `home: [role, ...]` было вторым, дублирующим интерфейсом
ответа на «где живёт роль». Теперь это `location.declaration: [role, ...]` —
тот же самый `location`, что и `import`/`usage`/`scopeAccess`.

- `nodes/tree.js` — `parseLocation` парсит `declaration` как список ролей
  (старая форма `{node: slug}` не использовалась нигде и удалена); `make`
  больше не копирует `home`.
- `nodes/finally.js` — `homeByRole` → `declarationByRole` (читает
  `n.location.declaration`), `homeInstance` → `declarationInstance`,
  `underAnyHomeVariant` → `underAnyDeclarationVariant`; логика `fitsRole`
  и `destinationFor` без изменений.
- `md-prettify/architecture.yaml` — `backend-commands` и
  `backend-feature-actions`: `home:` перенесён в `location.declaration`.
- Тесты: 4 файла переведены на `location: { declaration: [...] }`.

Проверка: vitest 152/152; скан md-prettify — 45 findings (без изменений).

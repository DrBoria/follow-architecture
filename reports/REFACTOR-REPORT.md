# follow-architecture: полный рефакторинг-унификация (2026-11-18)

Задача: закоммитить текущее состояние, сделать бэкап-ветку `dump`, полностью
переписать движок саб-агентом DeepSeek V4.1 Flash с максимальной унификацией
при 100% сохранении функциональности, перепроверить результат против dump
(тесты, eslint-output, visual отчёта), дать полный отчёт.

## 1. Коммит и бэкап

- Всё текущее состояние закоммичено: `1ca23bb` «styles round: content-based
  CSS gate, external-module facts, tailwind const class lists, role-example
  highlighting, named role boxes, lane routing fix» (28 файлов, +850/−66).
- Создана ветка **`dump`** на том же коммите — точная копия до переписывания.
- Переписывание шло в рабочем дереве `main`, **без коммитов** (как и раньше).

## 2. Кросс-анализ дубликатов (до переписывания)

Запущены оба инструмента по всей папке с кросс-поиском (каждая функция против
каждой, не только против canonical):

- **entities-uniqueness** (`--roots .`): 126 файлов, 68 сущностей →
  **1 дубликат** (wrongAction ≈ wrongPlacement, 0.92) + **9 extraction-кандидатов**
  (VERBS/NOUNS/BASES — три таблицы с одними 8 ключами; representation-объекты
  fileContents/unknownRole/wrongPlacement/wrongAction одной формы).
- **utils-uniqueness** (`--roots . --app-roots . --parts`): 127 файлов,
  1384 утилиты против 1384 → **170 дубликатов, 650 similar, 8 missing-util кластеров**.

Техническая деталь: utils-uniqueness падал на CJS-файлах движка
(`Cannot read properties of undefined (reading 'flags')` — type checker
пытался ПРОВЕРЯТЬ JS). Решение: `tsconfig.scan.json` с `checkJs:false` +
`md-code-utils-uniqueness.config.js`, указывающий на него. После этого
0 parse-ошибок, полный кросс-отчёт.

Отчёты: `reports/entities-self.md`, `reports/utils-self.md` (+ catalog json).

## 3. Что сделал саб-агент (DeepSeek V4.1 Flash)

16 файлов изменено, +189/−325 строк, 4 новых модуля. Все унификации:

| Было (дубликат) | Стало (общее место) |
|---|---|
| `enumFact` (enums.js) ≈ `typeFact` (types.js), 0.99 | новый `entities/ast/declaration.js#declarationFact` — общая форма кандидата «декларация без кода», каждый supplying свои members |
| `decoratorsOf` в classes.js ≈ тот же в modifiers.js, 0.96 | classes.js импортирует `decoratorsOf` из modifiers.js |
| `linesOfRange` (comments.js) ≈ `linesOf` (tree.js), 0.82 | новый `tree.js#rangeLines(first,last)` — один spelling «диапазон строк», оба читателя используют его |
| `deref` ≈ `resolved` + два одинаковых alias-цикла в file.js, 0.95 | `followAlias` + `followDeclChain` — один обход символов и одна цепочка алиасов на все три «whose value/type» вопроса |
| `rootNodeOf` ≈ `callRootOf` (assignments.js), 0.90 | общий `walkToRoot` — один обход access-chain, два вопроса («что записано?» / «через какой call?») |
| `valueAt` (roles.js) ≈ `fieldOf` (utils/field.js), 0.90 | `valueAt` делегирует в `fieldOf` — один list-aware читатель полей |
| `callsOf`/`readsOf`/`assignmentsOf`/DECLARE/IMPORT/EXPORT — одинаковая форма ребра, 0.88–0.92 | один `edgeOf(facts, edge)` в kinds.js — роль куска ищется в одном месте, продюсеры различаются только значениями |
| `describeCondition` (data/invariants.js, CJS) ≈ `describeQuery` (src/utils/describe.js, ESM), 0.93 | новый CJS `report/user-report/shared/describe.js` — один обход query; различия только в презентации (options: ignore, setValue); ESM-сторона импортирует его (esbuild бандлит CJS), CJS-сторона require |
| kind-счётчики/фильтры в GraphScreen.jsx ≈ TreeScreen.jsx, 0.82–0.93 | новый `src/utils/edges.js` (`edgeKinds`/`edgeKindCounts`/`edgesOfKind`) — три чтения рёбер написаны один раз |
| VERBS/NOUNS/BASES — три таблицы с одними ключами, 0.86 | одна таблица `WORD` по relation, три view derive через `column(field)` — новый relation добавляется один раз |
| локальный `isObj` в invariants/index.js | импорт `isObj` из entities/queries.js (экспортирован вместе с isList) |

### Что НЕ унифицировано (осознанно)

- **`isCssDocument` ≈ `isWholeRead` (0.86)** — false positive: разные домены
  (грамматика CSS vs позиция чтения в AST), общая форма цикла, не общая логика.
- **`variablesOf` ≈ `mixinsOf` (scss.js, 0.95)** — похожая форма walk, но
  разные источники (decls vs at-rules) и разные формы факта; слияние дало бы
  параметризованный монстр вместо двух понятных читателей.
- **`classify` в errorTypes/types/*.js (0.88)** — каждый classify решает свой
  вопрос о типе finding'а; общая форма «прочитай violation → верни story»,
  но содержание разное; унификация спрягла бы три независимых решения.
- **`roleFitsAt`/`instanceAt`/`fitsRole` (0.81–0.85)** — пересекаются формой,
  но отвечают на разные вопросы (file-in-home / folder-is-instance /
  role-fits-file) и уже зовут общие примитивы tree; further merge смешал бы
  три семантики.
- **`structureOf` (tailwind) ≈ `leafOf` (location), 0.83** — разные домены
  (class-token vs path-segment), совпадение формы split/index, не логики.
- Остальные ~140 «дубликатов» отчёта — анонимные коллбеки одинаковой формы
  (map/filter-обёртки), не самостоятельная логика.

## 4. Баг-вопросы саб-агента

Саб-агент не вынес новых баг-вопросов (протокол был: замеченный баг —
спросить оркестратора, не чинить молча). Ранее известные и уже обсуждённые
с пользователем items (не переподнимались): `{vars}` не подставляется в
css-var-not-from-theme; border-color флагуется family-правилом вопреки README;
styleInversion не проверяет реальный swap. Эти три остаются открытыми
вопросами к пользователю — в этом раунде не чинились (задача была унификация,
не фиксы).

## 5. Верификация против dump

| Проверка | Результат |
|---|---|
| `npx vitest run` | **48 файлов / 454 теста — все зелёные** (baseline dump: 48/454) |
| `node --check` всех изменённых .js | 0 syntax-ошибок |
| ESLint-output: `--out` отчёт против md-starter, diff с dump-baseline | **DIFF_LINES=0** — 21812 строк идентичны байт-в-байт |
| Overview payload: JSON `arch-data` dump vs rewrite, структурный diff | **0 расхождений** (кроме meta.generatedAt); stats идентичны: 15 nodes / 15 roles / 28 invariants / 1744 findings / 454 files / 127 edges |
| Visual: скриншоты rewrite-отчёта в браузере | подсветка cssVariable (`gap`), именованные плашки ролей, граф apps, finding Badge, summary — визуально идентичны dump (скриншоты 16–19 в `md-starter/reports/arch-explain/`) |
| Кросс-уникальность после | utils: **170→146 дубликатов, 650→628 similar**; entities: 1 dup / **9→6 extract** |

Оставшиеся 146 utils-«дубликатов» — в основном false positives и
анонимные коллбеки (см. §3 «не унифицировано»); реальные высоко-confidence
пары (enumFact/typeFact, decoratorsOf, describe*, valueAt/fieldOf,
rootNodeOf/callRootOf, linesOfRange/linesOf) устранены.

## 6. Что осталось и почему

- **scss variablesOf/mixinsOf, errorTypes classify, roleFitsAt/instanceAt/
  fitsRole** — не слиты осознанно (разные семантики, см. §3). Слияние ради
  цифры ухудшило бы читаемость без выигрыша в логике.
- **Три открытых баг-вопроса** ({vars}, border-color, inversion-swap) —
  ждут решения пользователя; в раунде унификации не трогались.
- **Коммит переписанного состояния** — не сделан по правилу «ничего не
  коммитить без команды»; dump-ветка хранит до-переписанное, рабочее дерево
  main хранит после-переписанное. Пользователь может сравнить `git diff dump`
  и закоммитить когда скажет.

## 7. Артефакты

- Ветка `dump` @ `1ca23bb` — бэкап.
- `reports/entities-self.md` / `reports/utils-self.md` (+ catalogs) — кросс-отчёты до/после.
- `tsconfig.scan.json` + `md-code-utils-uniqueness.config.js` — чтобы utils-uniqueness читал CJS без checkJs-краша.
- Новые модули: `entities/ast/declaration.js`, `report/user-report/shared/describe.js`, `report/user-report/src/utils/edges.js`.
- Скриншоты rewrite: `md-starter/reports/arch-explain/16-rewrite-cssvariable.png`, `17-rewrite-graph.png`, `18-rewrite-finding.png`, `19-rewrite-summary.png`.
- Baseline для сравнения: `/tmp/fa-dump-eslint.md`, `/tmp/fa-dump-overview.html`; rewrite: `/tmp/fa-rewrite-eslint.md`, `/tmp/fa-rewrite-overview.html`.
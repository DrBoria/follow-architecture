# follow-architecture: полный перевод на TypeScript + строгий ESLint (2026-11-19)

Задача (по команде пользователя):
1. Закоммитить всё текущее + ветка `dump` (бэкап).
2. Полностью переписать follow-architecture **НА TYPESCRIPT** саб-агентом
   DeepSeek V4.1 Flash / coder-agent: 100% функциональности, максимальная
   унификация (общее → в entities/utils и импортировать), кросс-анализ
   entities-uniqueness + utils-uniqueness по всей папке. Баги — сперва спросить
   оркестратора. Плюс: строгий ESLint как в code-diff (никаких any/unknown/
   assertions), uniqueness-правила — приказы, не предложения. Generic-подход:
   «а если другой заказчик будет использовать — подойдёт ли?» (css/scss/
   styled-components/tailwind, react/angular/vue).
3. Перепроверить против dump: тесты, eslint-output, overview (visual + payload).
   Полный отчёт: что сделано, что нет и почему. Всё лишнее удалить.

## 1. Коммит и бэкап

- `a514290` — весь pre-TS.state (JS-унификация + отчёты), ветка **`dump`** на нём.
- Перевод шёл в рабочем дереве `main`, **без коммитов** (по правилу).

## 2. Кросс-анализ (до/после)

| Скан | До (JS) | После (TS) |
|---|---|---|
| utils-uniqueness (all-vs-all, --parts) | 146 dup / 628 sim / 8 кластеров | **125 dup** / 822 sim / 11 кластеров |
| entities-uniqueness (all-vs-all) | 1 dup / 6 extract | 1 dup / 10 extract |

Рост similar/extract — следствие типизации: сканер теперь видит больше
мелких типизированных хелперов (2057 утилит против 1357). Оставшиеся 125
«дубликатов» — в основном структурные клоны однострочных операторов
(ln/lte/gt/gte, or/and/xor в queries.ts — 16 пар), парные продюсеры рёбер
(kinds.ts, уже делят edgeOf), и известные false-positives (scss
variablesOf/mixinsOf — разные postcss-обходы). Реальные высоко-confidence
пары прошлых раундов устранены. Отчёты: `reports/{entities,utils}-{before,after}-ts.md`.

## 3. Перевод на TypeScript (саб-агенты)

**177 файлов конвертировано**: 95 engine/report .js→.ts (CJS→ESM imports,
tsc компилирует обратно в CommonJS dist), 17 .jsx→.tsx + 17 browser .js→.ts,
48 тестов .test.mjs→.test.ts. Итого **261 .ts/.tsx исходник + 48 тестов**.
JS-исходников не осталось (только tooling: eslint.config.mjs,
md-code-utils-uniqueness.config.js).

Обвязка по образцу sibling entities-uniqueness:
- `tsconfig.json` (ES2022/CommonJS/react-jsx, outDir dist, declaration) +
  `tsconfig.eslint.json` (все исходники incl. browser src и tests).
- package.json: main/types/bin/exports → dist, files: dist + browser src +
  4 engine-источника для runtime-esbuild, scripts clean/build/typecheck/lint/
  test/prepublishOnly.
- `report/user-report/build/bundle.ts`: runtime-esbuild бандл browser src
  (main.tsx), кэш по mtime, SHARED_SOURCES следит за engine-модулями.
- Плагин-контракт сохранён: `require("@md-code/follow-architecture")` →
  `{meta, rules:{follow-architecture}}` (export = plugin).

### Новые общие модули (унификация + типизация)
- `entities/facts.ts` — ОДНА форма всех AST-фактов (Descriptor, MemberFact,
  Candidate, FileFacts, ImportFact/ExportFact… многие derive через
  Pick/Omit/ReturnType друг от друга — приказ uniqueness выполнен).
- `entities/architecture.ts` — ОДНА модель конфига (Arch, ArchNode, RoleDef,
  Invariant, WhereEntry, QueryFilter…) — все потребители импортируют отсюда.
- `entities/{token,repair,story,place,structure-facts,decision-ctx,
  overview-summaries,access-graph,findings,context}.ts` — формы отчёта,
  названные один раз.
- `entities/ast/loose.ts` — LooseNode-проба kind-специфичных методов без any.
- `utils/field.ts` — типизированный FieldValue + единственный читатель полей.
- `utils/{gate,verdicts,permission,seen,speak,record,template,resolve,…}.ts` —
  общие механизмы (admitsWhenNoneReject, worstWhenAllRefuse, permissionOf…).
- CSS: `css/syntax/{gate,provider}.ts`, `css/class-list.ts` — generic-гейт
  синтаксиса (провайдер решает, что его документ; движок не знает про
  tailwind/styled-components). Frameworks: react/vue/angular — фасеты с
  единым контрактом (applies/enrich), движок framework-free.

### Сплиты больших файлов (max-lines 200 / max-lines-per-function 60)
location.ts→location/{place,where,homes}; assignments.ts→4 модуля;
file.ts→{project,file-imports,file-exports,file-facts,resolve};
tree/build.ts, entries.ts — именованные шаги; config.ts→config-{options,
project,report,rule,state}; pipeline, graph.ts→graph-{helpers,edges,roles};
AccessGraph.tsx→access-graph/{styles,EdgeLayer,NodeBox,useZoomPan,loops};
layout.ts→layout/{types,geometry,occupancy,text-flow,label-search};
GraphScreen/TreeScreen→подмодули; и т.д. Публичные экспорты сохранены
(re-export из исходного модуля).

## 4. Строгий ESLint (приказ пользователя)

`eslint.config.mjs` — копия floor'а code-diff: no-any, no-unknown,
consistent-type-assertions: never, no-unsafe-*, explicit-module-boundary-types,
complexity≤10, max-depth≤3, max-params≤4, max-lines≤200, max-lines-per-function≤60,
no-nested-ternary/else-return/lonely-if/param-reassign, consistent-type-imports +
три uniqueness-плагина (utils/entities/component) как приказы.
**9458 ошибок → 0** за 6 проходов саб-агентов (deepseek + coder-agent).
Ни одного eslint-disable / @ts-ignore / any / unknown / as в исходниках.
Исключения (санкционированы пользователем): no-console для bin/main/notices/
cli-report; **tests/ полностью в ignores** (прямая команда «добавь просто
тесты в исключения»).

## 5. Баг-вопросы саб-агентов и их решение (оркестратор)

Саб-агенты вынесли вопросы, я проверил каждый против dump:
1. `SK.DoWhileStatement` не существует (do-while = DoStatement) — мёртвая
   запись в LOOP_KINDS. **Удалена** (поведение идентично).
2. Двойные `module.exports` в file.js/location.js — первый мёртв. При
   конвертации оставлен эффективный (поведение идентично).
3. `namespaceOf` читал `../package.json` (ломался из source-layout) —
   переведён на layout-aware `readOwnManifest` (идентичный результат).
4. `flatConfig` — мёртвый код (не экспортировался, 0 ссылок). **Удалён**.
5. Packaging: browser-бандл импортирует 4 engine-источника — добавлены в
   files (иначе published tarball не собрал бы overview).
6. `tree/index.ts matchers` читал `.re` у where-записей без компиляции —
   саб сохранил наблюдаемое поведение guarded-skip; вопрос открыт (см. §7).

## 6. Регрессии, найденные МОЕЙ перепроверкой против dump (и исправленные)

Саб-агенты отчитались «всё зелёное» на малых фикстурах, но полный прогон
md-starter выявил **6 регрессий** — все исправлены мной вручную:
1. **`{destination}` не подставлялся** (18 строк): `resolvePlace` читал
   `fieldOf(report,"fix.location")` и передавал результат в `fixLocationOf`,
   который ждёт fix-объект → двойное чтение пути → null. Исправлено:
   `fixLocationOf(fieldOf(report,"fix"))`.
2. **37 unplaceable-записей пропали** в overview: в collectEdges добавлен
   `if (!targets.length) continue`, которого не было в dump. Удалён.
3. **allowedRoles включал target-роль** (46 finding'ов с другим списком
   «only X may do it»): groupOf получал нефильтрованный places; dump фильтровал
   `others = all.filter(p => p.role !== targetSlug)`. Восстановлено.
4. **41 finding переехал в role-секции** (2 лишние секции barrel/pureFunction):
   группировка читала `data.violations` (список) вместо dump'овского
   `data.violation` (единственное) — relation-findings несут список, и их
   subject.roles (роли ФАЙЛА) не должны claims на role-группу. Добавлен
   singularToken только для группировки.
5. **Лишний `node:null` у 28 invariants** в payload: dump читал inv.node
   (undefined → ключ отсутствует в JSON). Поле убрано из InvariantSummary.
6. **plan.relation.paths лишние** (6 finding'ов): fallback на сырой
   targetPath вместо dump'овского `story.target?.paths ?? []`. Восстановлено.

## 7. Верификация против dump (финал)

| Проверка | Результат |
|---|---|
| `pnpm build` / `pnpm typecheck` | 0 / 0 |
| `npx vitest run` | **48 файлов / 454 теста — все зелёные** |
| `npx eslint .` | **0 ошибок** (tests в ignores по команде) |
| ESLint-output md-starter (`--out`, 21812 строк) | **diff = 0, байт-в-байт** |
| Overview payload (`arch-data` JSON) | **0 расхождений** (кроме meta.generatedAt); stats: 15 nodes / 15 roles / 28 invariants / 1744 findings / 454 files / 127 edges |
| Visual (браузер) | идентичен dump: граф, именованные плашки ролей, cssVariable-подсветка `gap`, self-rules ↻, табы 15/15/28/1744. Скриншоты 16-ts-graph.png, 17-ts-summary.png в md-starter/reports/arch-explain/ |
| Plugin shape | `{meta, rules:{follow-architecture}}` — как в dump |
| JS-исходники | 0 (только 2 tooling-конфига) |
| any/unknown/as/eslint-disable в исходниках | 0 |

## 8. Что НЕ сделано и почему

- **Тесты не типизированы под строгий floor** — по прямой команде пользователя
  «добавь просто тесты в исключения» (tests/** в ignores). 454 теста при этом
  зелёные и не ослаблены.
- **Оставшиеся 125 utils-«дубликатов»** — структурные клоны однострочных
  операторов и парных продюсеров (разные семантики при общей форме); слияние
  ради цифры ухудшило бы читаемость. Uniqueness-плагины в eslint при этом
  молчат на engine-папках (их порог/видимость отличается от CLI-скана).
- **Открытый вопрос саб-агента №6** (matchers/.re в tree/index.ts) —
  поведение сохранено как в dump; если это баг, он существовал и в dump.
  Ждёт решения пользователя.
- **Три известных баг-вопроса прошлых раундов** ({vars}-подстановка,
  border-color family vs README, styleInversion swap) — не трогались
  (задача — перевод+унификация, не фиксы); ждут команды.
- **Коммит переведённого состояния** — не сделан без команды; `git diff dump`
  покажет всю разницу (182 файла, +40/−21062 строк JS удалено, TS добавлен).

## 9. Артефакты

- Ветка `dump` @ a514290 — бэкап до перевода.
- `reports/{entities,utils}-{before,after}-ts.md` (+catalogs) — кросс-сканы.
- `md-starter/reports/architecture-overview-ts.html` — финальный overview.
- Скриншоты: `md-starter/reports/arch-explain/16-ts-graph.png`, `17-ts-summary.png`.
- Baselines: /tmp/fa-dump-eslint.md, /tmp/fa-dump-overview.html;
  финал: /tmp/fa-final5-eslint.md, /tmp/fa-final5-overview.html.
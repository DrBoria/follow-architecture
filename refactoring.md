# Рефакторинг follow-architecture: диагноз, принципы, план

Дата: 2026-11-21. Основано на реальных прогонах сканеров по самому движку:
- `reports/entities-overview-fa.html` / `entities-duplicates-fa.md`: 256 файлов, 391 сущность, **81 находка** = 0 полных дубликатов + 3 extraction-кандидата + 65 similar + 12 aliases/inheritance (26 групп, 80 диффов).
- `reports/utils-overview.html` / `utils-duplicates.md`: 2180 утилит, 673 находки, 2 «duplicate» (оба — структурные ложные срабатывания, обоснованы в §6), 63 similar.

ВАЖНО: «81 дубликат» — это 81 FINDING сканера, не 81 копия кода. Но это не оправдание:
extraction-кандидаты и similar-группы — реальные сигналы, что сущности размазаны и
дублируют формы. Ниже — всё, что надо исправить, и почему оно вообще возникло.

(Старое ревью от 2026-07-22 сохранено в `refactoring-2026-07.md` — исторический документ.)

---

## 1. Косяки, которые были пропущены, и ПОЧЕМУ

### 1.1. Слово `theme` осталось в движке после «зачистки»
**Что:** файл `css/resolve/theme-value.ts` (имя!), ~30 комментариев «A THEME PATH»,
«the theme variants», «one theme blames that theme» в theme-value/expression/substitute/
scope/values/scss. Тип `ProviderReading` импортируется из `./theme-value`.
**Почему пропустил:** проверка была `grep "ThemeLiteral|themeValueOf|themesOf"` — по
конкретным старым идентификаторам, а не `grep -i theme` по всему слову. Проверка
подгонялась под то, что было переименовано, вместо проверки инварианта «движок не
знает предметную область проекта».
**Правило на будущее:** приёмка = `grep -rni "theme" --include="*.ts" <исходники движка>`
→ 0 (тестовые фикстуры, изображающие чужой проект, — можно; это данные, не код).

### 1.2. Слово `provider` в двух несовместимых смыслах
**Что:** (а) «provider значений» = объект проекта, из которого резолвер берёт значения
(бывшая «тема»); (б) `css/syntax/provider.ts` `SyntaxProvider` = парсер языка стилей
(css/scss). Одно слово, два домена, ~27 файлов.
**Почему возникло:** переименование theme→provider делалось механически («лишь бы не
theme»), без вопроса «а что это ПО СУТИ». По сути это просто ОБЪЕКТ с членами. Никакой
«провайдер» не нужен как концепция.
**Решение (утверждено пользователем):**
- provider значений → `object`: `scope.objects`, `ObjectLiteral` (термин ts-morph),
  `objectValueOf(path)`, факт `{object: "viking"}`, файл `object-value.ts`
  (или cohesive-модуль value/, см. §4);
- SyntaxProvider → `StyleLanguage` в `syntax/language.ts` (язык стилей: css, scss,
  styled, tailwind — все равноправные реализации одного контракта).
- Слова `provider`/`провайдер` в исходниках движка не остаётся НИ В ОДНОМ смысле.

### 1.3. `scss` зашит в ядро (scope)
**Что:** `css/core/scope-types.ts`: `Scope = { customProperties, scssVariables, providers }`,
`emptyScope()` создаёт `scssVariables`, `mergeScopes` мержит два map по имени синтаксиса;
`scope.ts:140,186-189` — `isScss = prop.startsWith("$")`, ветвление по синтаксису В ЯДРЕ.
**Почему это нарушение:** добавление less (`@vars`) требует правки ядра (третье поле,
третья ветка). Знание о конкретном языке живёт не там, где должно.
**Решение:** `Scope = { variables: Map<string, ScopeEntry[]>, objects: ObjectLiteral[] }`.
Одна карта переменных. `$gap` и `--gap` — просто имена. Какой синтаксис какие имена
кладёт — решает ПРОВАЙДЕР ЯЗЫКА (syntax/scss кладёт `$gap`, syntax/css кладёт `--gap`)
при производстве фактов. Ядро не ветвится по языку нигде. Резолвер `var(--x)` и `#{$x}`
ищет по имени в одной карте; какая нотация ссылки допустима — снова вопрос языка
(язык поставляет свой tokenizer ссылок), не ядра.

### 1.4. Синтаксисы разбросаны по корню css/
**Что:** `css/syntax/` (css, scss), но `css/styled/` и `css/tailwind/` — отдельные
папки верхнего уровня, как будто это не синтаксисы.
**Почему это бардак:** styled-components — синтаксис CSS-в-JS; tailwind — синтаксис
утилит-классов. Это те же «языки стилей», что css и scss. Разное положение в дереве
без причины.
**Решение:** все языки в `css/syntax/{css,scss,styled,tailwind}/`, один контракт
`StyleLanguage`, одна регистрация. Новый язык = новая папка + register, ядро не меняется.

### 1.5. Дробление файлов ради lint-лимитов вместо концепций
**Что:** `css/resolve/` = 7 файлов: answers.ts, path-answer.ts, directive.ts,
substitute.ts, theme-value.ts, expression.ts, resolve.ts. «answer», «path-answer»,
«directive» — имена, которых нет ни в architecture.yaml, ни в предметной области.
Это куски ОДНОЙ задачи (вычислить значение выражения), распиленные, чтобы пройти
max-lines 200, с выдуманными на ходу именами.
**Почему возникло:** lint-лимит воспринимался как цель, а не как индикатор. Правильная
реакция на «файл > 200 строк» — найти настоящую границу концепции, а не отрезать
кусок и назвать его «answers».
**Решение:** см. §4 — value/ с файлами по видам работы (expression, object-path,
check, scope), имена = что делает. Если модуль всё ещё велик — делить по видам
выражений (conditional/arithmetic/map), не по «кусок №3».

### 1.6. Микрофайлы-обрубки
**Что:**
- `css/styled/facts.ts` — 23 строки, три `type X = ReturnType<typeof fn>`. Должно
  жить рядом с producer (template.ts), не отдельный файл.
- `css/styled/class-list.ts` — 12 строк, ОДНА строка кода `text.split(/\s+/)`.
  Это токенизация строки — глобальная утилита (utils/), не «css class list».
- `css/styled/host.ts` — 30 строк, lookup «какой кандидат содержит строку N».
**Решение:** facts.ts растворить в producer; class-list → `utils/tokenize.ts`
(глобально, используется tailwind/css/любым фасетом); host.ts → глобальная утилита
рядом с candidate (см. §5 — Я БЫЛ НЕПРАВ, назвав её «css-мелочью»: этот lookup нужен
css-фасету, queries, depth-обходу, любому фасету со строками).

### 1.7. entities/ — плоская свалка отчётных типов
**Что:** overview.ts (OverviewInput), overview-data.ts (OverviewData+Meta+Stats),
overview-summaries.ts (Node/Role/Invariant summaries), access-graph.ts,
enriched-finding.ts, decision-ctx.ts, file-tree.ts — СЕМЬ плоских файлов одного
домена «отчёт/overview» вперемешку с ядром фактов (facts/kinds/architecture).
**Почему сканер молчал про «три overview»:** entities-uniqueness меряет СХОДСТВО ФОРМ.
OverviewInput/OverviewData/Summaries — разные типы с разными полями → не дубликаты.
Сканер не проверяет связность размещения — это вопрос архитектуры, не сходства.
Но сканер всё равно нашёл 81 находку (см. §6) — их надо закрыть.
**Решение:** `entities/overview/` — вся отчётная подсистема одной папкой (§5).

### 1.8. Extraction-кандидаты оставлены «justified» без действия
**Что:** Span↔FindingHighlight (0.60), TypeSyntaxNode↔TypeDefinition (0.58),
Span↔VariableToken (0.52). Агент написал «cross-layer, оставил». Пользователь требует
закрыть ВСЁ, что нашёл сканер.
**Решение:** общий `Span {start,end}` в одном месте; `FindingHighlight = Span & {text,kind}`;
`VariableToken = Span & {name,fallback}` (композиция, не копия полей). TypeSyntaxNode/
TypeDefinition — выделить общую форму или сделать один тип обёрткой другого (§6).

### 1.9. Проза вместо структурированных фактов (исправлено частично, зафиксировать)
`grammar.ts` возвращал английские предложения ("malformed calc()…"), regex по тексту
ошибок css-tree. Исправлено на `{kind, span, detail}` + подсветка span в браузере
(проверено лично: `<mark>calc(2+)</mark>` в overview). ОСТАТОК: `notice(...)`-строки
диагностики — допустимо (это лог ошибок движка, не факт правила), но проверить, что
ни одна ПРОЗА не уходит в facts/reason/kind.

### 1.10. theme-value.ts не разбит (358 строк, complexity 16, max-depth 4)
Агент дважды сказал «вне scope». Пользователь сказал «перелопатить весь css».
Недоделка. Решается в §4 (object-path модуль + деление по видам обхода).

---

## 2. GENERIC: как я понимал неправильно и как правильно

**Неправильно (как я делал):** «функция принимает параметр вместо константы → она
generic». `hostOf(candidates, line)` — «generic, потому что для любого кандидата».
Это пустое утверждение: ЛЮБАЯ функция с параметрами «generic» в этом смысле.
«Найди div чей span содержит строку» — тоже. Словом прикрывался вопрос «зачем это и
где этому место».

**Правильно (критерий пользователя, единственный):**
> Чтобы добавить новый язык / новый проект / новое правило, ЯДРО менять НЕ НАДО.
> Меняется конфигурация (architecture.yaml) или добавляется провайдер (языка/фасета).
> Если надо лезть в ядро и дописывать `else if (scss)` — код НЕ generic.

Код не знает конкретных имён предметной области. Он работает с фактами и контрактами;
конкретика приходит из конфигурации или от провайдера.

**Проверочные примеры (наши же грабли):**
| Не generic | Generic |
|---|---|
| `scope.scssVariables` (ядро знает про scss) | `scope.variables` (язык кладёт свои имена) |
| список `[section, highlighted, overlay]` в коде движка | тот же список в yaml, движок читает конфиг |
| резолвер сканирует все объекты в поисках «темы» | резолвер берёт объекты роли, названной в yaml (`$codeRole.theme`) |
| `if (/var\(\)/.test(reason)) return "проза…"` | структурный факт `{kind, span}`; проза — только в report-шаблонах |
| `kind.chain` считает только вызовы функций | links приходят от фасета фреймворка (JSX/calls/methods — едино) |

**Тест на generic для каждого модуля при ревью:** «я добавляю less / Vue / новый
проект со своими именами — какие файлы ядра мне придётся открыть?» Ответ должен быть
«ни один». Если файл называется theme-value.ts — тест провален уже именем.

---

## 3. Архитектурные инварианты (что НЕ должно меняться)

Это ядро движка, оно правильно и переписыванию не подлежит — только перемещение/
переименование оболочек вокруг него:

1. **Pipeline:** collectFacts (сырые факты) → classifyRoles → ленивые производные
   (resolution, chain) → gates (ignore/where/when) → infer → findings → report.
   Порядок «классификация до резолва» утверждён и работает.
2. **Факты = структурированные данные, проза = только report-слой.** KINDS короткие
   (`math`, `property`, `absent`, `empty`, `undeclared-var`, `cyclic-var`, …), спаны
   `{start,end}` для подсветки. Никаких английских предложений в facts.
3. **Фильтр-язык (entities/queries.ts):** операторы equals/in/length/any/none/where/
   at/unique/…, `$ref`-ссылки на факты (`$location.words`, `$codeRole.theme`).
   Один generic движок фильтров, Keystone-style. Не трогать семантику.
4. **`$codeRole.<slug>`** в when/infer = массив классифицированных кандидатов роли
   со всего проекта (lazy+cache); ссылка на роль в инварианте объявляет, из каких
   объектов резолвить значения. Никакого скана всех литералов. Никакого нового ключа схемы.
5. **Роли/ноды/инварианты — политика в yaml.** Движок не знает имён ролей, токенов,
   свойств, проектов. RELATION-словарь (import/export/declare/call/mutate/assign/
   read/typeImport) — закрытый контракт с producer на каждую relation (kinds.ts).
6. **Двусторонняя проверка значений:** каждое чтение резолвится против ВСЕХ объектов
   роли; optional+fallback (`status?.[k] ?? section`) легален и резолвится per-object;
   фиксированный путь без fallback отсутствует в объекте → kind:"absent" с именем
   объекта (вина объекта, не компонента); невалидное значение → kind+span+object.
7. **Depth-обход:** links = calls + framework.links (JSX-рендер, styled/memo-алиас,
   member-calls), мемоизация, cycle-guard. Движок не считает «слишком глубоко» —
   лимиты в фильтрах yaml.
8. **Один producer — один тип:** формы отчёта DERIVED (`ReturnType<typeof builder>`),
   браузер и Node читают один контракт; payload — plain JSON (никаких Map/RegExp).
9. **≤7 файлов в папке, ≤200 строк в файле** — но как ИНДИКАТОР границ концепций,
   не как цель дробления (см. косяк 1.5).
10. **Span-подсветка в браузере:** finding.highlight → `<mark data-fa-highlight>`;
    проверено визуально, не ломать.

---

## 4. Целевая структура css/

```
css/
  index.ts                  — public API: attachToCandidates (сырые факты),
                              materialiseResolution (lazy), stylesheetFacts, …
  syntax/                   — ВСЕ языки стилей, равноправные
    language.ts             — контракт StyleLanguage { id, exts, parse, facts,
                              variableNames?, referenceTokens? } + register/registry
    css/                    — .css: postcss-парсер, переменные --x, ссылки var(--x)
    scss/                   — .scss/.sass: postcss-scss, переменные $x, ссылки #{$x}
    styled/                 — styled-components: tagged template → текст+выражения,
                              document facts, привязка к кандидату (через глобальный hostOf)
    tailwind/               — class-атрибуты → токены (через глобальный tokenize) →
                              tailwind-движок (known/arbitrary/properties)
  value/                    — вычисление конкретного значения (бывший resolve+core частично)
    expression.ts           — TS-выражение → значения: тернарники (обе ветки, вложенные),
                              &&/||/??, арифметика, .map-шаблоны, dynamic-placeholder
    object-path.ts          — путь в объекте проекта (бывший theme-value): member-chain,
                              suffix-match, spread/import-обход, dynamic-index по всем членам
    substitute.ts           — подстановка значений в текст шаблона, var()-ссылки → scope
    check.ts                — вердикт грамматики css-tree: {valid, problems:[{kind,span,detail}]},
                              generic math-функции (calc/min/max/clamp через типы css-tree)
    scope.ts                — Scope { variables: Map<name,entries>, objects: ObjectLiteral[] },
                              merge/normalize/withObjects. ЯЗЫК-АГНОСТИЧЕН.
    pieces.ts               — Piece/Branch/формы вычисления (общий Span — из utils)
```

Правила перехода:
- `core/` расформировывается: css-tree.ts (обёртка lexer) → value/check.ts рядом;
  values.ts (токены css-tree) → value/ или syntax/css по принадлежности;
  text-scan.ts (closingParen и пр.) → глобальные utils, если используется >1 доменом;
  scope/scope-types → value/scope.ts (одним модулем, типы рядом с producer).
- `resolve/answers.ts|path-answer.ts|directive.ts` растворяются в expression.ts /
  object-path.ts по СМЫСЛУ (конструкторы значений — рядом с fold; вложенный блок —
  вид выражения в expression; путь — в object-path). Имен «answer» не остаётся:
  тип результата = `ValueResult`/`Values` (значения+problems), не «ответ».
- Никаких `theme`, `provider`, `scss` вне `syntax/scss/` (grep-приёмка).
- Язык добавляет переменные/ссылки через контракт StyleLanguage; ядро (value/, scope)
  не содержит имён языков.

## 5. Целевая структура entities/ и глобальные утилиты

```
entities/
  facts.ts                  — формы фактов (ядро; Link уже объединён с RenderLink — оставить один)
  kinds.ts                  — RELATION-словарь + producers (не трогать семантику)
  architecture.ts           — Arch-модель yaml
  findings.ts               — Finding/FindingItem/FindingHighlight (= Span & {text,kind})
  context.ts                — FileContext/ScanContext (providersFor → objectsFor)
  ast/                      — producers фактов (без изменений по сути)
  overview/                 — ВСЯ отчётная подсистема (7 плоских файлов → папка):
    input.ts                — OverviewInput (бывший overview.ts)
    data.ts                 — OverviewData/Meta/Stats/CountGroup (бывший overview-data.ts)
    summaries.ts            — Node/Role/Invariant summaries (бывший overview-summaries.ts)
    graph.ts                — AccessGraph/edge/RoleNode (бывший access-graph.ts)
    finding.ts              — EnrichedFinding/Plan/Boundary (бывший enriched-finding.ts)
    decision.ts             — DecisionCtx/Places (бывший decision-ctx.ts)
    file-tree.ts            — FileTreeEntry
utils/
  host.ts                   — hostOf(candidates, line): «какой кандидат содержит строку».
                            ГЛОБАЛЬНАЯ утилита (css, queries, depth, любой фасет).
                            Я был неправ, назвав её css-мелочью.
  tokenize.ts               — split строки на токены по пробелам (бывший class-list.ts,
                            одна строка кода — не файл в css/styled). ГЛОБАЛЬНО.
  span.ts (или в findings)  — Span {start,end} — ОДИН на весь движок; Highlight/Token
                            наследуют/композируют, не копируют поля.
  group.ts                  — pushGroup (уже есть, используется project.ts и scope)
  text.ts                   — firstLine, closingParen и пр. — собрать дубли из css/resolve
                            и report (utils-uniqueness similar-пары).
```

Правило размещения: сущность живёт в папке своего ДОМЕНА (overview/ — отчёт,
syntax/ — языки, value/ — вычисление), а не плоским файлом в общем корне.
Глобальная утилита = используется ≥2 доменами → utils/; используется одним → рядом
с потребителем. Микрофайл <30 строк без самостоятельной концепции — растворить.

## 6. Закрытие находок сканеров (ВСЁ, что найдено)

### entities (81 находка: 3 extract + 65 similar + 12 aliases + группы)
1. **Span ↔ FindingHighlight (0.60):** общий Span; FindingHighlight = Span & {text,kind}. Закрыть.
2. **Span ↔ VariableToken (0.52):** VariableToken = Span & {name,fallback}. Закрыть.
3. **TypeSyntaxNode ↔ TypeDefinition (0.58):** TypeDefinition — обёртка узла грамматики;
   сделать `TypeDefinition = Pick<TypeSyntaxNode,…> & {…}` или единый тип. Закрыть.
4. **Similar-группы (65):** пройти КАЖДУЮ пару из entities-duplicates-fa.md:
   - Candidate-группа (ArgumentFact и др., 8 шт.), BindingFact/ConstructorParam (6 шт.),
     MemberFact/AnyMember, ArchChild/RawChildSpec, ArchNode/RawNode, WhereEntry/RoleHome,
     OverviewMeta/OverviewInput, Invariant/InvariantSummary, CtxPlan/Plan,
     Branch/ValueResult — для каждой: либо общий базовый тип/Pick-композиция, либо
     письменное обоснование «разные домены, совпадение полей случайно» В ЭТОМ ФАЙЛЕ
     (не в голове агента). Цель: extraction-кандидатов 0; similar — только обоснованные.
   - Алиасы (12): RenderLink=Link уже объединён; остальные алиасы — удалить (один тип),
     либо оставить осознанный re-export с комментарием зачем.
5. После — перегенерировать entities-overview-fa.html, приложить числа до/после.

### utils (2 duplicate + 63 similar)
1. `withFacets ↔ depth#read` (0.79): РАЗНЫЕ операции (attach фасетов к кандидатам в
   памяти vs чтение кандидатов с диска). Общий кусок — attachFrameworkFacts — уже
   переиспользуется. Обоснование зафиксировать здесь; объединение создаст ложную
   связанность memory/disk. НЕ сливать.
2. `filterNamesCodeRole ↔ queries#contains` (0.76): обход дерева фильтров vs скалярный
   предикат членства. НЕ сливать, обоснование здесь.
3. **63 similar:** пройти все; реальные дубли (firstLine из css/resolve и report;
   токенизация; recordWithout-паттерны) — вынести в utils и переиспользовать.
   Ложные (одинаковая форма цикла в разных доменах) — обосновать письменно.
4. После — перегенерировать utils-overview.html, числа до/после.

## 7. Порядок работ (фазы, каждая проверяема)

**Фаза 0 — baseline.** Зафиксировать: tests 510/510, tsc 0, eslint md-starter
styles 15 / components ~442 (pxpx 56, absent 0), оба overview-отчёта сканеров.

**Фаза 1 — глобальные утилиты и Span.** utils/host, utils/tokenize, единый Span;
FindingHighlight/VariableToken через композицию; firstLine/closingParen дедуп.
Тесты не падают. (Закрывает extract-кандидаты 1–2 и часть similar.)

**Фаза 2 — scope generic.** Scope.variables одна карта; языки кладут свои имена;
убрать isScss-ветвление из ядра; objects вместо providers. Тесты: scss-переменные
резолвятся как раньше (поведение не меняется, меняется размещение знания).

**Фаза 3 — дерево css/.** syntax/{css,scss,styled,tailwind}, value/ по §4; растворить
микрофайлы; переименовать theme-value→object-path, provider→object, SyntaxProvider→
StyleLanguage; зачистить комментарии от theme/provider/scss вне их папок.
Приёмка: `grep -rni "theme\|provider" css/ entities/ code-roles/ frameworks/ invariants/
pipeline*.ts` → 0 в исходниках (кроме тестовых фикстур-данных); scss — только syntax/scss.

**Фаза 4 — entities/overview/.** Семь файлов → папка; импорты обновить; DERIVED-типы
сохранить; payload-контракт браузера не меняется (проверить открытием overview).

**Фаза 5 — закрытие similar.** Пройти все пары сканеров (§6), объединить/обосновать.
Перегенерировать оба overview, числа до/после в этот файл.

**Фаза 6 — приёмка целиком.**
- tsc 0; vitest все passing (510+; тесты обновлять под новые имена/формы, покрытие не удалять);
- eslint движка по своим правилам 0 (complexity/max-lines/max-depth в css/value закрыты);
- md-starter: pnpm install → eslint styles/components — pxpx 56, absent 0, status-fallback
  молчит, drilling/count/wrapper/aliases работают как до рефактора;
- браузер: overview md-starter + span-фикстура — highlight `<mark>` рендерится (открыть,
  не «структурно проверить»);
- сканеры: entities extraction 0, utils duplicate 2 (обоснованы здесь), similar — только
  обоснованные;
- grep-инварианты §3/§4 выполнены.

## 8. Запреты для исполнителя (агента)

- НИКАКИХ пишущих git-команд (commit/push/checkout/restore/stash/reset/clean/add/rm/mv).
  Только чтение (status/diff/log/show). Прецедент: `git checkout -- css` уничтожил
  незакоммиченную работу.
- Никакого хардкода: имён проектов/ролей/токенов/свойств/языков в ядре; прозы в фактах;
  списков значений в коде (исключения — только в architecture.yaml).
- Не менять семантику инвариантов §3 ради удобства рефакторинга.
- Не дробить файлы ради лимитов — делить по концепциям; не плодить сущности без имени
  в предметной области («answer», «directive» — запрещены как имена модулей).
- Каждое «оставил как есть» по находке сканера — письменное обоснование в этом файле.
- Проверять grep-инварианты ПОЛНЫМ словом (-i theme, -i provider), не списком старых идентификаторов.
- После сборки — `npx pnpm@10.18.3 install` в md-starter, не копировать dist руками.
- Модель исполнителя: DeepSeek Flash; при сетевой ошибке — стоп и доклад, не переключаться.

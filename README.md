# follow-architecture

ESLint rule + CLI that validates code against a declarative architecture skeleton. The tool knows nothing about your project — everything (paths, names, rules, fixes) lives in `architecture.json`.

## `architecture.json`

```jsonc
{
  "aliases": { "#_db": "core/ehr/_db" },
  "nodes": [
    {
      "id": "feature-rm",
      "pattern": "core/ehr/{slice}.v/**/*.rm.ts",
      "consume": [
        {
          "id": "feature-crud",
          "same": "slice",
          "message": "Архитектура: rm работает только с resource-файлом своего слайса. Этот файл не импортирует `{slice}.resource.ts`.",
          "fix": "Импортируй биндинг из `{slice}.resource.ts`"
        }
      ],
      "nameMust": ["index.ts", "{slice}.types.ts"],
      "nameFix": "the root is a closed list — move this file into a sub-feature folder",
      "exclude": ["**/catalog/catalog.rm.ts"]
    }
  ],
  "invariants": [
    {
      "id": "rm-no-bypass",
      "when": "core/ehr/{slice}.v/**/*.rm.ts",
      "forbid": [
        { "pattern": "new AppMedplumClient", "reason": "no own clients", "message": "Архитектура: rm не создаёт собственный FHIR-клиент. Здесь он создаётся.", "fix": "Убери клиента — запросы идут через resource-биндинг слайса", "except": ["**/legacy/**"] }
      ]
    },
    {
      "id": "no-rm-in-slice-root",
      "when": "core/ehr/{slice}.v/**",
      "absent": "core/ehr/{slice}.v/*.rm.ts",
      "message": "Архитектура: rm лежит в подпапке слайса, а не в корне.",
      "fix": "Вынеси файл в подпапку, которой он принадлежит"
    }
  ]
}
```

### Nodes

- `id` — unique name.
- `pattern` — glob for the files the node covers. `{name}` placeholders capture path segments (e.g. `{slice}` in `core/ehr/{slice}.v/*.resource.ts` captures `allergies`). Captures are reused in `consume.same`, `nameMust`, and invariant messages.
- `consume` — what files of this node must import. Each entry:
  - `id` — the node being consumed;
  - `same` (optional) — a capture name that must be equal in both files (e.g. an rm file must import its **own slice's** resource file);
  - `message` (optional) — what the finding says (plain instruction, `{capture}` substitution works);
  - `fix` (optional) — the "instead do this" part, printed under the finding.
- `nameMust` (optional) — closed list of allowed file names (basenames, may contain captures). Anything else in the node is a `name-must` violation.
- `nameMessage` / `nameFix` (optional) — wording for `name-must` findings.
- `exclude` (optional) — globs excluded from the node.

### Invariants

- `id` — unique name.
- `when` — glob of files the invariant applies to (captures work here too).
- `must` — array of `{ pattern, reason?, message?, fix? }` — the regex must appear on at least one line.
- `forbid` — array of `{ pattern, reason?, message?, fix?, except? }` — the regex must not appear on any line; `except` is a list of globs where the forbid does not apply.
- `absent` (optional) — a glob that must match **zero files**. Any file matching it is an `invariant-absent` violation (use for "this file/folder must not exist").
- `message` / `fix` (top-level, for `absent`).

`message` is the finding text as the reader sees it — write it as a plain instruction ("the file does X, the architecture wants Y, here is what to change"). `fix` is the "instead do this" part. Both support **multiline Markdown** — fenced code blocks, lists, bold. The report prints them verbatim; the ESLint message is a single-line variant of `message`.

Without `message`, the tool composes a fallback from the rule's shape.

### Variables in `message` / `fix`

`{name}` placeholders are substituted before the text is printed. Available variables:

**From the file path** (every finding):

| variable | meaning |
| --- | --- |
| `{file}` | repo-relative path of the flagged file |
| `{basename}` | file name without directory |
| `{dir}` | directory of the file (repo-relative) |

**Captures** — any `{name}` used in the node `pattern`, invariant `when`, or `absent` glob. E.g. `{slice}` in `core/ehr/{slice}.v/**/*.rm.ts` captures `allergies` and is available as `{slice}` in that file's findings.

**Match context** (forbid findings only):

| variable | meaning |
| --- | --- |
| `{count}` | how many lines matched the pattern |
| `{plural}` | `""` if count is 1, `"s"` otherwise — for `time{plural}` |
| `{line}` | first matching line number |
| `{lines}` | all matching line numbers, comma-separated |
| `{snippet}` | the first matching line, trimmed |
| `{match}` | the exact matched text on the first line |
| `{where}` | ` in `functionName`` if the match is inside a named function, empty otherwise |

### Aliases

`aliases` maps import specifiers to paths for the consume check (e.g. `"#_db": "core/ehr/_db"`).

## Structure (folder placement + names + case)

The `structure` block is delegated to [`eslint-plugin-project-structure`](https://www.npmjs.com/package/eslint-plugin-project-structure) (a declared dependency). It enforces **where** files live, **what** they are called, and the **case** of names — things the content checks above can't see. The block is a plain object passed straight to the plugin's `folder-structure` rule:

```jsonc
{
  "structure": {
    "structureRoot": "core/ehr",
    "ignorePatterns": ["_medplum/**", "node_modules/**", ".turbo/**"],
    "structure": [
      { "name": "{kebab-case}.v", "ruleId": "slice" },
      { "name": "_db", "children": [] },
      { "name": "index.ts" },
      { "name": "server.ts" }
    ],
    "rules": {
      "slice": {
        "name": "",
        "children": [
          { "name": "index.ts" },
          { "name": "{kebab-case}.types.ts" },
          { "name": "{kebab-case}.resource.ts" },
          { "name": "{kebab-case}.api.ts" },
          { "name": "*.test.ts" },
          { "name": "browse", "children": [] }
        ]
      }
    }
  }
}
```

- `structureRoot` — the folder the tree is rooted at (`.` = repo root).
- `ignorePatterns` — globs to skip (relative to `structureRoot`).
- `structure` — the top-level nodes. A node with `children` is a **closed** folder: anything inside that isn't in the list is a violation. A node **without** `children` is a file. An **empty** `children: []` is an **open** folder (accepts anything inside) — use it for free-form sub-feature folders.
- `rules` — named sub-trees referenced by `ruleId` (e.g. every `{kebab-case}.v` slice shares the `slice` rule).
- **Name templates** use the plugin's built-in case params: `{kebab-case}`, `{camelCase}`, `{PascalCase}`, `{snake_case}`, `{SNAKE_CASE}` (plus per-folder `{folderName}` / `{FolderName}` / `{folder-name}`). A single `.` is a literal dot, `..` is any single char, and `*` is a wildcard — so write `{kebab-case}.v` (not a hand-rolled regex with `*` quantifiers, which the plugin would mangle).

The plugin reports `project-structure/folder-structure` errors; the content checks above report `follow-architecture/follow-architecture` errors. Both run together.

## CLI

```sh
node follow-architecture/scanner/main.js [options]
```

| flag | default | meaning |
| --- | --- | --- |
| `--config <path>` | `architecture.json` in the repo root | path to the architecture JSON |
| `--out <path>` | `reports/follow-architecture.md` | report output |
| `--repo-root <path>` | auto (walks up for `package.json`/`.git`) | repo root |
| `--ext <list>` | `.ts,.tsx` | file extensions to scan |
| `--ignore-dir <list>` | `node_modules,.git` | directory names to skip |
| `--ignore <globs>` | `**/*.d.ts` | file globs to skip |
| `--check` | off | exit 1 if there are violations |
| `--verbose` | off | log config |

## ESLint

The package exports a `flatConfig` factory that wires up **both** rules — the content rule and the plugin's `folder-structure` rule — in one call:

```js
// eslint.config.js
const path = require("node:path");
const { flatConfig } = require("./follow-architecture/plugin.js");

module.exports = flatConfig(path.join(__dirname, "architecture.json"));
```

`flatConfig(architecture, { parser, files, ignores })` returns a flat-config array. `architecture` is a path to the JSON or the object itself. `parser` defaults to `@typescript-eslint/parser`; `files` defaults to `core/ehr/**/*.ts(x)`; `ignores` are appended to the built-in ones (`_medplum`, `node_modules`, `.turbo`, `*.d.ts`).

You can also register the content rule alone (no structure block):

```js
const followArchitecturePlugin = require("./follow-architecture/plugin.js");

module.exports = [
  {
    files: ["core/ehr/**/*.ts", "core/ehr/**/*.tsx"],
    plugins: { "follow-architecture": followArchitecturePlugin },
    rules: { "follow-architecture/follow-architecture": ["error", { file: "architecture.json" }] },
  },
];
```

The options object accepts the architecture inline (`nodes`, `invariants`, `aliases`, `structure`) or `{ file: "architecture.json" }`. `root` overrides the repo root. ESLint picks the files itself — no walker, no scan config.

### Rule ids

| id | meaning |
| --- | --- |
| `consume-missing` | a file of a node never imports what the node consumes |
| `invariant-must` | a required pattern is absent from the file |
| `invariant-forbid` | a forbidden pattern appears in the file |
| `name-must` | the file name is not in the node's closed list |
| `invariant-absent` | a file that must not exist does exist |
| `bad-options` | the architecture could not be loaded/normalized |

The report (`--out`) groups findings by file and prints each finding as the full `message` (multiline Markdown, code blocks included) followed by a **Fix.** section with the `fix` text. No rule ids or node ids in the report text. The ESLint message is a single-line variant.

"use strict";

// What the rule ACCEPTS — its options, as data. The schema is the contract;
// the typed view is what `create()` reads. Both live here so the option names
// are spelled once.

import type { RawArch } from "./entities/architecture";

// The rule option is either a config path (string or {config}), or the
// architecture object itself. The object form carries the architecture's own
// sections (the raw config) beside the tool's options — the same keys
// `loadArchitecture` reads.
type RuleOptions = Partial<RawArch> & {
	config?: string | RawArch;
	// The TOOL's own inputs — tailwind.config.js, postcss.config.cjs, an SCSS
	// entry. Key → path, read once per run; a key that is declared and unreadable
	// is reported instead of silently empty.
	configs?: Record<string, string>;
	include?: string[];
	exts?: string[];
	similarity?: number;
	ignoreDirs?: string[];
	ignores?: string[];
	exportPath?: string | false;
};

// The schema ESLint validates the options against. `exportPath` is the one
// option for the report file, the same name the sibling rules use for their
// export files; it defaults to `reports/architecture-overview.html` and `false`
// turns it off.
const RULE_SCHEMA = [
	{
		anyOf: [
			{ type: "string" },
			{
				type: "object",
				properties: {
					config: { type: "string" },
					configs: { type: "object" },
					include: { type: "array" },
					exts: { type: "array" },
					similarity: { type: "number" },
					ignoreDirs: { type: "array" },
					ignores: { type: "array" },
					exportPath: {
						anyOf: [{ type: "string" }, { type: "boolean" }],
						description: "Where the HTML overview is written, relative to the repo root. Default `reports/architecture-overview.html`. `false` turns it off.",
					},
				},
				additionalProperties: false,
			},
		],
	},
];

// The option as written: a bare string is a config path.
const optionsOf = (raw: string | RuleOptions | undefined): RuleOptions => (typeof raw === "string" ? { config: raw } : (raw ?? {}));

export { RULE_SCHEMA, optionsOf };
export type { RuleOptions };
"use strict";

// The tool's own configs, declared in the ESLint RULE OPTIONS (and in the CLI
// flags) — never in `architecture.yaml`. The architecture says what the code may
// be; the rule says where its own inputs live:
//
//   "md-code/follow-architecture": ["error", { configs: { tailwind: "…" } }]
//
// Two answers are the caller's business, not the rule's:
//   missing — the key was declared and the file is not there
//   errors  — the file is there and cannot be read or parsed
// Both name the KEY and the PATH, because "no config" and "a config with nothing
// in it" produce the same wrong conclusions and must not look alike.

import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";
import { isRecordValue, type FieldValue } from "./field";

// A loaded config is arbitrary data: JSON, or whatever a JS module exports. It is
// plain data like every fact, so it is the ONE value model (`FieldValue`) — not a
// second recursive union that could drift from it.
type ConfigValue = FieldValue;

interface LoadConfigsOptions {
	repoRoot?: string;
	configs?: Record<string, string>;
}

interface ConfigEntry {
	path: string;
	abs: string;
	data: ConfigValue;
}

// One problem with a declared config: the KEY it was declared under and the
// PATH it named. A read failure adds the reason; a missing file does not.
interface ConfigIssue {
	key: string;
	path: string;
	message?: string;
}

interface LoadConfigsResult {
	values: Record<string, ConfigEntry | null>;
	missing: ConfigIssue[];
	errors: ConfigIssue[];
}

// `require` for the runtime, taken from `node:module` so the config loader can
// still read a JS config module without the linter treating it as a require call.
const requireModule = createRequire(__filename);

// A JSON file is data; a JS module is data too — loaded by the runtime, not
// re-implemented here.
const readOf = (abs: string): ConfigValue => {
	if (/\.json$/i.test(abs)) {
		const parsed: ConfigValue = JSON.parse(fs.readFileSync(abs, "utf8"));

		return parsed;
	}

	// The module cache is fine for a config: it is read once per run.
	const loaded: ConfigValue = requireModule(abs);

	return isRecordValue(loaded) && loaded.default !== undefined ? loaded.default : loaded;
};

const loadConfigs = ({ repoRoot, configs }: LoadConfigsOptions): LoadConfigsResult => {
	const values: Record<string, ConfigEntry | null> = {};
	const missing: ConfigIssue[] = [];
	const errors: ConfigIssue[] = [];

	for (const [key, rel] of Object.entries(configs ?? {})) {
		const abs = path.isAbsolute(rel) ? rel : path.resolve(repoRoot ?? ".", rel);

		if (!fs.existsSync(abs)) {
			values[key] = null;
			missing.push({ key, path: rel });
			continue;
		}

		try {
			values[key] = { path: rel, abs, data: readOf(abs) };
		} catch (error) {
			const e: { message?: string } = error;
			values[key] = null;
			errors.push({ key, path: rel, message: (e.message ?? "").split("\n")[0] });
		}
	}

	return { values, missing, errors };
};

// What a rule sees: `configs.tailwind` is the data, `null` when a declared key
// could not be read, and the whole object absent when nothing was declared.
const configFacts = ({ values }: { values: Record<string, ConfigEntry | null> }): Record<string, ConfigValue> => {
	const facts: Record<string, ConfigValue> = {};
	for (const [key, value] of Object.entries(values)) facts[key] = value ? value.data : null;

	return facts;
};

export { loadConfigs, configFacts };

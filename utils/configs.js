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

const fs = require("node:fs");
const path = require("node:path");

// A JSON file is data; a JS module is data too — loaded by the runtime, not
// re-implemented here.
const readOf = (abs) => {
	if (/\.json$/i.test(abs)) return JSON.parse(fs.readFileSync(abs, "utf8"));

	// The module cache is fine for a config: it is read once per run.
	// eslint-disable-next-line import/no-dynamic-require
	const loaded = require(abs);

	return loaded?.default ?? loaded;
};

const loadConfigs = ({ repoRoot, configs }) => {
	const values = {};
	const missing = [];
	const errors = [];

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
			values[key] = null;
			errors.push({ key, path: rel, message: error.message.split("\n")[0] });
		}
	}

	return { values, missing, errors };
};

// What a rule sees: `configs.tailwind` is the data, `null` when a declared key
// could not be read, and the whole object absent when nothing was declared.
const configFacts = ({ values }) => {
	const facts = {};
	for (const [key, value] of Object.entries(values)) facts[key] = value ? value.data : null;

	return facts;
};

module.exports = { loadConfigs, configFacts };

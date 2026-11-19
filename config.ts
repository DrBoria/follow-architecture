"use strict";

// The ESLint plugin: the rule, its options schema, and the project loader the
// CLI shares. The halves live in their own modules — the rule's wiring
// (`config-rule`), the per-repo state (`config-state`), the report accumulation
// (`config-report`), the option contract (`config-options`), the project loader
// (`config-project`) — re-exported here so every consumer keeps importing
// `config`.

import { createRequire } from "node:module";
import { rule } from "./config-rule";
import { RULE_SCHEMA } from "./config-options";

// This package's own manifest, from either layout: the compiled tree lives in
// `dist/`, so the manifest is one level up; in the source tree it sits next to
// this file. The require is taken at run time (the same way the sibling
// packages read it), so the resolution follows the compiled layout.
const requireModule = createRequire(__filename);
const readOwnManifest = (): { name?: string; version?: string } => {
	try {
		const manifest: { name?: string; version?: string } = requireModule("../package.json");

		return manifest;
	} catch {
		const manifest: { name?: string; version?: string } = requireModule("./package.json");

		return manifest;
	}
};
const pkg = readOwnManifest();

const plugin = {
	meta: { name: pkg.name, version: pkg.version },
	rules: { "follow-architecture": rule },
};

// What the rule ACCEPTS is part of its contract, not an implementation detail.
const ruleOptions = (): typeof RULE_SCHEMA => RULE_SCHEMA;

export { plugin, ruleOptions };
export { openProject } from "./config-project";

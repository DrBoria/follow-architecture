"use strict";

// Tailwind itself, loaded through a TYPED view. The public config types ship with
// the package; the two internal generators the facet reads (`createContext`,
// `generateRules`) do not, so their surface is modelled here once. Nothing here
// enumerates Tailwind's vocabulary — the generator is asked, so new classes appear
// by themselves on `pnpm update`.
//
// `createRequire` (not a bare `require`) keeps the load at run time, the same way
// the config loader reads a JS module.

import { createRequire } from "node:module";
import type { Config } from "tailwindcss/types/config";
import type { Rule, AtRule } from "postcss";
import resolveConfig from "tailwindcss/resolveConfig";
import defaultConfig from "tailwindcss/defaultConfig";

// The build context Tailwind's generators share. The facet only passes it back to
// `generateRules`, so its internals are not modelled — it is an opaque handle.
interface TailwindContext {
	readonly candidateRuleCache: Map<string, object>;
}

// One generated rule: its metadata plus the postcss node Tailwind produced. A
// utility is a `Rule`; under a variant it is an `AtRule` wrapping the same
// declarations — both walk the same way.
type GeneratedRule = [meta: { layer: string }, rule: Rule | AtRule];

interface SetupContextUtils {
	createContext: (config: Config, changedContent?: { file: string | null; content: string }[]) => TailwindContext;
}
interface GenerateRulesModule {
	generateRules: (candidates: Iterable<string>, context: TailwindContext) => GeneratedRule[];
}
interface TailwindManifest {
	version: string;
}

const requireModule = createRequire(__filename);

// The default config, resolved with no content files and no plugins: the facet
// asks what a class SETS, not what a particular project's build produces.
const baseConfig = (): Config => resolveConfig({ ...defaultConfig, content: { files: [] }, plugins: [] });

const loadSetup = (): SetupContextUtils => {
	const module: SetupContextUtils = requireModule("tailwindcss/lib/lib/setupContextUtils");

	return module;
};
const loadGenerate = (): GenerateRulesModule => {
	const module: GenerateRulesModule = requireModule("tailwindcss/lib/lib/generateRules");

	return module;
};
const loadVersion = (): string => {
	const manifest: TailwindManifest = requireModule("tailwindcss/package.json");

	return manifest.version;
};

export { baseConfig, loadSetup, loadGenerate, loadVersion };
export type { TailwindContext, GeneratedRule };

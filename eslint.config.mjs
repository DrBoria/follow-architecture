import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

// The same rules the other repositories use (code-diff's config is the
// reference): nothing implicit, nothing huge, nothing deep, NO escape hatch —
// `any` and `unknown` are banned outright — plus the three uniqueness plugins.
// What those rules flag is an ORDER: extract the shared util/entity, do not
// argue that the pair "is not really alike".

const followArchitecture = require("@md-code/follow-architecture");
const utilsUniqueness = require("@md-code/utils-uniqueness");
const entitiesUniqueness = require("@md-code/entities-uniqueness");
const componentUniqueness = require("@md-code/component-uniqueness");

// One scan root for every feature: the plugins compare the whole package.
const scan = { root: here, tsconfig: "tsconfig.json" };

const ENGINE_FOLDERS = ["entities", "utils", "css", "frameworks", "invariants", "nodes", "code-roles", "report"];

const SOURCES = [
	"*.ts",
	"bin/**/*.ts",
	"css/**/*.ts",
	"frameworks/**/*.ts",
	"invariants/**/*.ts",
	"nodes/**/*.ts",
	"code-roles/**/*.ts",
	"entities/**/*.ts",
	"utils/**/*.ts",
	"report/**/*.ts",
	"report/user-report/src/**/*.{ts,tsx}",
];

export default [
	{ ignores: ["dist/**", "node_modules/**", "reports/**", "tests/**", "*.js", "**/*.js"] },
	...tseslint.configs.recommended.map((config) => ({ ...config, basePath: here, files: SOURCES })),
	{
		basePath: here,
		files: SOURCES,
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { project: "./tsconfig.eslint.json", tsconfigRootDir: here },
		},
		plugins: {
			"md-code": followArchitecture,
			"md-code-utils": utilsUniqueness,
			"md-code-entities": entitiesUniqueness,
			"md-code-components": componentUniqueness,
		},
		rules: {
			// ── BASE ────────────────────────────────────────────────────────
			"no-var": "error",
			"prefer-const": "error",
			eqeqeq: ["error", "smart"],
			"no-console": "error",
			"no-debugger": "error",
			"no-duplicate-imports": "error",
			"no-implicit-coercion": "error",
			"no-param-reassign": "error",
			"no-else-return": "error",
			"no-lonely-if": "error",
			"no-nested-ternary": "error",
			"max-depth": ["error", 3],
			"max-params": ["error", 4],
			"max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
			"max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
			complexity: ["error", 10],
			// ── STRICT TYPES, NO ESCAPE HATCH ───────────────────────────────
			// `any` and `unknown` are banned outright: a payload is either typed
			// or `never`, and an assertion may narrow, never launder.
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
			"@typescript-eslint/no-restricted-types": [
				"error",
				{
					types: {
						unknown: { message: "Unknown is banned: type the payload or use never.", fixWith: "never" },
					},
				},
			],
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			"@typescript-eslint/explicit-module-boundary-types": "error",

			// ── UNIQUENESS: THE RULE KNOWS BETTER ───────────────────────────
			// A flagged pair is extracted into utils/ or entities/ and imported —
			// the fix column of the report is the instruction, not a suggestion.
			"md-code-utils/utils-uniqueness": [
				"error",
				{ ...scan, utilsFolder: ENGINE_FOLDERS, exportPath: "reports/utils-catalog.json" },
			],
			"md-code-entities/entities-uniqueness": [
				"error",
				{ ...scan, roots: ENGINE_FOLDERS, exportPath: "reports/entities-catalog.json", exclude: [] },
			],
			"md-code-components/component-uniqueness": [
				"error",
				{ ...scan, componentsFolder: ["report/user-report/src"], exportPath: "reports/component-catalog.json" },
			],
		},
	},
	{
		// The CLI and the notices channel are the tool's own voice: printing IS
		// their job. Everywhere else `no-console` stays absolute.
		files: ["bin/**/*.ts", "main.ts", "report/notices.ts", "report/cli-report.ts"],
		rules: { "no-console": "off" },
	},
];

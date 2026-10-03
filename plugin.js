"use strict";

const { projectStructurePlugin } = require("eslint-plugin-project-structure");
const followArchitectureRule = require("./index");
const { loadArchitecture, buildFolderStructureConfig } = require("./structure");

const followArchitecturePlugin = {
	rules: {
		"follow-architecture": followArchitectureRule,
	},
};

const flatConfig = (architecture, { parser, files, ignores } = {}) => {
	const arch = loadArchitecture(architecture);
	const fsConfig = buildFolderStructureConfig(arch);
	const tsParser = parser ?? require("@typescript-eslint/parser");
	const archSource =
		typeof architecture === "string" ? architecture : architecture.file;
	return [
		{
			ignores: [
				"core/ehr/_medplum/**",
				"core/ehr/node_modules/**",
				"core/ehr/.turbo/**",
				"**/*.d.ts",
				...(ignores ?? []),
			],
		},
		{
			files: files ?? ["core/ehr/**/*.ts", "core/ehr/**/*.tsx"],
			languageOptions: { parser: tsParser },
			plugins: {
				"project-structure": projectStructurePlugin,
				"follow-architecture": followArchitecturePlugin,
			},
			rules: {
				"project-structure/folder-structure": ["error", fsConfig],
				"follow-architecture/follow-architecture": [
					"error",
					archSource ? { file: archSource } : arch,
				],
			},
		},
	];
};

module.exports = {
	...followArchitecturePlugin,
	projectStructurePlugin,
	flatConfig,
};

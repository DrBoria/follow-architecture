"use strict";

const path = require("node:path");
const fs = require("node:fs");

const { normalizeArchitecture } = require("./config");
const { checkFile } = require("./checks");

const findRepoRoot = (start) => {
	let dir = start;
	for (;;) {
		if (fs.existsSync(path.join(dir, "package.json")) || fs.existsSync(path.join(dir, ".git"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return start;
		dir = parent;
	}
};

module.exports = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Validate code against a declarative architecture skeleton (nodes graph + invariants) described in the rule options",
			recommended: false,
		},
		messages: {
			"consume-missing": "{{message}}",
			"invariant-must": "{{message}}",
			"invariant-forbid": "{{message}}",
			"name-must": "{{message}}",
			"name-forbid": "{{message}}",
			"name-pattern": "{{message}}",
			"capture-must": "{{message}}",
			"capture-equals": "{{message}}",
			"invariant-absent": "{{message}}",
			"bad-options": "Could not load architecture design: {{reason}}",
		},
		schema: [
			{
				type: "object",
				properties: {
					file: { type: "string" },
					nodes: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "string" },
								pattern: { type: "string" },
								consume: { type: "array" },
								nameMust: { type: "array" },
								nameMessage: { type: "string" },
								nameFix: { type: "string" },
								exclude: { type: "array" },
							},
							required: ["id", "pattern"],
						},
					},
					invariants: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "string" },
								when: { type: "string" },
								absent: { type: "string" },
								message: { type: "string" },
								reason: { type: "string" },
								fix: { type: "string" },
								must: { type: "array" },
								forbid: { type: "array" },
							},
							required: ["id", "when"],
						},
					},
					aliases: { type: "object" },
					root: { type: "string" },
				},
				additionalProperties: false,
			},
		],
	},
	create(context) {
		const option = (context.options && context.options[0]) || {};
		let architecture;
		try {
			architecture = normalizeArchitecture(option);
		} catch (err) {
			return {
				Program(node) {
					context.report({ node, messageId: "bad-options", data: { reason: err.message } });
				},
			};
		}
		const repoRoot = option.root ? path.resolve(context.cwd, option.root) : findRepoRoot(context.cwd);
		const filePath = context.filename || context.getFilename();
		const findings = checkFile(filePath, repoRoot, architecture);
		return {
			Program(node) {
				for (const f of findings) {
					context.report({
						node: f.pos && f.pos.line > 1 ? undefined : node,
						loc: f.pos
							? {
									start: { line: f.pos.line - 1, column: f.pos.column - 1 },
									end: { line: f.pos.line - 1, column: f.pos.column },
								}
							: undefined,
						messageId: f.rule,
						data: { message: f.oneLine || f.message },
					});
				}
			},
		};
	},
};

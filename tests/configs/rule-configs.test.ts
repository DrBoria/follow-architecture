import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
import { loadConfigs } from "../../utils/configs";
import { ruleOptions } from "../../config";

// TOOL configs are RULE options, not architecture: `tailwind.config.js`,
// `postcss.config.cjs`, an SCSS entry — files whose CONTENT a rule may need. The
// architecture says what the code may be; the ESLint config says where the tool's
// own inputs live.
//
// Two failures are the tool's business, not the rule's:
//   • a key is declared and the file is not there   → cannot answer
//   • the file is there and cannot be read/parsed   → cannot answer
// Both name the KEY and the PATH; silence would look like a config with no settings.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-rule-configs-"));
const write = (rel, content) => {
	const abs = path.join(root, rel);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, content);
};

write("tailwind.config.js", "module.exports = { theme: { extend: { colors: { primary: 'var(--color-primary)' } } } };\n");
write("postcss.config.cjs", "module.exports = { plugins: { tailwindcss: {} } };\n");
write("tsconfig.json", '{ "compilerOptions": { "baseUrl": "." } }\n');
write("broken/tailwind.config.js", "module.exports = {\n");
write("not-json.json", "not json at all\n");

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("rule options — configs", () => {
	it("reads a declared config and keeps the path it came from", () => {
		const result = loadConfigs({ repoRoot: root, configs: { tailwind: "tailwind.config.js" } });

		expect(result.missing).toEqual([]);
		expect(result.errors).toEqual([]);
		expect(result.values.tailwind.data.theme.extend.colors).toEqual({ primary: "var(--color-primary)" });
		expect(result.values.tailwind.path).toBe("tailwind.config.js");
	});

	it("a JSON config is the same fact as a JS one", () => {
		expect(loadConfigs({ repoRoot: root, configs: { tsconfig: "tsconfig.json" } }).values.tsconfig.data.compilerOptions.baseUrl).toBe(".");
	});

	it("a missing file is reported by KEY and by PATH", () => {
		const result = loadConfigs({ repoRoot: root, configs: { tailwind: "nope/tailwind.config.js" } });

		expect(result.values.tailwind).toBeNull();
		expect(result.missing).toEqual([{ key: "tailwind", path: "nope/tailwind.config.js" }]);
	});

	it("an unreadable file is an error with its reason, and does not stop the others", () => {
		const result = loadConfigs({ repoRoot: root, configs: { tailwind: "broken/tailwind.config.js", tsconfig: "tsconfig.json" } });

		expect(result.errors.map((entry) => entry.key)).toEqual(["tailwind"]);
		expect(result.errors[0].message.length).toBeGreaterThan(0);
		expect(result.values.tsconfig.data).toBeTruthy();
	});

	it("nothing declared reads nothing, and says so", () => {
		const result = loadConfigs({ repoRoot: root, configs: undefined });

		expect(result.values).toEqual({});
		expect(result.missing).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	it("the eslint rule ACCEPTS the option — it is part of its schema", () => {
		// ESLint nests it (`schema: [{ anyOf: [...] }]`), so the schema is searched
		// rather than navigated: what matters is that a config may be declared.
		const found = [];
		const walk = (value) => {
			if (!value || typeof value !== "object") return;
			if (value.properties?.configs) found.push(value.properties.configs);
			for (const child of Object.values(value)) walk(child);
		};
		walk(ruleOptions());

		expect(found, "the rule must accept `configs`").toHaveLength(1);
		expect(found[0]).toMatchObject({ type: "object" });
	});
});

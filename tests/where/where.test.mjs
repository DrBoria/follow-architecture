import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect } from "vitest";
const { fillTemplate } = require("../../entities/location");

// A destination is a TEMPLATE from the tree resolved against the file that has
// to move. It has to name a real place: a concrete file keeps its own name, a
// family of files (`*.d.ts`) gives the file that name in the family, and a
// folder home ends at the folder.
describe("fillTemplate — the place a finding names", () => {
	it("fills a whole-segment placeholder from the file's own branch", () => {
		expect(fillTemplate("apps/backend/{kebab-case}/type.ts", "apps/backend/document/manager.ts")).toBe("apps/backend/document/type.ts");
	});

	it("drops the `**` — a folder home names the folder", () => {
		expect(fillTemplate("apps/backend/{kebab-case}/actions/**", "apps/backend/document/manager.ts")).toBe("apps/backend/document/actions");
	});

	it("keeps the file's own name when the template names it as a pattern", () => {
		expect(fillTemplate("packages/vscode-extension/{kebab-case}.ts", "apps/backend/utils/ide-editor.ts")).toBe("packages/vscode-extension/ide-editor.ts");
		expect(fillTemplate("packages/vscode-extension/*.d.ts", "packages/vscode-extension/vscode.ts")).toBe("packages/vscode-extension/vscode.d.ts");
	});
});

import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
import { pathsOf } from "../../utils/imports";

// An alias names a FOLDER or an ENTRY FILE, and TypeScript's `paths` needs both
// the alias and its subpaths. Appending `/*` to a file names a folder that
// cannot exist, so a subpath import through an entry-file alias never resolved.
describe("aliases as TypeScript paths", () => {
	it("a folder alias maps its subpaths under the same folder", () => {
		expect(pathsOf({ "@md/utils": "packages/utils" })).toEqual({
			"@md/utils": ["packages/utils"],
			"@md/utils/*": ["packages/utils/*"],
		});
	});

	it("an ENTRY FILE alias maps its subpaths under the file's own folder", () => {
		expect(pathsOf({ "@md/styles": "packages/styles/index.ts" })).toEqual({
			"@md/styles": ["packages/styles/index.ts"],
			"@md/styles/*": ["packages/styles/*"],
		});
	});
});

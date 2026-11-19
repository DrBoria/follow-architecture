import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
import { loadArchitecture } from "../../main";
import { createTsProject } from "../../entities/ast";
import { checkFile } from "../../pipeline";

// A palette token has a FAMILY: `…Content` is what glyphs are painted with,
// everything else paints a surface. Which expression a declaration reads is a
// POSITION in the template, so the rule below is a query over `declarations`
// (`prop`) and `reads` (`text`) — no property list in the engine, no marker in
// the CSS.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-token-family-"));

const write = (rel, content) => {
	const abs = path.join(root, rel);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, content);

	return abs;
};

const ARCH = `
nodes:
  - slug: root
    name: .
    children: ["**"]

invariants:
  - id: token-family
    infer:
      - css:
          templates:
            any:
              declarations:
                any:
                  prop: { in: [color, fill, stroke] }
                  reads:
                    any:
                      text:
                        contains: "theme.colors."
                        not: { endsWith: "Content" }
        report:
          code: rewrite
          description: "glyphs painted with a surface colour"
      - css:
          templates:
            any:
              declarations:
                any:
                  prop: { notIn: [color, fill, stroke] }
                  reads:
                    any:
                      text:
                        contains: "theme.colors."
                        endsWith: "Content"
        report:
          code: rewrite
          description: "a surface painted with a content colour"
`;

write("architecture.yaml", ARCH);

const arch = loadArchitecture(path.join(root, "architecture.yaml"));
arch.repoRoot = root;

const rulesOf = (rel, code) => {
	const abs = write(rel, code);
	const findings = checkFile(abs, arch, createTsProject({ repoRoot: root, aliases: {} }), [rel], new Map());

	return findings.map((finding) => String(finding.dedupeKey ?? "").split(":")[1]).filter(Boolean);
};

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("token family vs the property that reads it", () => {
	it("`color` reading a surface token is reported", () => {
		const rules = rulesOf(
			"src/bad-glyph.tsx",
			'import styled from "styled-components";\n\nconst Title = styled.h2`\n  color: ${({ theme }) => theme.colors.section};\n`;\n',
		);

		expect(rules).toContain("token-family");
	});

	it("`background-color` reading a content token is reported", () => {
		const rules = rulesOf(
			"src/bad-surface.tsx",
			'import styled from "styled-components";\n\nconst Box = styled.div`\n  background-color: ${({ theme }) => theme.colors.sectionContent};\n`;\n',
		);

		expect(rules).toContain("token-family");
	});

	it("the pairing the palette is built for stays silent", () => {
		const rules = rulesOf(
			"src/good.tsx",
			'import styled from "styled-components";\n\nconst Box = styled.div`\n  background-color: ${({ theme }) => theme.colors.section};\n  color: ${({ theme }) => theme.colors.sectionContent};\n  border: 1px solid ${({ theme }) => theme.colors.section};\n`;\n',
		);

		expect(rules).not.toContain("token-family");
	});

	it("a token outside the palette namespace is not confused for a colour", () => {
		const rules = rulesOf(
			"src/offset.tsx",
			'import styled from "styled-components";\n\nconst Box = styled.div`\n  border-radius: ${({ theme }) => theme.offsets.elementContent};\n`;\n',
		);

		expect(rules).not.toContain("token-family");
	});
});

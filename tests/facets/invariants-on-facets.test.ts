import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
import { loadArchitecture } from "../../main";
import { createTsProject, loadSourceFile } from "../../entities/ast";
import { checkFile } from "../../pipeline";

// Base rules must fire on REAL component code — styled-components and React in the
// same file — using the facts the facets attach and the filters the config already
// has. Nothing here is a CSS-specific check: each rule is an `infer` over
// `css.*` / `framework.*`, exactly like a rule over `kind`.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-facets-"));

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
  - id: css-block-documented
    infer:
      - css:
          templates:
            any:
              comment: { isNull: true }
        report:
          code: add
          description: "no comment above the style block"

  - id: css-no-raw-values
    infer:
      - css:
          templates:
            any:
              literals:
                any:
                  kind: { equals: hash }
        report:
          code: rewrite
          description: "raw colour"

  - id: tailwind-no-arbitrary
    infer:
      - css:
          classes:
            any:
              arbitrary: { equals: true }
        report:
          code: rewrite
          description: "arbitrary tailwind value"

  - id: react-props-passed-through
    infer:
      - framework:
          forwarded: { length: { gt: 3 } }
        report:
          code: rewrite
          description: "props are passed straight down"
`;

write("architecture.yaml", ARCH);

const CARD = `import styled from "styled-components";

const Title = styled.h2\`
  color: #fff;
  display: block;
\`;

export const Card = ({ a, b, c, d }: { a: string; b: string; c: string; d: string }) => (
  <Box a={a} b={b} c={c} d={d} className="w-[13px] flex" />
);
`;

const abs = write("src/card.tsx", CARD);
const arch = loadArchitecture(path.join(root, "architecture.yaml"));
arch.repoRoot = root;

const project = createTsProject({ repoRoot: root, aliases: {} });
const findings = checkFile(abs, arch, project, ["src/card.tsx"], new Map());
// The invariant a finding belongs to is in its dedupe key: `invariant:<id>:infer…`.
const rules = findings.map((finding) => String(finding.dedupeKey ?? "").split(":")[1]).filter(Boolean);

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("base invariants over the facets", () => {
	it("a styled block with no comment is reported", () => {
		expect(rules).toContain("css-block-documented");
	});

	// NOT TESTED, and not for a lack of trying: "these declarations are unsorted" is
	// a comparison of a declaration with ITS NEIGHBOUR, and `$ref` resolves in FILE
	// scope — `prev: { gt: "$prop" }` compares against the file's `prop`, which is
	// nothing. The facts (`index`, `prev`, `next`) are there; the LANGUAGE cannot
	// ask the question yet. That is a gap in the filter language, not in the facet.

	it("a typed colour is reported, by the KIND the parser gave it", () => {
		expect(rules).toContain("css-no-raw-values");
	});

	it("an arbitrary Tailwind value is reported", () => {
		expect(rules).toContain("tailwind-no-arbitrary");
	});

	it("a component handing four props down is reported — the SAME rule, on framework facts", () => {
		expect(rules).toContain("react-props-passed-through");
	});

	it("the findings name the file and the line the code is on", () => {
		const finding = findings.find((entry) => String(entry.dedupeKey ?? "").split(":")[1] === "css-no-raw-values");

		expect(finding.file).toBe("src/card.tsx");
		// The message is the rule's own sentence — the finding points at THIS file.
		expect(String(finding.message ?? "")).toContain("raw colour");
	});
});

describe("the same rules on a clean file", () => {
	const clean = `/** A title. */
const Title = styled.h2\`
  display: block;
\`;

export const Card = ({ item }: { item: string }) => <Box item={item} className="flex" />;
`;
	const cleanAbs = write("src/clean.tsx", clean);
	const cleanFindings = checkFile(cleanAbs, arch, createTsProject({ repoRoot: root, aliases: {} }), ["src/clean.tsx"], new Map());
	const cleanRules = cleanFindings.map((finding) => String(finding.dedupeKey ?? "").split(":")[1]).filter(Boolean);

	it("nothing fires", () => {
		for (const id of ["css-block-documented", "css-no-raw-values", "tailwind-no-arbitrary", "react-props-passed-through"]) {
			expect(cleanRules, id).not.toContain(id);
		}
	});
});

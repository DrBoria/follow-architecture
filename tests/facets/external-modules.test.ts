import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
import { loadArchitecture } from "../../main";
import { createTsProject, loadSourceFile, collectCandidates, importNameModules } from "../../entities/ast";
import { checkFile } from "../../pipeline";
import { classifyRoles } from "../../code-roles/classify";
import { enrich as attachFramework } from "../../frameworks";
import { attachToCandidates as attachCss } from "../../css";

// A LIBRARY is a fact, not a silence. `import { useQuery } from "@apollo/client"`
// resolves outside the scanned repo, and the import map keeps the SPECIFIER as
// the module — so a role can be inferred from the transport it calls, and a
// component that calls the transport itself becomes a section. Nothing here
// names apollo in the engine: the specifier is data, the rule is the YAML's.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-external-"));
const write = (rel, content) => {
	const abs = path.join(root, rel);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, content);
	return abs;
};

const ARCH = `
aliases: {}
codeRoles:
  # The UI roles first: a component that reaches the transport is a SECTION
  # (first match wins), the transport-calling piece itself is apiRequest.
  - slug: section
    infer:
      - framework: { component: { equals: true } }
      - calls: { any: { module: { startsWith: "@apollo/client" } } }
  - slug: component
    infer:
      - framework: { component: { equals: true } }
      - calls: { none: { module: { startsWith: "@apollo/client" } } }
    actions:
      declare: { where: ["**"] }
      export: { where: ["**"] }
  - slug: apiRequest
    infer:
      - calls: { any: { module: { startsWith: "@apollo/client" } } }
nodes:
  - slug: root
    name: .
    children: ["**"]
invariants: []
`;
write("architecture.yaml", ARCH);
const arch = loadArchitecture(path.join(root, "architecture.yaml"));
arch.repoRoot = root;

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const rolesOf = (rel, code) => {
	const abs = write(rel, code);
	const project = createTsProject({ repoRoot: root, aliases: {} });
	const sf = loadSourceFile(project, abs, code);
	const candidates = collectCandidates(sf, importNameModules(sf, root, {}, [rel]), rel, root);
	attachFramework(candidates, { rel, sf, text: code, repoRoot: root });
	attachCss(candidates, { sf });
	return classifyRoles(candidates, arch.codeRoles, arch).candidates;
};

describe("a library specifier is a module fact", () => {
	it("a hook calling the transport is apiRequest — the module is the specifier", () => {
		const candidates = rolesOf(
			"src/useCardData.ts",
			'import { useQuery } from "@apollo/client";\nexport function useCardData(id: string) {\n  const { data } = useQuery(QUERY, { variables: { id } });\n  return data;\n}\n',
		);
		const hook = candidates.find((c) => c.name === "useCardData" && c.kind.own.is === "FunctionDeclaration");
		expect(hook.calls.find((x) => x.action === "useQuery").module).toBe("@apollo/client");
		expect(hook.role).toBe("apiRequest");
	});

	it("a component calling the transport itself is a section, not a component", () => {
		const candidates = rolesOf(
			"src/FetchingCard.tsx",
			'import { useQuery } from "@apollo/client";\nexport function FetchingCard() {\n  const { data } = useQuery(QUERY);\n  return <div>{String(data)}</div>;\n}\n',
		);
		const card = candidates.find((c) => c.name === "FetchingCard" && c.kind.own.is === "FunctionDeclaration");
		expect(card.role).toBe("section");
	});

	it("a component calling a repo data hook stays a component", () => {
		write("src/data.ts", 'import { useQuery } from "@apollo/client";\nexport function useCardData() {\n  return useQuery(QUERY);\n}\n');
		const candidates = rolesOf(
			"src/CardView.tsx",
			'import { useCardData } from "./data";\nexport function CardView() {\n  const data = useCardData();\n  return <div>{String(data)}</div>;\n}\n',
		);
		const card = candidates.find((c) => c.name === "CardView" && c.kind.own.is === "FunctionDeclaration");
		expect(card.role).toBe("component");
	});

	it("library edges are not judged as repo relations — styled-components does not fire", () => {
		const abs = write(
			"src/styled.tsx",
			'import styled from "styled-components";\n/** A surface. */\nexport const Box = styled.div`\n  display: flex;\n`;\nexport const Card = () => <Box />;\n',
		);
		const project = createTsProject({ repoRoot: root, aliases: {} });
		const findings = checkFile(abs, arch, project, ["src/styled.tsx"], new Map());
		// A relation finding names a TARGET (`…:import:<role>:…`). The library
		// import/call edges must produce none; a declare/export verdict about the
		// component's own role is a different question and not this test's.
		const relation = findings.filter((f) => /:(import|call|read|mutate|typeImport):/.test(String(f.dedupeKey ?? "")));
		expect(relation).toEqual([]);
	});
});

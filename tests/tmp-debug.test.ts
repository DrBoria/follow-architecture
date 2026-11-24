import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import { createTsProject, loadSourceFile, collectCandidates, importNameModules } from "../entities/ast";
import * as frameworks from "../frameworks";

const rel = "packages/components/atoms/Validation/index.tsx";
const code = readFileSync("/home/legion/Documents/fun/md-starter/" + rel, "utf8");

describe("debug", () => {
	it("wrappers", () => {
		const project = createTsProject();
		const sf = loadSourceFile(project, rel, code);
		const importMap = importNameModules(sf, ".", {}, [rel]);
		const candidates = collectCandidates(sf, importMap, rel, ".");
		frameworks.enrich(candidates, { rel, sf, text: code, repoRoot: "." });
		for (const c of candidates) {
			if (!c.framework) continue;
			process.stdout.write(`${c.name} ${c.kind?.own?.is} props=${JSON.stringify(c.framework.props)} fwd=${JSON.stringify(c.framework.forwarded)} jsx=${c.framework.jsx?.length} calls=${c.calls?.length} assign=${c.assignments?.length}\n`);
		}
	});
});

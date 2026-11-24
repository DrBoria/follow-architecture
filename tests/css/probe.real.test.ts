import { describe, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { SyntaxKind } from "ts-morph";
import { createTsProject, loadSourceFile } from "../../entities/ast";
import * as css from "../../css";

const REPO = "/home/legion/Documents/fun/md-starter";

const walk = (dir: string, out: string[] = []): string[] => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue;
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(abs, out);
		else if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs);
	}
	return out;
};

const aliases = {
	"@md/styles": "packages/styles/index.ts",
	"@md/components": "packages/components/index.ts",
	"@md/sections": "packages/sections/index.ts",
	"@md/types": "packages/types/index.ts",
	"@md/utils": "packages/utils/index.ts",
};

describe("probe real md-starter", () => {
	it("resolution of the two target components", () => {
		const out: string[] = [];
		const project = createTsProject({ repoRoot: REPO, aliases });
		const files = [...walk(path.join(REPO, "packages")), ...walk(path.join(REPO, "apps/_template-keystone"))];
		for (const file of files) {
			try {
				loadSourceFile(project, file, fs.readFileSync(file, "utf8"));
			} catch {
				/* ignore */
			}
		}
		const targets = [
			path.join(REPO, "packages/components/atoms/Containers/styles.ts"),
			path.join(REPO, "packages/components/atoms/Breadcrumbs/styles.ts"),
		];
		for (const target of targets) {
			const sf = project.getSourceFile(target);
			out.push(`\n=== ${path.relative(REPO, target)} (${sf ? "loaded" : "missing"}) ===`);
			if (!sf) continue;
			for (const template of sf.getDescendantsOfKind(SyntaxKind.TaggedTemplateExpression)) {
				const facts = css.templateFacts(template);
				for (const d of facts.declarations) {
					if (!d.resolution) continue;
					const vals = d.resolution.resolvedValues.map((v) => `${v.value}${v.valid === false ? `[INVALID:${v.problems.map((p) => p.kind).join(",")}]` : ""}`);
					const unres = d.resolution.unresolved.map((u) => `UNRESOLVED(${u.kind})`);
					out.push(`${d.prop}: raw=${JSON.stringify(d.resolution.rawValue)} -> ${[...vals, ...unres].join(" | ") || "<none>"}`);
				}
			}
		}
		fs.writeFileSync("/tmp/probe-out.txt", out.join("\n"));
	});
});

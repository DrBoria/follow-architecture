"use strict";

// A dependency WITHOUT an `import`: `interface X extends Imported` and
// `class X implements Imported` name another module's type in the declaration
// itself. The arrow is the same as an `import type`, so the fact has the same
// shape — only `form` differs, and a rule can tell the two apart.

import { startLine } from "./tree";
import { declaredFileOfType, inRepo, repoRelative } from "./file";
import type { SourceFile, TypeChecker } from "ts-morph";
import type { LooseNode } from "./loose";
import type { ImportFact } from "../facts";

const heritageClauses = (decl: LooseNode): LooseNode[] =>
	[decl.getExtends?.(), ...(decl.getImplements?.() ?? [])].flat().filter((c): c is LooseNode => c != null);

const fileOfClause = (clause: LooseNode, checker: TypeChecker, repoRoot: string): string | null => {
	const expr: LooseNode = clause.getExpression?.() ?? clause;
	const found = declaredFileOfType(expr.getType(), checker, repoRoot)?.file ?? null;

	return found && inRepo(found, repoRoot) ? repoRelative(found, repoRoot) : null;
};

const heritageOf = (sf: SourceFile, checker: TypeChecker, repoRoot: string, rel: string): ImportFact[] => {
	const out: ImportFact[] = [];
	const owners: LooseNode[] = [...sf.getInterfaces(), ...sf.getClasses()];

	for (const decl of owners) {
		for (const clause of heritageClauses(decl)) {
			const file = fileOfClause(clause, checker, repoRoot);
			// A type of THIS file is not a dependency; one outside the repo is not one
			// the architecture can describe.
			if (!file) continue;
			if (file === rel) continue;
			if (!inRepo(file, repoRoot)) continue;
			const name = (clause.getExpression?.() ?? clause).getText();
			out.push({ form: "heritage", source: name, typeOnly: true, named: [name], line: startLine(clause), piece: null, resolved: file });
		}
	}

	return out;
};

export { heritageOf };

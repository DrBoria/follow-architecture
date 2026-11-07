"use strict";

// A dependency WITHOUT an `import`: `interface X extends Imported` and
// `class X implements Imported` name another module's type in the declaration
// itself. The arrow is the same as an `import type`, so the fact has the same
// shape — only `form` differs, and a rule can tell the two apart.

const { startLine } = require("./tree");

const heritageOf = (sf, checker, repoRoot, rel) => {
	// Required here, not at the top: `file.js` needs this module, so a top-level
	// require would be a cycle with half of `file.js` still missing.
	const { declaredFileOfType, inRepo, repoRelative } = require("./file");
	const out = [];
	const owners = [...sf.getInterfaces(), ...sf.getClasses()];

	for (const decl of owners) {
		const clauses = [decl.getExtends?.(), ...(decl.getImplements?.() ?? [])].filter(Boolean).flat();
		for (const clause of clauses) {
			const expr = clause.getExpression?.() ?? clause;
			const name = expr.getText();
			const found = declaredFileOfType(expr.getType(), checker, repoRoot)?.file ?? null;
			const file = found && inRepo(found, repoRoot) ? repoRelative(found, repoRoot) : null;
			// A type of THIS file is not a dependency; one outside the repo is not one
			// the architecture can describe.
			if (!file || file === rel || !inRepo(file, repoRoot)) continue;
			out.push({ form: "heritage", source: name, typeOnly: true, named: [name], line: startLine(clause), piece: null, resolved: file });
		}
	}

	return out;
};

module.exports = { heritageOf };

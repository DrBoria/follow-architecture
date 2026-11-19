"use strict";

// A source file: how it is loaded, and everything that is true about it. The
// entity is split by question, each half in its own module, re-exported here so
// every consumer keeps importing `entities/ast/file`:
//   • `./project`     — loading: the run's Project, one parsed file per path;
//   • `./resolve`     — import resolution and "which file declares this value";
//   • `./file-facts`  — fact collection: the whole file's imports/exports/reads.

export { createTsProject, loadSourceFile } from "./project";
export { importNameModules, declaredFileOfNode, declaredFileOf, declaredFileOfType, declaredFileOfExpr, repoRelative, inRepo } from "./resolve";
export { collectFileFacts } from "./file-facts";
export type { DeclInfo } from "./resolve";
export type { AliasMap } from "./project";

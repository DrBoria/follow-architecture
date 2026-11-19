"use strict";

// The accessor-import check: a role handed out ONLY through declared accessors
// (`scopeAccess`) may not be imported by name. The rule is the architecture's
// own — the engine only reads which accessors a role declares and which names
// an import takes out.

import { hitOf } from "../../entities/queries";
import { homesOf } from "../../entities/location";
import { RELATION } from "../../entities/kinds";
import { SCOPE } from "../../code-roles/roles";
import type { Arch, ActionDef, QueryFilter } from "../../entities/architecture";
import type { FileContext } from "../../entities/context";
import type { ImportFact } from "../../entities/facts";
import type { Violation } from "./violation";

// The function-scope accessors a role declares — the only names it is handed
// out as.
const accessorsOf = (action: ActionDef | undefined): string[] =>
	(action?.scopeAccess ?? []).filter((x) => x.scope === SCOPE.FUNCTION).map((x) => x.segments[0]);

// The role's own concrete homes (no placeholders): where an import of it may
// resolve to.
const ownFilesOf = (arch: Arch, roleSlug: string): string[] =>
	homesOf(arch, roleSlug)
		.map((h) => h.template)
		.filter((t) => !/[*{]/.test(t));

// One role's accessor rule, asked of the file's imports.
const checkRoleAccess = (ctx: FileContext, roleSlug: string, accessors: string[], violations: Violation[]): void => {
	const arch = ctx.arch;
	const ownFile = ownFilesOf(arch, roleSlug);
	const importFilter: QueryFilter = { resolved: { in: ownFile }, typeOnly: { equals: false }, named: { any: { not: { in: accessors } } } };
	const repoImports: ImportFact[] = ctx.facts?.imports ?? [];
	const scope = { arch, fileRel: ctx.rel };
	for (const imp of hitOf(repoImports, { any: importFilter }, scope)) {
		const bad = hitOf(imp.named ?? [], { any: { not: { in: accessors } } }, scope);
		if (!bad.length) continue;
		violations.push({
			line: imp.line ?? 1,
			text: `\`${bad.join("`, `")}\` is taken out of \`${imp.resolved}\`, but \`${roleSlug}\` is handed out only as ${accessors.map((a) => `\`${a}(…)\``).join(", ")}`,
			fix: `Import one of the declared accessors (${accessors.join(", ")}) instead of \`${bad[0]}\`.`,
		});
	}
};

const checkAccessorImports = (ctx: FileContext, arch: Arch, declared: Map<string, Map<string, ActionDef>>, violations: Violation[]): void => {
	for (const roleSlug of Object.keys(arch.codeRoles ?? {})) {
		const accessors = accessorsOf(declared.get(RELATION.CALL)?.get(roleSlug));
		if (!accessors.length) continue;
		checkRoleAccess(ctx, roleSlug, accessors, violations);
	}
};

export { checkAccessorImports };
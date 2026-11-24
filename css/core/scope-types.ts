"use strict";

// THE SCOPE a declaration may read, as plain data. A custom property, an SCSS
// variable, a provider literal — the resolver only needs the shape, so the shape
// lives alone and `scope.ts` builds it from documents and templates.

import type { Expression, ObjectLiteralExpression } from "ts-morph";
import { uniqueBy } from "remeda";
import type { Piece } from "./pieces";

// One object literal the project declares and the name it was declared under.
// A PROVIDER is one of these: an object literal whose members may be the value
// a `provider path` read reaches. The resolver does not know which file is "the
// provider" — a caller hands it the literals a role declared.
type ProviderLiteral = { name: string; node: ObjectLiteralExpression };

// One declaration of a variable in scope. Its value is PIECES, because a
// variable may itself quote an expression (`--x: ${theme.x}px`); `media` keeps
// the media query it was declared under, and `expression` is how its pieces get
// back to TypeScript.
type ScopeEntry = { name: string; pieces: Piece[]; media: string | null; declaredLine: number | null; expression: (index: number) => Expression | null };

// The variables a declaration may read, by syntax. Two maps because the two
// spellings are different namespaces; a filter decides which one a project
// allows, not this reader.
type Scope = {
	customProperties: Map<string, ScopeEntry[]>;
	scssVariables: Map<string, ScopeEntry[]>;
	// The provider literals a read may reach. Empty when the caller names no
	// provider role — never filled from a project-wide literals scan.
	providers: ProviderLiteral[];
};

const emptyScope = (): Scope => ({ customProperties: new Map(), scssVariables: new Map(), providers: [] });

// Two entries are the same only when name, media query AND value agree; two
// providers only when the same literal was collected twice.
const entryKey = (entry: ScopeEntry): string => `${entry.name}|${entry.media ?? ""}|${entry.pieces.map((piece) => (piece.kind === "text" ? piece.text : `\u0000${piece.text}`)).join("")}`;

const providerKey = (provider: ProviderLiteral): string => `${provider.name}|${provider.node.getSourceFile().getFilePath()}|${provider.node.getStart()}`;

// Drop the duplicates a scope may have collected twice (the same template read
// by two walks, the same document merged twice).
const normalizeScope = (scope: Scope): Scope => {
	for (const map of [scope.customProperties, scope.scssVariables]) {
		for (const [name, entries] of map) map.set(name, uniqueBy(entries, entryKey));
	}
	scope.providers = uniqueBy(scope.providers, providerKey);

	return scope;
};

// One scope out of several: a component's own templates plus a shared
// stylesheet a caller merges in. Duplicates collapse, the rest unions.
const mergeScopes = (...scopes: Scope[]): Scope => {
	const merged = emptyScope();
	for (const scope of scopes) {
		for (const [name, entries] of scope.customProperties) merged.customProperties.set(name, [...(merged.customProperties.get(name) ?? []), ...entries]);
		for (const [name, entries] of scope.scssVariables) merged.scssVariables.set(name, [...(merged.scssVariables.get(name) ?? []), ...entries]);
		merged.providers.push(...scope.providers);
	}

	return normalizeScope(merged);
};

// The same scope with a different provider set: resolution is asked of the
// providers ONE invariant named, not of any project-wide list.
const withProviders = (scope: Scope, providers: readonly ProviderLiteral[]): Scope => ({ ...scope, providers: [...providers] });

export { emptyScope, mergeScopes, normalizeScope, withProviders };
export type { Scope, ScopeEntry, ProviderLiteral };

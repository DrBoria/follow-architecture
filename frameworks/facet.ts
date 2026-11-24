"use strict";

// The FRAMEWORK FACET contract — what makes a new framework a module, not a
// change to the engine. Every facet (react, vue, angular, and whatever registers
// next) implements this same interface:
//
//   id              the name the namespace carries (`framework.id`)
//   applies(ctx)    the cheap gate: does this file belong to the framework?
//   enrich(cands)   attach the `framework` namespace to the candidates it reads
//   classAttributes the attribute names a class list is written into
//
// `ctx` is the run context a facet may ask about: the file, its path, its text.
// The engine never spells a framework's attribute name or compares a kind by
// hand — the facet answers, the core stays framework-free.

import type { SourceFile } from "ts-morph";
import type { Candidate } from "../entities/facts";

// The run context a facet reads. `sf` is the parsed file; `text` is its raw
// source (a facet that reads markup outside the AST — a Vue `<template>` — needs
// it); `rel`/`repoRoot` place the file; `importMap` says which module each local
// binding was imported from, so a rendered name can resolve across files.
type FacetContext = { rel?: string | null; sf?: SourceFile; text?: string | null; repoRoot?: string | null; importMap?: ReadonlyMap<string, string> };

interface FrameworkFacet {
	id: string;
	applies: (ctx: FacetContext) => boolean;
	enrich: (candidates: Candidate[], ctx: FacetContext) => Candidate[];
	classAttributes?: string[];
}

export type { FacetContext, FrameworkFacet };

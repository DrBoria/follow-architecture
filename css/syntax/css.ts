"use strict";

// Plain CSS. The reference provider: it is only a parser plus the shared
// document reading, so everything it reports is available to every other syntax.

import * as postcss from "postcss";
import type { Root } from "postcss";
import { documentFacts, type DocumentFacts, type DocumentOptions } from "../styled/document";

const id = "css";
const exts = [".css"];
const parse = (text: string): Root => postcss.parse(text, { from: undefined });
const facts = (text: string, options: DocumentOptions = {}): DocumentFacts => documentFacts(text, { ...options, parse, syntax: id });

export { id, exts, parse, facts };

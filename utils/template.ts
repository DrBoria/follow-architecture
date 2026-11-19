"use strict";

// A report TEMPLATE filled with variables: `{name}` is replaced by the value the
// run carries, an unknown name stays a placeholder (the reader sees what the
// template asked for). The ONE spelling of substitution, shared by every report
// sentence — the CLI text and the overview both fill templates the same way.

import type { FieldValue } from "../utils/field";

// The variables a template may name: scalars keyed by name.
type TemplateVars = Record<string, FieldValue>;

const substitute = (text: string, vars: TemplateVars): string =>
	String(text).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (whole, k: string) => (vars[k] != null ? String(vars[k]) : whole));

export { substitute };
export type { TemplateVars };

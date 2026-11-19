"use strict";

import type { FieldValue } from "./utils/field";
import { mapRecord } from "./utils/map-record";

// Normalize the YAML `aliases` section: a flat map of alias name → path.
// Paths are normalized to forward slashes with no trailing slash. The
// entry-by-entry walk is the shared `mapRecord` core.
const normalizeAliases = (raw: Record<string, FieldValue> | null | undefined): Record<string, string> => {
	const source = raw && typeof raw === "object" ? raw : {};

	return mapRecord(source, (_k, v) => String(v).replace(/\\/g, "/").replace(/\/+$/, ""));
};

export { normalizeAliases };

"use strict";

// A FILE NAME is one mechanism: the last segment of a path. The browser names a
// place-box by its file (`graph/representation/fileContents`); any consumer that
// reads a path's leaf asks the same question. The split is the shared `partsOf`
// core; nothing here knows what the path MEANS.

import { partsOf } from "./split";

// The last segment of a path (`a/b/c.ts` → `c.ts`); an empty path names nothing.
const fileName = (p: string | null | undefined): string => (p ? partsOf(p, "/").last : "");

export { fileName };

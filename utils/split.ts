"use strict";

// Splitting a string into its parts — the ONE mechanism behind every "cut this
// into segments and read the head / the tail / the last" question. A path is cut
// by `/`, a class token by `:`; the split is the same, only the separator and what
// the parts MEAN differ. So the split lives here once, and each reader visits the
// parts its own way (a path's leaf names, a class's variants/utility).

type Parts = { all: string[]; head: string[]; last: string };

const partsOf = (text: string | null | undefined, separator: string): Parts => {
	const all = String(text ?? "").split(separator);

	return { all, head: all.slice(0, -1), last: all[all.length - 1] ?? "" };
};

export { partsOf };
export type { Parts };

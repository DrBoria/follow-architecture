"use strict";

// A PLURAL is one mechanism: a count read as "1 thing" / "N things". The browser
// counts roles / rules / matches (`utils/format`); any consumer that names a
// count asks the same question. The irregular plural is the caller's own; the
// regular one adds `s`.

const plural = (n: number, one: string, many?: string): string => `${n} ${n === 1 ? one : many ?? `${one}s`}`;

export { plural };

"use strict";

// Name and variable helpers for the invariant gates: the capture variables a
// file contributes to reports.

const fileVars = (ctx) => ({ path: ctx.rel, dir: ctx.dir, basename: ctx.basename });

module.exports = { fileVars };

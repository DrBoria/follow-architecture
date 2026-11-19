"use strict";

// The terminal / --out report. The finding builder lives in ./finding-from; the
// text renderer in ./render-report. This module is the public surface the CLI
// and the pipeline import — one place, two re-exports, no second copy.

export { findingFrom } from "./finding-from";
export { renderReport, renderNotices, renderConfigError, renderCrashError } from "./render-report";

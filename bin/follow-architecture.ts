#!/usr/bin/env node
"use strict";

import { main } from "../main";
import { renderConfigError, renderCrashError } from "../report/cli-report";
import { isConfigError } from "../report/config-error-guard";

// What the reader sees when the run cannot even start: one sentence naming what
// the config claims and what it may claim instead, plus the file to open. The
// same sentence reaches an editor through the ESLint rule, so the two agree.
const run = (): number => {
	try {
		return main(process.argv.slice(2));
	} catch (error) {
		// Both endings are output of the same tool, so both are shaped by the report
		// module: a config mistake is one sentence, a bug keeps its stack. The marker
		// is read by the ONE guard the config-error builders export.
		const e = error instanceof Error ? error : new Error(String(error));
		console.error(isConfigError(e) ? renderConfigError(e) : renderCrashError(e));
		return 1;
	}
};

process.exitCode = run();

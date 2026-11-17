#!/usr/bin/env node
"use strict";

const { main } = require("../main");
const { renderConfigError, renderCrashError } = require("../report/cli-report");

// What the reader sees when the run cannot even start: one sentence naming what
// the config claims and what it may claim instead, plus the file to open. The
// same sentence reaches an editor through the ESLint rule, so the two agree.
const run = () => {
	try {
		return main(process.argv.slice(2));
	} catch (error) {
		// Both endings are output of the same tool, so both are shaped by the report
		// module: a config mistake is one sentence, a bug keeps its stack.
		console.error(error && error.isConfigError ? renderConfigError(error) : renderCrashError(error));
		return 1;
	}
};

process.exitCode = run();

"use strict";

// CLI argument parsing for the follow-architecture entry point. Kept in its
// own module (not config.js) to avoid a require cycle: config.js (the ESLint
// plugin) needs loadArchitecture from main.js, so main.js must not require
// config.js back.

const DEFAULT_OVERVIEW = "architecture-overview.html";

const parseArgs = (argv) => {
	const args = { config: "architecture.yaml", ignore: [], ignoreDir: [], ext: [], files: [], out: null, overview: null, check: false, cwd: null, help: false };
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		if (a === "--config") args.config = argv[++i];
		else if (a === "--ignore") args.ignore.push(argv[++i]);
		else if (a === "--ext") args.ext.push(argv[++i]);
		else if (a === "--ignore-dir") args.ignoreDir.push(argv[++i]);
		else if (a === "--files") args.files.push(argv[++i]);
		else if (a === "--out") args.out = argv[++i];
		else if (a === "--overview") {
			// The path is optional: `--overview` alone writes the default file,
			// and a following flag must not be swallowed as the path.
			const next = argv[i + 1];
			args.overview = next && !next.startsWith("--") ? argv[++i] : DEFAULT_OVERVIEW;
		} else if (a === "--check") args.check = true;
		else if (a === "--cwd") args.cwd = argv[++i];
		else if (a === "--help" || a === "-h") args.help = true;
	}
	return args;
};

module.exports = { parseArgs };

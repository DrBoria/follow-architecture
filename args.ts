"use strict";

// CLI argument parsing for the follow-architecture entry point. Kept in its
// own module (not config.js) to avoid a require cycle: config.js (the ESLint
// plugin) needs loadArchitecture from main.js, so main.js must not require
// config.js back.

const DEFAULT_OVERVIEW = "architecture-overview.html";

// The parsed command line. `config` defaults; the single-value options stay
// undefined/null when they were not given.
type Args = {
	config: string | undefined;
	ignore: string[];
	ignoreDir: string[];
	ext: string[];
	files: string[];
	out: string | null | undefined;
	overview: string | null;
	check: boolean;
	cwd: string | null | undefined;
	help: boolean;
};

// The keys a `--flag VALUE` option writes into.
type ValueKey = "config" | "ignore" | "ignoreDir" | "ext" | "files" | "out" | "cwd";

// Every option that takes a following value, mapped to the field it fills.
const VALUE_FLAGS: Record<string, ValueKey> = {
	"--config": "config",
	"--ignore": "ignore",
	"--ignore-dir": "ignoreDir",
	"--ext": "ext",
	"--files": "files",
	"--out": "out",
	"--cwd": "cwd",
};

// Apply one `--flag VALUE` option, consuming the value at `i + 1`. A list option
// appends (only when a value follows); a single-value option assigns.
const applyValue = (args: Args, key: ValueKey, argv: string[], i: number): number => {
	const value = argv[i + 1];
	if (key === "ignore") {
		if (value !== undefined) args.ignore.push(value);
	} else if (key === "ignoreDir") {
		if (value !== undefined) args.ignoreDir.push(value);
	} else if (key === "ext") {
		if (value !== undefined) args.ext.push(value);
	} else if (key === "files") {
		if (value !== undefined) args.files.push(value);
	} else {
		args[key] = value;
	}

	return i + 1;
};

// `--overview`'s path is optional: alone it writes the default file, and a
// following flag must not be swallowed as the path.
const applyOverview = (args: Args, argv: string[], i: number): number => {
	const next = argv[i + 1];
	if (next && !next.startsWith("--")) {
		args.overview = next;

		return i + 1;
	}
	args.overview = DEFAULT_OVERVIEW;

	return i;
};

const parseArgs = (argv: string[]): Args => {
	const args: Args = { config: "architecture.yaml", ignore: [], ignoreDir: [], ext: [], files: [], out: null, overview: null, check: false, cwd: null, help: false };
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		const key = VALUE_FLAGS[a];
		if (key) {
			i = applyValue(args, key, argv, i);
			continue;
		}
		if (a === "--overview") {
			i = applyOverview(args, argv, i);
			continue;
		}
		if (a === "--check") {
			args.check = true;
			continue;
		}
		if (a === "--help" || a === "-h") args.help = true;
	}

	return args;
};

export { parseArgs };

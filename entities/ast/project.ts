"use strict";

// LOADING a source file into the run's project. One Project per run, one
// reader per file; single-file components keep their line grid. Nothing here
// knows roles, folders or rules — it only answers "give me the parsed file".

import { Project, ts, type SourceFile } from "ts-morph";
import { pathsOf } from "../../utils/imports";

// The architecture's alias map.
type AliasMap = Record<string, string>;

// One Project per run. Files are added explicitly (never from tsconfig), so the
// engine is independent of the repo's build config; aliases come only from the
// YAML. `skipAddingFilesFromTsConfig` keeps the project empty until we add a file.
const createTsProject = ({ repoRoot, aliases }: { repoRoot?: string; aliases?: AliasMap } = {}): Project =>
	new Project({
		compilerOptions: {
			allowJs: true,
			jsx: ts.JsxEmit.Preserve,
			esModuleInterop: true,
			// The SAME aliases the facts resolve imports with, handed to the compiler
			// that resolves them (`pathsOf`, in `utils/imports` — one translation). No
			// tsconfig is read: the YAML is the only description of where a name
			// points, so a project fact and an import fact cannot disagree.
			...(repoRoot ? { baseUrl: repoRoot, paths: pathsOf(aliases) } : {}),
		},
		skipAddingFilesFromTsConfig: true,
		useInMemoryFileSystem: false,
	});

// One line of a single-file component, kept or blanked by the script walk.
type ScriptState = { inside: boolean; opened: boolean };

// The opening `<script …>` line: everything after the tag is script text; a
// same-line `</script>` closes the block again.
const openedLine = (line: string, state: ScriptState): string => {
	const after = line.slice(line.indexOf(">") + 1);
	if (/<\/script>/.test(after)) {
		state.inside = false;

		return after.replace(/<\/script>[\s\S]*$/, "");
	}
	state.inside = true;
	state.opened = true;

	return after;
};

// A line INSIDE the script block: kept until `</script>` cuts it.
const insideLine = (line: string, state: ScriptState): string => {
	if (/<\/script>/.test(line)) {
		state.inside = false;

		return line.slice(0, line.indexOf("</script>"));
	}

	return line;
};

// A single-file component (.vue / .svelte) holds its TypeScript inside
// `<script>`. Only that block is parsed; every other line is blanked so the
// line numbers a finding reports still match the file the editor shows.
const extractScript = (text: string): { text: string; opened: boolean } => {
	const lines = String(text).split("\n");
	const state: ScriptState = { inside: false, opened: false };
	const kept = lines.map((line) => {
		if (!state.inside && /<script\b[^>]*>/.test(line)) return openedLine(line, state);
		if (state.inside) return insideLine(line, state);

		return "";
	});

	return { text: kept.join("\n"), opened: state.opened };
};

const SFC_RE = /\.(vue|svelte)$/i;

const sourceTextFor = (abs: string, text: string): string => (SFC_RE.test(abs) ? extractScript(text).text : text);

const loadSourceFile = (project: Project, abs: string, text: string): SourceFile => project.createSourceFile(abs, sourceTextFor(abs, text), { overwrite: true });

export { createTsProject, loadSourceFile };
export type { AliasMap };
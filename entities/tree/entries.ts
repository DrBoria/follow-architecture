"use strict";

// Walk a path and report entries the folder does not declare.

import { fillTemplate, placeFor, dirOf, boxOfPlace } from "../../entities/location";
import { missingRequiredChild } from "../../nodes/children";
import { deepestMatch, type NodeMatch } from "./match";
import { choose as structureChoose, render as structureRender } from "../../report/errorTypes/codes/structure";
import type { FieldValue } from "../../utils/field";
import type { FileFacts } from "../facts";
import type { Arch, ArchChild, ArchNode, ReportObject } from "../architecture";
import type { Finding, FindingFrom } from "../findings";
import type { StructureFacts } from "../structure-facts";

// The facts the `structure.*` renders read; `choose`/`render` are untyped in
// their own module, so they are taken through typed views here. The facts shape
// is the ONE contract in `entities/structure-facts`, shared with the renderer.
type StructureVerdict = Required<Pick<ReportObject, "code" | "ask" | "message">> & { fix: string };
const chooseStructure: (facts: StructureFacts) => string = structureChoose;
const renderStructure: (id: string, facts: StructureFacts) => StructureVerdict = structureRender;

// The node one entry belongs to, plus the path it was found at.
type EntryMatch = NodeMatch & { isFile: boolean; rel: string };
type Spot = { role: string; path: string; folder: boolean; file: string | null };

// The repair object the report reads: the sentence plus the box it points at.
// The place fields are the SAME ones a report spec states (`ReportObject`) —
// one vocabulary, derived so the two can never drift.
type StatedRepair = Required<Pick<ReportObject, "ask" | "to" | "path" | "from">> & { message: string; fix: string };

const buildVars = (match: EntryMatch): Record<string, FieldValue> => ({ path: match.rel, basename: match.seg, ...match.caps });

const findChild = (children: ArchChild[], seg: string | undefined, isFile: boolean): ArchChild | null => {
	const r = children.filter((c) => c.folder === !isFile && c.re.test(String(seg)));
	return r.length ? r[0] : null;
};

const templateNode = (arch: Arch, parentSlug: string, child: ArchChild, relPath: string): ArchNode | null => {
	const r = arch.nodes.all.filter((n) => n.parents.includes(parentSlug) && n.name === child.name && n.variants.some((v) => v.re.test(relPath)));
	return r.length ? r[r.length - 1] : null;
};

// The places the file's roles would put it: at home here, or elsewhere.
const scanPlaces = (arch: Arch, facts: FileFacts | null | undefined, rel: string): { homeHere: string[]; spots: Spot[] } => {
	const ownDir = dirOf(rel);
	const homeHere: string[] = [];
	const spots: Spot[] = [];
	for (const role of facts?.roles ?? []) {
		const def = arch.codeRoles?.[role];
		if (!def) continue;
		const place = placeFor(arch, role, rel);
		if (!place) continue;
		if (place.path === ownDir || place.path === rel) homeHere.push(role);
		else spots.push({ role, path: place.path, folder: place.folder, file: place.folder ? null : place.path });
	}
	return { homeHere, spots };
};

// What the structure render needs to describe an undeclared entry.
const structureFactsFor = (match: EntryMatch, arch: Arch, facts: FileFacts | null | undefined): StructureFacts => {
	const { node } = match;
	const allowed = node.children.map((c) => (c.folder ? `${c.name}/` : c.name));
	// What the folder is FOR, in the reader's words: "a feature holds: …".
	const seen = allowed.length ? ` A \`${node.slug}\` folder holds: ${allowed.map((n) => `\`${n}\``).join(", ")}.` : "";
	const { homeHere, spots } = scanPlaces(arch, facts, match.rel);
	const homeFiles = new Map(spots.filter((sp) => !sp.folder && sp.file === sp.path).map((sp) => [sp.role, sp.path]));
	const dest = spots[0]?.path ?? null;
	const named = node.children.find((c) => !c.folder)?.name ?? "the declared pattern";

	return {
		asDir: match.isFile === false,
		dest,
		duplicate: [...homeFiles.values()][0] ?? null,
		homeHere,
		roles: [...new Set(facts?.roles ?? [])],
		held: [...new Set(spots.map((sp) => sp.role))],
		named,
		seen,
	};
};

// The one repair a folder names: the destination box, or the box it leaves.
const statedFor = (arch: Arch, match: EntryMatch, verdict: StructureVerdict, dest: string | null): StatedRepair => {
	const destNode = boxOfPlace(arch, dest);

	return {
		ask: verdict.ask,
		message: verdict.message,
		fix: verdict.fix,
		to: destNode ? [destNode] : [],
		path: dest,
		from: destNode ? null : boxOfPlace(arch, match.rel) ?? match.node.slug ?? null,
	};
};

// The entry is not declared here: say where it belongs, in pictures and words.
const reportUndeclared = (...args: [match: EntryMatch, out: Finding[], findingFrom: FindingFrom, arch: Arch, facts: FileFacts | null | undefined, repoFiles: string[] | null | undefined]): void => {
	const [match, out, findingFrom, arch, facts, repoFiles] = args;
	const { node } = match;
	if (node.variants.some((v) => v.isFile)) return;
	const hasRequired = node.children.some((c) => c.required);
	if (repoFiles && hasRequired && node.required !== true && missingRequiredChild(node, arch, match.rel, { repoFiles, concreteFolder: fillTemplate })) return;
	const factsOfStructure = structureFactsFor(match, arch, facts);
	const verdict = renderStructure(chooseStructure(factsOfStructure), factsOfStructure);
	const stated = statedFor(arch, match, verdict, factsOfStructure.dest);
	out.push(findingFrom({ key: "closed", report: node.report ?? stated }, "nodes", node.slug, `nodes:${node.slug}:closed`, buildVars(match)));
};

const checkEntry = (...args: [match: EntryMatch, child: ArchChild | null, out: Finding[], findingFrom: FindingFrom, arch: Arch, facts: FileFacts | null | undefined, repoFiles: string[] | null | undefined]): void => {
	const [match, child, out, findingFrom, arch, facts, repoFiles] = args;
	if (child && child.forbidden) {
		out.push(findingFrom({ key: "forbidden", report: child.report }, "nodes", match.node.slug, `nodes:${match.node.slug}:forbidden`, buildVars(match)));
		return;
	}
	if (!child) reportUndeclared(match, out, findingFrom, arch, facts, repoFiles);
};

const checkTree = (...args: [relPath: string, arch: Arch, out: Finding[], finding: FindingFrom, facts: FileFacts | null | undefined, repoFiles: string[] | null | undefined]): void => {
	const [relPath, arch, out, finding, facts, repoFiles] = args;
	const match = deepestMatch(relPath, arch);
	if (!match) return;
	const m = match.node.prefixRe.exec(relPath);
	const rest = m?.[match.node.prefixNames.length + 2];
	const parts: (string | undefined)[] = rest == null ? [match.seg] : [match.seg, ...rest.split("/")];
	let node: ArchNode | null = match.node;
	for (let idx = 0; idx < parts.length; idx += 1) {
		const seg = parts[idx];
		const last = idx === parts.length - 1;
		const child = findChild(node.children, seg, last);
		checkEntry({ node, seg, isFile: last, caps: match.caps, rel: relPath }, child, out, finding, arch, facts, repoFiles);
		if (!child) {
			node = null;
			break;
		}
		node = child.slug ? arch.nodes.bySlug[child.slug] ?? null : templateNode(arch, node.slug, child, relPath);
		if (!node) break;
	}
};

export { checkTree, findChild, templateNode };

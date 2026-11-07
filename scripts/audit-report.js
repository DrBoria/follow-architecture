#!/usr/bin/env node
"use strict";

// AUDIT: does any finding describe the same thing differently in the text and in
// the picture?
//
// The report has ONE decision maker (`report/errorTypes/decision-maker.js`) and two
// representations (text, graph). This script checks the OUTPUT of both: every
// destination an option carries must be named in its text, every option that
// carries a destination must be drawn, and a relation's sentence must name the
// file its target card shows. Run it after a report build:
//
//   node scripts/audit-report.js ../md-prettify/reports/architecture-overview.html

const fs = require("fs");

const file = process.argv[2];
if (!file) {
	console.error("usage: audit-report.js <path to architecture-overview.html>");
	process.exit(2);
}

const html = fs.readFileSync(file, "utf8");
const match = /<script type="application\/json" id="arch-data">([\s\S]*?)<\/script>/.exec(html);
if (!match) {
	console.error("no arch-data payload in that file");
	process.exit(2);
}
const data = JSON.parse(match[1]);

const pathsOf = (slug) => data.nodes.find((n) => n.slug === slug)?.paths ?? [];
const problems = [];
const add = (kind, f, detail) => problems.push({ kind, file: f.file, line: f.line, detail });

for (const f of data.findings) {
	const story = f.story ?? {};
	if (!story.type) continue;

	// 1. A destination an option CARRIES must be named in its text, and a
	//    destination its text names must be carried. Otherwise the arrow and the
	//    line describe different places.
	//    The PLACE is what the sentence names (`path`); the BOX is where the arrow
	//    lands. They are not required to be the same string — a feature box is
	//    spelled `apps/backend/{kebab-case}`, while the sentence names the file
	//    (`apps/backend/document/store.ts`) — but the sentence must name the place
	//    the repair carries.
	for (const o of f.fixOptions ?? []) {
		const text = String(o.text ?? "");
		const carried = (o.to ?? []).flatMap(pathsOf);
		if (o.path) {
			if (!text.includes(o.path)) add("option carries a place its text does not name", f, `${o.code}: ${o.path}`);
			continue;
		}
		if (!carried.length) continue;
		for (const path of carried) {
			if (!text.includes(path)) add("option carries a destination its text does not name", f, `${o.code}: ${path}`);
		}
		const named = [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
		if (!named.some((n) => carried.includes(n))) add("option carries a destination its text does not name in full", f, o.code);
	}

	// 1b. THE OTHER DIRECTION — and it is the one that was missing. A sentence
	//     that says "Move … to `X`" names a place, so the repair must carry it:
	//     either as boxes (`to`) or as the place itself (`path`, for a home that
	//     is a template and has no box yet). This is the check that would have
	//     caught 43 findings whose text moved code and whose picture moved
	//     nothing — every one of them was a `fileContents` finding, and the
	//     audit used to skip that type entirely.
	for (const o of f.fixOptions ?? []) {
		const text = String(o.text ?? "");
		const namedTo = /\b(?:to|into)\s+`([^`]+)`/.exec(text)?.[1] ?? null;
		if (!namedTo) continue;
		const carried = (o.to ?? []).length > 0;
		if (!carried && !o.path) add("text names a destination the repair does not carry", f, `${o.code}: ${namedTo}`);
		else if (o.path && o.path !== namedTo) add("text and repair name different destinations", f, `${o.path} vs ${namedTo}`);
	}

	// 2. Every repair must be DRAWABLE: an arrow (`to`) or a mark (`from`).
	//    A sentence that says "Remove …" while the picture shows nothing is the
	//    divergence this file exists to catch.
	for (const o of f.fixOptions ?? []) {
		// Repairs with no geometry: the rule's own words (`rules`), "give this code
		// a role" (`role`), "create what is missing" (`add`). They name no place,
		// and the card says so — that is not a divergence.
		if (o.code === "rules" || o.code === "role" || o.code === "add") continue;
		// A deletion has no geometry either — and it is NOT the same as "nothing":
		// the card must say "removed", which `plan.remove` carries.
		if (o.code === "remove") {
			if (!f.plan?.remove) add("removal is not drawn as a removal", f, o.text.slice(0, 60));
			continue;
		}
		// `split` / `rewrite`: no place to move to BY DESIGN — the change is inside
		// the file. The picture says so with the repair's own word in the box
		// (`action`), so the counterpart exists and is checked here.
		if (o.code === "split" || o.code === "rewrite" || o.code === "merge") {
			if ((f.plan?.repair?.code ?? null) !== o.code) add("repair word is not carried", f, o.code);
			continue;
		}
		if (!(o.to ?? []).length && !o.from) add("option with no visual counterpart", f, `${o.code}: ${o.text.slice(0, 60)}`);
	}

	// 3. A relation's sentence must name the file the target card shows.
	if (story.type === "wrongAction" && story.target?.paths?.[0]) {
		if (!String(f.message).includes(story.target.paths[0])) add("message does not name the touched file", f, story.target.paths[0]);
	}

	// 3. Every destination the picture draws must come from the story, not from
	//    the representation's own idea of where things are.
	if (story.type === "wrongPlacement" && !(story.to ?? []).length) add("placement finding without a destination", f, f.file);
}

const byKind = {};
for (const p of problems) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;

console.log(`findings: ${data.findings.length} | problems: ${problems.length}`);
if (problems.length) {
	console.log(byKind);
	for (const p of problems.slice(0, 30)) console.log(`- [${p.kind}] ${p.file}:${p.line} — ${p.detail}`);
	process.exit(1);
}

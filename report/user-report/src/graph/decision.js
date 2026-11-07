// Which representation draws this story: the only decision in the picture.
import { fileContents } from "./representation/fileContents";
import { unknownRole } from "./representation/unknownRole";
import { wrongAction } from "./representation/wrongAction";
import { wrongPlacement } from "./representation/wrongPlacement";

const REPRESENTATIONS = [wrongAction, wrongPlacement, unknownRole, fileContents];

export const decideRepresentation = (story) =>
	REPRESENTATIONS.find((r) => r.handles(story ?? { type: "none" })) ?? fileContents;

/**
 * Story → a ready-to-render picture.
 *
 * Returns
 *   representation  the module key, so a test can assert WHICH picture was chosen
 *   title           the heading of the panel ("A relation the architecture forbids")
 *   caption         one sentence saying what the reader is looking at
 *   nodes           ONLY the boxes the picture needs (the graph is a diagram of
 *                   the problem, not a thumbnail of the architecture)
 *   edges           arrows, `broken: true` for the ones that are the finding
 *   marks           slug → "wrong" | "right" boxes
 */
export const buildProblemView = ({ finding, story, nodes }) => {
	// The OPTIONS are the same objects the text prints: the picture draws their
	// destinations and never derives one of its own.
	const options = finding?.fixOptions ?? [];
	const subject = finding ?? {};
	const representation = decideRepresentation(story);
	const built = representation.build({ finding: subject, story, nodes, options });
	const edges = built.edges ?? [];
	const marks = built.marks ?? {};
	const wanted = new Set([
		...(built.only ?? []),
		...edges.flatMap((e) => [e.from, e.to]),
		...Object.keys(marks),
	]);
	if (!wanted.size && finding?.ownerNode) wanted.add(finding.ownerNode);

	return {
		representation: representation.key,
		title: representation.title,
		// The boxes the picture ASKED for: a finding about one declaration draws the
		// file it sits in and no arrow at all, so the canvas must not filter it out
		// for having no edge.
		keep: [...wanted],
		caption: representation.caption({ finding: subject, story, nodes, options }),
		// A picture may OVERRIDE what a box says: when the destination is a file
		// inside the box the code is already in, that box has to name the file (and
		// its real folder) instead of the declared pattern it stands for.
		// `extra` boxes are places the picture draws that the architecture tree has
		// no node for (a file inside a folder): a move between two files of one
		// folder is still a move, and it needs a from and a to.
		nodes: [...nodes, ...(built.extra ?? [])]
			.filter((n) => wanted.has(n.slug))
			.map((n) => {
				const places = built.places?.[n.slug];
				const name = built.rename?.[n.slug];
				const action = built.action?.[n.slug];
				if (!places && !name && !action) return n;
				return { ...n, ...(places ? { places } : null), ...(name ? { name } : null), ...(action ? { action } : null) };
			}),
		edges,
		marks,
	};
};

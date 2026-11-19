// Which representation draws this story: the only decision in the picture.
// Story → a ready-to-render view: the boxes the picture needs (a diagram of the
// problem, not a thumbnail of the architecture), the arrows, and the marks.
import { fileContents } from "./representation/fileContents";
import { unknownRole } from "./representation/unknownRole";
import { wrongAction } from "./representation/wrongAction";
import { wrongPlacement } from "./representation/wrongPlacement";
import type { Representation, Scene, Built, ProblemEdge, Mark, PlaceBox } from "./representation/contract";
import type { Story } from "../../../../entities/story";
import type { EnrichedFinding } from "../../../../entities/enriched-finding";
import type { NodeSummary } from "../../../../entities/overview-summaries";

const REPRESENTATIONS: Representation[] = [wrongAction, wrongPlacement, unknownRole, fileContents];

const decideRepresentation = (story: Story | null | undefined): Representation =>
	REPRESENTATIONS.find((r) => r.handles(story ?? { type: "none", from: null, to: [] })) ?? fileContents;

// A box the picture may override: its places, its name, or the word in it.
type ViewNode = NodeSummary & { places?: string[]; action?: string };

// The boxes the picture ASKED for, with the overrides it stated. `extra` boxes
// are places the architecture tree has no node for (a file inside a folder).
const viewBoxes = (nodes: readonly NodeSummary[], built: Built, wanted: ReadonlySet<string>): ViewNode[] =>
	[...nodes, ...(built.extra ?? [])]
		.filter((n) => wanted.has(n.slug))
		.map((n) => {
			const places = built.places?.[n.slug];
			const name = built.rename?.[n.slug];
			const action = built.action?.[n.slug];
			if (!places && !name && !action) return n;
			return { ...n, ...(places ? { places } : null), ...(name ? { name } : null), ...(action ? { action } : null) };
		});

// The slugs the picture needs: the ones it asked for, the ones its arrows
// touch, the ones it marked — and the owner when nothing else is named.
const wantedSlugs = (built: Built, edges: readonly ProblemEdge[], marks: Record<string, Mark>, finding: EnrichedFinding): Set<string> => {
	const wanted = new Set([...(built.only ?? []), ...edges.flatMap((e) => [e.from, e.to]), ...Object.keys(marks)]);
	if (!wanted.size && finding?.ownerNode) wanted.add(finding.ownerNode);
	return wanted;
};

// The ready-to-render view: which picture, its title and caption, the boxes,
// the arrows, the marks, and the slugs the canvas must keep.
type ProblemView = {
	representation: string;
	title: string;
	keep: string[];
	caption: string;
	nodes: ViewNode[];
	edges: ProblemEdge[];
	marks: Record<string, Mark>;
};

const buildProblemView = (input: { finding: EnrichedFinding; story: Story; nodes: NodeSummary[] }): ProblemView => {
	const { finding, story, nodes } = input;
	// The OPTIONS are the same objects the text prints: the picture draws their
	// destinations and never derives one of its own.
	const scene: Scene = { finding, story, nodes, options: finding?.fixOptions ?? [] };
	const representation = decideRepresentation(story);
	const built = representation.build(scene);
	const edges = built.edges ?? [];
	const marks = built.marks ?? {};
	const wanted = wantedSlugs(built, edges, marks, finding);

	return {
		representation: representation.key,
		title: representation.title,
		keep: [...wanted],
		caption: representation.caption(scene),
		nodes: viewBoxes(nodes, built, wanted),
		edges,
		marks,
	};
};

export { buildProblemView, decideRepresentation };
export type { ProblemView, ViewNode, PlaceBox };

// The role's answers as a dashboard of cards: how it is detected, a real
// example, what its code may do, what may be done with it, and the report it
// prints when misfiled. The cards live in `role-detail/`; this component is the
// example/template wiring and the card order only.

import React from "react";
import { Dashboard } from "./role-detail/styles";
import { outgoingOf, fillOf, InferCard, ExampleCard, OutgoingCard, ActionsCard, ReportCard } from "./role-detail/cards";
import type { RoleSummary, NodeSummary } from "../../../../entities/overview-summaries";
import type { AccessGraph } from "../../../../entities/access-graph";

type RoleDetailProps = { role: RoleSummary; nodes?: NodeSummary[]; graph?: AccessGraph | null; showInfer?: boolean };

// A report template read literally looks like a broken message. Filled with
// the example this role actually has, it is the sentence the rule prints.
const folderOf = (file: string | undefined): string => (file ? file.split("/").slice(0, -1).join("/") : "");

// The example's own fields, when it has them (the name and the file).
const exampleValues = (example: RoleSummary["examples"][number] | undefined): Record<string, string> => {
	const values: Record<string, string> = { folder: folderOf(example?.file) };
	if (example?.name) values.what = example.name;
	if (example?.file) values.path = example.file;
	return values;
};

// The home's own fields, when the tree names one (the path and the slug).
const homeValues = (home: RoleSummary["homes"][number] | undefined): Record<string, string> => {
	const values: Record<string, string> = {};
	if (home?.paths?.[0]) values.destination = home.paths[0];
	if (home?.slug) values.destinationSlug = home.slug;
	return values;
};

const templateValues = (role: RoleSummary): Record<string, string> => ({
	what: role.name ?? "",
	path: "",
	destination: "…",
	destinationSlug: "…",
	...exampleValues(role.examples?.[0]),
	...homeValues(role.homes?.[0]),
});

// The "no matches" note when the infer classifies nothing in this repository.
const NoMatches = (): React.JSX.Element => (
	<div style={{ fontSize: 12.5, color: "#fbbf24" }}>
		No code in this repository matches this role — the declared `infer` block classifies nothing here.
	</div>
);

export const RoleDetail = ({ role, graph = null, showInfer = true }: RoleDetailProps): React.JSX.Element => {
	const example = role.examples?.[0] ?? null;
	const outgoing = outgoingOf(role, graph);
	const fill = fillOf(templateValues(role));

	return (
		<Dashboard>
			{showInfer ? <InferCard role={role} /> : null}
			{role.exampleCount === 0 ? <NoMatches /> : null}
			<ExampleCard example={example} />
			<RoleCards role={role} outgoing={outgoing} fill={fill} />
		</Dashboard>
	);
};

// The cards that depend on what the role declares: its reach, its actions, its
// report. Each appears only when the role has the thing it answers.
const RoleCards = ({ role, outgoing, fill }: { role: RoleSummary; outgoing: ReturnType<typeof outgoingOf>; fill: (text: string | null | undefined) => string }): React.JSX.Element => (
	<>
		{outgoing.length ? <OutgoingCard role={role} outgoing={outgoing} /> : null}
		{role.actions?.length ? <ActionsCard role={role} /> : null}
		{role.report?.message ? <ReportCard role={role} fill={fill} /> : null}
	</>
);

import React from "react";
import { Shell } from "./components/Shell";
import { SummaryScreen } from "./screens/SummaryScreen";
import { TreeScreen } from "./screens/TreeScreen";
import { GraphScreen } from "./screens/GraphScreen";
import { InvariantsScreen } from "./screens/InvariantsScreen";
import { FindingsScreen } from "./screens/FindingsScreen";
import { useRoute } from "./utils/router";

const SCREENS = {
	summary: SummaryScreen,
	tree: TreeScreen,
	graph: GraphScreen,
	invariants: InvariantsScreen,
	findings: FindingsScreen,
};

const App = ({ data }) => {
	const { tab, params } = useRoute();
	const Screen = SCREENS[tab] ?? SummaryScreen;

	return (
		<Shell data={data} tab={tab}>
			<Screen data={data} params={params} />
		</Shell>
	);
};

export default App;

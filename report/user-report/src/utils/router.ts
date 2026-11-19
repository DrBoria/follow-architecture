// Minimal hash router: `#/findings?invariant=no-re-exports&file=src/a.ts&line=1`
//
// Deep links matter here: a finding, a role or a node is something you want to
// send to a colleague ("look at this"), and the browser's back button should
// behave. No dependency needed for five routes.

import { useEffect, useState } from "react";

// The five screens, in tab order. A readonly tuple — the route check reads it.
export const TABS: readonly string[] = ["summary", "tree", "graph", "invariants", "findings"];

// One route: a tab and its query params (all strings — the hash is text).
type Route = { tab: string; params: Record<string, string> };
type RouteParams = Record<string, string | number | null | undefined>;

const parseHash = (): Route => {
	const raw = window.location.hash.replace(/^#\/?/, "");
	const [path, query = ""] = raw.split("?");
	const params = Object.fromEntries(new URLSearchParams(query));
	const tab = TABS.includes(path) ? path : "summary";
	return { tab, params };
};

export const buildHref = (tab: string, params: RouteParams = {}): string => {
	const clean = Object.entries(params).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)]);
	const qs = new URLSearchParams(clean).toString();
	return `#/${tab}${qs ? `?${qs}` : ""}`;
};

export const navigate = (tab: string, params: RouteParams = {}): void => {
	const href = buildHref(tab, params);
	if (window.location.hash === href) return;
	window.location.hash = href;
};

export const useRoute = (): Route => {
	const [route, setRoute] = useState(parseHash);

	useEffect(() => {
		const onChange = () => setRoute(parseHash());
		window.addEventListener("hashchange", onChange);
		if (!window.location.hash) window.location.hash = "#/summary";
		return () => window.removeEventListener("hashchange", onChange);
	}, []);

	return route;
};

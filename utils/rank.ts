"use strict";

// A RANKED SHORTLIST is one mechanism: candidates are scored against a subject,
// the ones below the bar are dropped, and the rest are offered best first. A
// role's destinations are its homes scored by branch and prefix
// (`entities/location/homes`); a folder's lookalikes are the declared entities
// scored by the share of their roles it holds (`nodes/similar`). The walk is
// the same — score, keep, rank — so it lives here once. What a candidate IS,
// how it is scored and what the bar means are the caller's own.

// Score every candidate, keep the ones the scorer offers (non-null), and sort
// them by the caller's ranking. The scorer's own verdict decides inclusion;
// nothing here knows homes or entities.
const rankedOffers = <Candidate, Offer>(
	candidates: readonly Candidate[],
	offer: (candidate: Candidate) => Offer | null,
	rank: (a: Offer, b: Offer) => number,
): Offer[] => {
	const offers: Offer[] = [];
	for (const candidate of candidates) {
		const hit = offer(candidate);
		if (hit != null) offers.push(hit);
	}
	offers.sort(rank);

	return offers;
};

export { rankedOffers };
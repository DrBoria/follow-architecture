// Render an architecture `infer` block back to readable YAML. The report shows
// the *rule itself* next to the code it matches, so a reader can see why a
// declaration is classified the way it is — no hand-written docs involved.

const isScalar = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
const isFlatArray = (v) => Array.isArray(v) && v.every(isScalar);
const isFlowCandidate = (v) =>
	v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => isScalar(x) || isFlatArray(x));

const flow = (obj) => `{ ${Object.entries(obj).map(([k, v]) => `${k}: ${scalar(v)}`).join(", ")} }`;

const scalar = (v) => {
	if (isFlatArray(v)) return `[${v.map(scalar).join(", ")}]`;
	if (typeof v === "string") return /^[A-Za-z0-9_.*-]+$/.test(v) ? v : JSON.stringify(v);
	return String(v);
};

const emit = (value, indent) => {
	const pad = " ".repeat(indent);
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return Object.entries(value)
			.map(([k, v]) => {
				if (isScalar(v) || isFlatArray(v) || isFlowCandidate(v)) return `${pad}${k}: ${isFlowCandidate(v) ? flow(v) : scalar(v)}`;
				if (Array.isArray(v)) return `${pad}${k}:\n${emit(v, indent + 2)}`;
				return `${pad}${k}:\n${emit(v, indent + 2)}`;
			})
			.join("\n");
	}
	if (Array.isArray(value)) {
		return value
			.map((item) => {
				if (isScalar(item) || isFlatArray(item)) return `${pad}- ${scalar(item)}`;
				const body = emit(item, indent + 2);
				return `${pad}- ${body.trimStart()}`;
			})
			.join("\n");
	}
	return `${pad}${scalar(value)}`;
};

// Copy-pasteable YAML for the `infer:` block.
export const inferToYaml = (infer) => {
	if (infer == null) return "infer: []";
	const list = Array.isArray(infer) ? infer : [infer];
	return `infer:\n${emit(list, 2)}`;
};

// Render an architecture `infer` block back to readable YAML. The report shows
// the *rule itself* next to the code it matches, so a reader can see why a
// declaration is classified the way it is — no hand-written docs involved.
// The value model is the engine's own (`utils/field`): plain data, read through
// the shared guards, never re-typed.

import { isList, isObj, type FieldValue } from "../../../../utils/field";

const isScalar = (v: FieldValue): boolean => v === null || ["string", "number", "boolean"].includes(typeof v);
const isFlatArray = (v: FieldValue): boolean => isList(v) && v.every(isScalar);
const isFlowCandidate = (v: FieldValue): boolean => isObj(v) && Object.values(v).every((x) => isScalar(x) || isFlatArray(x));

const scalar = (v: FieldValue): string => {
	if (isFlatArray(v) && isList(v)) return `[${v.map(scalar).join(", ")}]`;
	if (typeof v === "string") return /^[A-Za-z0-9_.*-]+$/.test(v) ? v : JSON.stringify(v);
	return String(v);
};

const flow = (obj: { readonly [key: string]: FieldValue }): string =>
	`{ ${Object.entries(obj).map(([k, v]) => `${k}: ${scalar(v)}`).join(", ")} }`;

// One record entry: a flow scalar when it fits on one line, a nested block else.
const recordEntry = (k: string, v: FieldValue, pad: string, indent: number): string => {
	if (isScalar(v) || isFlatArray(v)) return `${pad}${k}: ${scalar(v)}`;
	if (isFlowCandidate(v) && isObj(v)) return `${pad}${k}: ${flow(v)}`;
	return `${pad}${k}:\n${emit(v, indent + 2)}`;
};

// One list item: a scalar on its own dash line, a block indented under it.
const listEntry = (item: FieldValue, pad: string, indent: number): string => {
	if (isScalar(item) || isFlatArray(item)) return `${pad}- ${scalar(item)}`;
	const body = emit(item, indent + 2);
	return `${pad}- ${body.trimStart()}`;
};

const emit = (value: FieldValue, indent: number): string => {
	const pad = " ".repeat(indent);
	if (isObj(value)) return Object.entries(value).map(([k, v]) => recordEntry(k, v, pad, indent)).join("\n");
	if (isList(value)) return value.map((item) => listEntry(item, pad, indent)).join("\n");
	return `${pad}${scalar(value)}`;
};

// Copy-pasteable YAML for the `infer:` block.
export const inferToYaml = (infer: FieldValue): string => {
	if (infer == null) return "infer: []";
	const list = isList(infer) ? infer : [infer];
	return `infer:\n${emit(list, 2)}`;
};

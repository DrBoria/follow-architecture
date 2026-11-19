// The relation words, imported from report/errorTypes (never retyped).
import * as shared from "../../../errorTypes/vocabulary/verbs";

export const verbOf = (kind: string): string => shared.verbOf(kind);
export const baseVerbOf = (kind: string): string => shared.baseVerbOf(kind);
export const nounOf = (kind: string): string => shared.nounOf(kind);

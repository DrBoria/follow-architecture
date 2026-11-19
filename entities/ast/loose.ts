"use strict";

// A node the walkers PROBE for optional capabilities: a generic AST node, plus
// the methods some kinds have and others do not. Callers guard with `typeof
// x.y === "function"` (or a ts-morph `Node.is…` guard) before using one; the
// optional shape is what lets the probe type-check without `any`.
import type { Node, Decorator, CommentRange } from "ts-morph";

type LooseNode = Node & {
	getName?: () => string | undefined;
	getNameNode?: () => Node | undefined;
	getModifiers?: () => Node[] | undefined;
	getDecorators?: () => Decorator[] | undefined;
	getInitializer?: () => Node | undefined;
	getLiteralText?: () => string | undefined;
	getJsDocs?: () => Node[] | undefined;
	getBody?: () => Node | undefined;
	getExpression?: () => Node | undefined;
	getTypeNode?: () => Node | undefined;
	getReturnTypeNode?: () => Node | undefined;
	getMembers?: () => LooseNode[] | undefined;
	getDeclarationKind?: () => string | undefined;
	getExtends?: () => Node | Node[] | undefined;
	getImplements?: () => Node[] | undefined;
	getConstructors?: () => LooseNode[] | undefined;
	getParameters?: () => LooseNode[] | undefined;
	getElements?: () => LooseNode[] | undefined;
	isOptional?: () => boolean;
	isStatic?: () => boolean;
	findReferencesAsNodes?: () => Node[];
	getImplementations?: () => { readonly length: number };
	getLeadingCommentRanges?: () => CommentRange[] | undefined;
	getTrailingCommentRanges?: () => CommentRange[] | undefined;
	getTypeArguments?: () => Node[] | undefined;
	getExprName?: () => Node | undefined;
	getTypeName?: () => Node | undefined;
	getTypeNodes?: () => Node[] | undefined;
	getElementTypeNode?: () => Node | undefined;
	getObjectTypeNode?: () => Node | undefined;
	getConstraint?: () => Node | undefined;
};

export type { LooseNode };

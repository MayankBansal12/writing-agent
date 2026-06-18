import type { Editor } from "@tiptap/core";
import {
	MarkdownSerializer,
	type MarkdownSerializerState,
} from "prosemirror-markdown";
import type { Mark, Node } from "prosemirror-model";

type MarkSpec = {
	open:
		| string
		| ((
				state: MarkdownSerializerState,
				mark: Mark,
				parent: Node,
				index: number,
		  ) => string);
	close:
		| string
		| ((
				state: MarkdownSerializerState,
				mark: Mark,
				parent: Node,
				index: number,
		  ) => string);
	mixable?: boolean;
	expelEnclosingWhitespace?: boolean;
	escape?: boolean;
};

type NodeSpec = (
	state: MarkdownSerializerState,
	node: Node,
	parent: Node,
	index: number,
) => void;

type SerializerLike = {
	serialize: (doc: Node) => string;
	nodes: Record<string, NodeSpec>;
	marks: Record<string, MarkSpec>;
};

type Storage = {
	serializer: SerializerLike;
	getMarkdown: () => string;
};

export function patchMarkdownSerializer(editor: Editor): void {
	const storage = editor.storage as unknown as Record<string, unknown>;
	const md = storage.markdown as Storage | undefined;
	if (!md?.serializer) return;

	const original = md.serializer;

	const sanitizedMarks: Record<string, MarkSpec> = {};
	for (const [name, spec] of Object.entries(original.marks)) {
		sanitizedMarks[name] = { ...spec, expelEnclosingWhitespace: false };
	}

	const sanitizedNodes: Record<string, NodeSpec> = { ...original.nodes };

	const replacement = new MarkdownSerializer(sanitizedNodes, sanitizedMarks, {
		hardBreakNodeName: "hardBreak",
		strict: false,
	});

	md.serializer = {
		...original,
		serialize: (doc: Node) => replacement.serialize(doc),
	};
}

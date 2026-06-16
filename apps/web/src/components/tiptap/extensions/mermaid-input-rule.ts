import { Extension, InputRule } from "@tiptap/core";

const mermaidInputRegex = /^```mermaid\s$/;

export const MermaidInputRule = Extension.create({
	name: "mermaidInputRule",

	addInputRules() {
		return [
			new InputRule({
				find: mermaidInputRegex,
				handler: ({ state, range }: { state: { tr: import("@tiptap/pm/state").Transaction; schema: { nodes: Record<string, import("@tiptap/pm/model").NodeType> } }; range: { from: number; to: number } }) => {
					const { tr, schema } = state;
					const nodeType = schema.nodes.mermaidBlock;
					if (!nodeType) return;

					tr.delete(range.from, range.to);
					tr.insert(
						range.from,
						nodeType.create({ code: "", width: "50%" }),
					);
				},
			}),
		];
	},
});

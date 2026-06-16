"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { MermaidDiagram } from "../../ui/mermaid-diagram";

function MermaidBlockView({ node }: NodeViewProps) {
	const code = node.attrs.code ?? "";

	return (
		<NodeViewWrapper as="div" className="mermaid-block-wrapper">
			<MermaidDiagram code={code} />
		</NodeViewWrapper>
	);
}

export const MermaidBlock = Node.create({
	name: "mermaidBlock",
	group: "block",
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			code: {
				default: "",
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: "pre",
				priority: 51,
				getAttrs: (el) => {
					const codeEl = (el as HTMLElement).querySelector("code.language-mermaid");
					if (!codeEl) return false;
					return { code: codeEl.textContent ?? "" };
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"pre",
			mergeAttributes(HTMLAttributes, { "data-type": "mermaid-block" }),
			["code", { class: "language-mermaid" }, HTMLAttributes.code ?? ""],
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(MermaidBlockView);
	},

	addStorage() {
		return {
			markdown: {
				serialize(state: { write: (s: string) => void; ensureNewLine: () => void; closeBlock: (node: { attrs: Record<string, unknown> }) => void }, node: { attrs: { code?: string } }) {
					state.write("```mermaid\n");
					state.write((node.attrs.code ?? "").replace(/\n$/, ""));
					state.ensureNewLine();
					state.write("```");
					state.closeBlock(node as unknown as { attrs: Record<string, unknown> });
				},
				parse: {
					setup(markdownit: { set: (opts: Record<string, string>) => void }) {
						markdownit.set({ langPrefix: "language-" });
					},
					updateDOM(element: HTMLElement) {
						element.querySelectorAll("code.language-mermaid").forEach((code) => {
							const pre = code.parentElement;
							if (pre?.tagName === "PRE") {
								pre.setAttribute("data-type", "mermaid-block");
							}
						});
					},
				},
			},
		};
	},
});
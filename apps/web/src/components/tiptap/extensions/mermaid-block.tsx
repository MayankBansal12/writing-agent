"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import { MermaidDiagram } from "../../ui/mermaid-diagram";
import { MermaidEditorDialog } from "../../ui/mermaid-editor-dialog";

function MermaidBlockView({ node, updateAttributes }: NodeViewProps) {
	const code = node.attrs.code ?? "";
	const width = node.attrs.width ?? "50%";
	const [dialogOpen, setDialogOpen] = useState(false);

	useEffect(() => {
		if (!code) {
			setDialogOpen(true);
		}
	}, []);

	const handleSave = useCallback(
		(newCode: string, newWidth: string) => {
			updateAttributes({ code: newCode, width: newWidth });
		},
		[updateAttributes],
	);

	return (
		<NodeViewWrapper
			as="div"
			className="mermaid-block-wrapper mermaid-block-viewing"
			style={{ maxWidth: width }}
		>
			<MermaidDiagram code={code} />
			<button
				type="button"
				className="mermaid-edit-overlay-btn"
				onClick={() => setDialogOpen(true)}
			>
				Edit
			</button>
			<span className="mermaid-width-label">{width}</span>
			<MermaidEditorDialog
				open={dialogOpen}
				code={code}
				width={width}
				onSave={handleSave}
				onOpenChange={setDialogOpen}
			/>
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
			width: {
				default: "50%",
				rendered: false,
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

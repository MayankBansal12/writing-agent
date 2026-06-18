import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import {
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from "@tiptap/react";
import katex from "katex";

function renderKatex(latex: string, displayMode: boolean): string {
	try {
		return katex.renderToString(latex, {
			throwOnError: false,
			displayMode,
			output: "html",
		});
	} catch {
		const safe = latex.replace(/[<>&]/g, (c) =>
			c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
		);
		return `<span class="katex-error">[math error: ${safe}]</span>`;
	}
}

function MathInlineView({ node }: NodeViewProps) {
	const latex: string = (node.attrs as { latex?: string }).latex ?? "";
	const html = renderKatex(latex, false);
	return (
		<NodeViewWrapper
			as="span"
			data-type="math-inline"
			data-latex={latex}
			className="math-inline"
			contentEditable={false}
		>
			<span
				className="katex-container katex-inline"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX renders trusted LaTeX
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</NodeViewWrapper>
	);
}

function MathBlockView({ node }: NodeViewProps) {
	const latex: string = (node.attrs as { latex?: string }).latex ?? "";
	const html = renderKatex(latex, true);
	return (
		<NodeViewWrapper
			as="div"
			data-type="math-block"
			data-latex={latex}
			className="math-block"
			contentEditable={false}
		>
			<span
				className="katex-container katex-display"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX renders trusted LaTeX
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</NodeViewWrapper>
	);
}

const INLINE_LATEX = /\$([^$\n]+)\$$/;
const BLOCK_LATEX = /\$\$([^$]+)\$\$$/;

export const MathInline = Node.create({
	name: "mathInline",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			latex: {
				default: "",
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-type="math-inline"]',
				getAttrs: (el) => ({
					latex: (el as HTMLElement).getAttribute("data-latex") ?? "",
				}),
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "math-inline",
				"data-latex": HTMLAttributes.latex,
				class: "math-inline",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(MathInlineView);
	},

	addInputRules() {
		return [
			new InputRule({
				find: INLINE_LATEX,
				handler: ({ state, range, match }) => {
					const latex = (match[1] ?? "").trim();
					if (!latex) return;
					const { tr, schema } = state;
					const nodeType = schema.nodes.mathInline;
					if (!nodeType) return;
					tr.replaceWith(range.from, range.to, nodeType.create({ latex }));
				},
			}),
		];
	},

	addStorage() {
		return {
			markdown: {
				serialize(
					state: {
						write: (s: string) => void;
						ensureNewLine: () => void;
					},
					node: { attrs: { latex?: string } },
				) {
					const latex = (node.attrs.latex ?? "").replace(/\n/g, " ");
					state.write(`$${latex}$`);
				},
				parse: {
					updateDOM(element: HTMLElement) {
						const escapeAttr = (s: string) =>
							s
								.replace(/&/g, "&amp;")
								.replace(/"/g, "&quot;")
								.replace(/</g, "&lt;");

						element
							.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6")
							.forEach((host) => {
								const html = host.innerHTML;
								const replaced = html.replace(
									/\$([^$\n]+?)\$/g,
									(_m, latex: string) => {
										return `<span data-type="math-inline" data-latex="${escapeAttr(latex)}"></span>`;
									},
								);
								if (replaced !== html) host.innerHTML = replaced;
							});

						element.querySelectorAll("p, div").forEach((host) => {
							const text = (host.textContent ?? "").trim();
							const m = /^\$\$([\s\S]+?)\$\$$/.exec(text);
							if (!m) return;
							host.setAttribute("data-type", "math-block");
							host.setAttribute("data-latex", (m[1] ?? "").trim());
							host.textContent = "";
						});
					},
				},
			},
		};
	},
});

export const MathBlock = Node.create({
	name: "mathBlock",
	group: "block",
	atom: true,
	selectable: true,
	draggable: true,

	addAttributes() {
		return {
			latex: {
				default: "",
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="math-block"]',
				getAttrs: (el) => ({
					latex: (el as HTMLElement).getAttribute("data-latex") ?? "",
				}),
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-type": "math-block",
				"data-latex": HTMLAttributes.latex,
				class: "math-block",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(MathBlockView);
	},

	addInputRules() {
		return [
			new InputRule({
				find: BLOCK_LATEX,
				handler: ({ state, range, match }) => {
					const latex = (match[1] ?? "").trim();
					if (!latex) return;
					const { tr, schema } = state;
					const nodeType = schema.nodes.mathBlock;
					if (!nodeType) return;
					tr.replaceWith(range.from, range.to, nodeType.create({ latex }));
				},
			}),
		];
	},

	addStorage() {
		return {
			markdown: {
				serialize(
					state: {
						write: (s: string) => void;
						ensureNewLine: () => void;
						closeBlock: (node: { attrs: Record<string, unknown> }) => void;
					},
					node: { attrs: { latex?: string } },
				) {
					const latex = (node.attrs.latex ?? "").replace(/\n$/, "");
					state.write("$$\n");
					state.write(latex);
					state.ensureNewLine();
					state.write("$$");
					state.closeBlock(
						node as unknown as { attrs: Record<string, unknown> },
					);
				},
			},
		};
	},
});

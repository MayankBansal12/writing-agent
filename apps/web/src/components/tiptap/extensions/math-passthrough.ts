import { Node, mergeAttributes } from "@tiptap/core";

export const MathInline = Node.create({
	name: "mathInline",
	group: "inline",
	inline: true,
	atom: true,

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
			`$${HTMLAttributes.latex}$`,
		];
	},
});

export const MathBlock = Node.create({
	name: "mathBlock",
	group: "block",

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
			`$$\n${HTMLAttributes.latex}\n$$`,
		];
	},
});
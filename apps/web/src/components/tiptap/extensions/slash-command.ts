export type SlashCommandItem = {
	title: string;
	description: string;
	icon: string;
	command: ({ editor, range }: { editor: any; range: { from: number; to: number } }) => void;
};

export const defaultSlashCommands: SlashCommandItem[] = [
	{
		title: "Heading 1",
		description: "Large section heading",
		icon: "H1",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
		},
	},
	{
		title: "Heading 2",
		description: "Medium section heading",
		icon: "H2",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
		},
	},
	{
		title: "Heading 3",
		description: "Small section heading",
		icon: "H3",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
		},
	},
	{
		title: "Bullet List",
		description: "Create a bulleted list",
		icon: "\u2022",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBulletList().run();
		},
	},
	{
		title: "Numbered List",
		description: "Create a numbered list",
		icon: "1.",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleOrderedList().run();
		},
	},
	{
		title: "Code Block",
		description: "Insert a code block",
		icon: "</>",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
		},
	},
	{
		title: "Blockquote",
		description: "Quote a block of text",
		icon: "\u201C",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBlockquote().run();
		},
	},
	{
		title: "Divider",
		description: "Insert a horizontal rule",
		icon: "\u2014",
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHorizontalRule().run();
		},
	},
	{
		title: "Diagram",
		description: "Insert a mermaid diagram",
		icon: "\u2B22",
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent({
					type: "mermaidBlock",
					attrs: { code: "", width: "50%" },
				})
				.run();
		},
	},
];
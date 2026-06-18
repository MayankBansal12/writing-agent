"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { Markdown } from "tiptap-markdown";
import { MathBlock, MathInline } from "./extensions/math-passthrough";
import { MermaidBlock } from "./extensions/mermaid-block";
import { MermaidInputRule } from "./extensions/mermaid-input-rule";
import { patchMarkdownSerializer } from "./extensions/serializer-patch";
import {
	ShikiCodeBlock,
	ShikiCodeBlockThemeBridge,
} from "./extensions/shiki-code-block";
import { SlashCommandMenu } from "./extensions/slash-command-menu";
import "katex/dist/katex.min.css";
import "./styles/editor.css";

interface RichDocumentEditorProps {
	content: string;
	onChange: (markdown: string) => void;
}

export function RichDocumentEditor({
	content,
	onChange,
}: RichDocumentEditorProps) {
	const lastEmitted = useRef<string>(content);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				codeBlock: false,
				heading: { levels: [1, 2, 3] },
			}),
			Table.configure({ resizable: false }),
			TableRow,
			TableHeader,
			TableCell,
			TaskList,
			TaskItem.configure({ nested: true }),
			MermaidInputRule,
			ShikiCodeBlock,
			MermaidBlock,
			Markdown.configure({
				html: true,
				transformPastedText: true,
				transformCopiedText: true,
			}),
			Placeholder.configure({
				placeholder: 'Start writing... or type "/" for commands',
			}),
			Underline,
			Typography,
			MathInline,
			MathBlock,
		],
		content,
		onCreate: ({ editor }) => {
			patchMarkdownSerializer(editor);
		},
		onUpdate: ({ editor }) => {
			const md = (editor.storage as Record<string, any>).markdown.getMarkdown();
			lastEmitted.current = md;
			onChange(md);
		},
		editorProps: {
			attributes: {
				class: "rich-editor-body",
			},
		},
	});

	useEffect(() => {
		if (!editor) return;
		if (content === lastEmitted.current) return;

		editor.commands.setContent(content);
		lastEmitted.current = content;
		const endPos = editor.state.doc.content.size;
		editor.commands.setTextSelection(endPos - 1);
	}, [content, editor]);

	if (!editor) return null;

	return (
		<div className="rich-editor-wrapper">
			<EditorContent
				editor={editor}
				className="rich-editor-content thin-scrollbar"
			/>
			<SlashCommandMenu editor={editor} />
			<ShikiCodeBlockThemeBridge />
		</div>
	);
}

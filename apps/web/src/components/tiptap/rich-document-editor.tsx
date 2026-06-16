"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef } from "react";
import { MathInline, MathBlock } from "./extensions/math-passthrough";
import { MermaidBlock } from "./extensions/mermaid-block";
import { MermaidInputRule } from "./extensions/mermaid-input-rule";
import { SlashCommandMenu } from "./extensions/slash-command-menu";
import "./styles/editor.css";

const lowlight = createLowlight(common);

interface RichDocumentEditorProps {
	content: string;
	onChange: (markdown: string) => void;
}

export function RichDocumentEditor({ content, onChange }: RichDocumentEditorProps) {
	const lastEmitted = useRef<string>(content);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				codeBlock: false,
				heading: { levels: [1, 2, 3] },
			}),
			MermaidInputRule,
			CodeBlockLowlight.configure({ lowlight }),
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
			<EditorContent editor={editor} className="rich-editor-content thin-scrollbar" />
			<SlashCommandMenu editor={editor} />
		</div>
	);
}
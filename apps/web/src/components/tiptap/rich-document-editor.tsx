"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { Markdown } from "tiptap-markdown";
import { MathBlock, MathInline } from "./extensions/math-passthrough";
import { MermaidBlock } from "./extensions/mermaid-block";
import { MermaidInputRule } from "./extensions/mermaid-input-rule";
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

"use client";

import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import rehypeShiki from "@shikijs/rehype";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MermaidDiagram } from "./mermaid-diagram";

export type MarkdownProps = {
	children: string;
	className?: string;
	components?: Partial<Components>;
};

const DEFAULT_COMPONENTS: Partial<Components> = {
	h1: ({ children }) => (
		<h1 className="my-4 font-bold text-3xl first:mt-0">{children}</h1>
	),
	h2: ({ children }) => (
		<h2 className="my-3 font-semibold text-2xl first:mt-0">{children}</h2>
	),
	h3: ({ children }) => (
		<h3 className="my-2 font-semibold text-xl first:mt-0">{children}</h3>
	),
	p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
	ul: ({ children }) => (
		<ul className="mb-4 list-inside list-disc space-y-1">{children}</ul>
	),
	ol: ({ children }) => (
		<ol className="mb-4 list-inside list-decimal space-y-1">{children}</ol>
	),
	li: ({ children }) => <li className="ml-4">{children}</li>,
	code: function CodeComponent({ className, children, ...props }) {
		const isInline =
			!props.node?.position?.start.line ||
			props.node?.position?.start.line === props.node?.position?.end.line;

		if (isInline) {
			return (
				<code
					className={cn(
						"rounded-md bg-accent/50 px-1.5 py-0.5 font-mono text-[0.85em] dark:bg-secondary-foreground",
						className,
					)}
					{...props}
				>
					{children}
				</code>
			);
		}

		const language = className?.match(/language-(\w+)/)?.[1] ?? "";
		const code = Array.isArray(children) ? children.join("") : String(children);

		if (language === "mermaid") {
			return <MermaidDiagram code={code} />;
		}

		return (
			<code className={className} {...props}>
				{children}
			</code>
		);
	},
	pre: ({ children }) => <>{children}</>,
	table: ({ children }) => (
		<div className="mb-4 overflow-x-auto">
			<table className="w-full border-collapse border border-border">
				{children}
			</table>
		</div>
	),
	thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
	tbody: ({ children }) => <tbody>{children}</tbody>,
	tr: ({ children }) => <tr className="border-border border-b">{children}</tr>,
	th: ({ children }) => (
		<th className="border border-border px-3 py-2 text-left font-semibold">
			{children}
		</th>
	),
	td: ({ children }) => (
		<td className="border border-border px-3 py-2">{children}</td>
	),
	blockquote: ({ children }) => (
		<blockquote className="my-4 border-muted-foreground border-l-4 pl-4 italic">
			{children}
		</blockquote>
	),
	a: ({ children, href }) => (
		<a
			href={href}
			className="text-primary underline hover:text-primary/80"
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</a>
	),
};

function MarkdownComponent({
	children,
	className,
	components = DEFAULT_COMPONENTS,
}: MarkdownProps) {
	return (
		<div className={cn("markdown-content", className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
				rehypePlugins={[
					rehypeKatex,
					[
						rehypeShiki,
						{
							themes: {
								light: "min-light",
								dark: "monokai",
							},
						},
					],
				]}
				components={components}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = "Markdown";

export { Markdown };

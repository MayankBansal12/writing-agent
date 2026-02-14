"use client";

import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import { useTheme } from "next-themes";
import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock, CodeBlockCode } from "./code-block";

export type MarkdownProps = {
	children: string;
	className?: string;
	components?: Partial<Components>;
};

function MermaidDiagram({ code }: { code: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		if (!ref.current || !code) return;

		const renderDiagram = async () => {
			const { default: mermaid } = await import("mermaid");

			mermaid.initialize({
				startOnLoad: false,
				theme: resolvedTheme === "light" ? "base" : "dark",
				securityLevel: "strict",
			});

			ref.current!.innerHTML = "";

			try {
				await mermaid.parse(code);

				const id = `mermaid-${crypto.randomUUID()}`;
				const { svg } = await mermaid.render(id, code);

				ref.current!.innerHTML = svg;
				setError(null);
			} catch (err) {
				console.error("Mermaid syntax error:", err);
				setError("Invalid diagram syntax");
				ref.current!.innerHTML = "";
			}
		};

		renderDiagram();
	}, [code, resolvedTheme]);

	return (
		<div
			ref={ref}
			className="mb-4 flex items-center justify-center rounded-xl border border-border bg-card p-4"
		>
			{error && <span className="text-destructive text-sm">{error}</span>}
		</div>
	);
}

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
				<span
					className={cn(
						"rounded-md bg-accent/50 px-2 py-1 font-mono text-sm dark:bg-secondary-foreground",
						className,
					)}
					{...props}
				>
					{children}
				</span>
			);
		}

		const language = className?.match(/language-(\w+)/)?.[1] ?? "";
		const code = Array.isArray(children) ? children.join("") : String(children);

		if (language === "mermaid") {
			return <MermaidDiagram code={code} />;
		}

		return (
			<CodeBlock className={className}>
				<CodeBlockCode code={code} language={language} />
			</CodeBlock>
		);
	},
	pre: function PreComponent({ children, className, ...props }) {
		return (
			<pre
				className={cn(
					"not-prose mb-4 overflow-x-auto rounded-xl border border-border bg-card p-4 text-sm",
					className,
				)}
				{...props}
			>
				{children}
			</pre>
		);
	},
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
				rehypePlugins={[rehypeKatex]}
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

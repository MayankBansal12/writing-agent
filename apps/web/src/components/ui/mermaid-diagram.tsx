"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const DARK_STROKE = "#e5e5e5";

type ExcalidrawElementLike = {
	type?: string;
	strokeColor?: string;
};

function applyStroke<T extends ExcalidrawElementLike>(
	elements: T[],
	strokeColor: string,
): T[] {
	return elements.map((el) => ({ ...el, strokeColor }));
}

async function renderMermaidSvg(
	container: HTMLDivElement,
	code: string,
	theme: string,
): Promise<void> {
	const { default: mermaid } = await import("mermaid");

	mermaid.initialize({
		startOnLoad: false,
		theme: theme === "light" ? "base" : "dark",
		securityLevel: "strict",
	});

	await mermaid.parse(code);
	const id = `mermaid-${crypto.randomUUID()}`;
	const { svg } = await mermaid.render(id, code);
	container.innerHTML = svg;
}

async function renderExcalidrawSvg(
	container: HTMLDivElement,
	code: string,
	isDark: boolean,
): Promise<boolean> {
	const [{ parseMermaidToExcalidraw }, excalidraw] = await Promise.all([
		import("@excalidraw/mermaid-to-excalidraw"),
		import("@excalidraw/excalidraw"),
	]);

	const { elements, files } = await parseMermaidToExcalidraw(code, {
		themeVariables: { fontSize: "20px" },
	});

	if (!elements?.length) {
		return false;
	}

	const converted = excalidraw.convertToExcalidrawElements(elements);
	const strokeColor = isDark ? DARK_STROKE : "#000000";
	const excalidrawElements = applyStroke(
		converted,
		strokeColor,
	) as typeof converted;
	const svg = await excalidraw.exportToSvg({
		elements: excalidrawElements,
		files: files ?? null,
		exportPadding: 8,
		appState: { exportBackground: false },
	});

	svg.removeAttribute("width");
	svg.removeAttribute("height");
	svg.setAttribute("style", "width: 100%; height: auto; display: block;");

	const serialized = new XMLSerializer().serializeToString(svg);
	container.innerHTML = serialized;
	return true;
}

function extractMermaidError(err: unknown): string {
	if (err instanceof Error) {
		const msg = err.message || "";
		const lineMatch = msg.match(/Parse error on line (\d+)/);
		if (lineMatch) {
			const afterLine = msg.slice(msg.indexOf(lineMatch[0]) + lineMatch[0].length).trim();
			const firstSentence = afterLine.split(/\n/)[0]?.replace(/^[:\s]+/, "") || "";
			return firstSentence
				? `Line ${lineMatch[1]}: ${firstSentence}`
				: `Syntax error on line ${lineMatch[1]}`;
		}
		const hashErr = msg.match(/Error:\s*(.+)/);
		if (hashErr?.[1]) return hashErr[1].trim();
		return msg.split("\n")[0]?.slice(0, 120) || "Invalid diagram syntax";
	}
	return "Invalid diagram syntax";
}

interface MermaidDiagramProps {
	code: string;
	onError?: (msg: string | null) => void;
}

export function MermaidDiagram({ code, onError }: MermaidDiagramProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);
	const { resolvedTheme } = useTheme();
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	useEffect(() => {
		if (!ref.current || !code) {
			if (!code) {
				setError(null);
				onErrorRef.current?.(null);
			}
			return;
		}

		const container = ref.current;
		container.innerHTML = "";
		setError(null);
		onErrorRef.current?.(null);

		const isDark = resolvedTheme !== "light";
		const theme = resolvedTheme ?? "light";

		(async () => {
			try {
				const rendered = await renderExcalidrawSvg(container, code, isDark);
				if (rendered) return;
				await renderMermaidSvg(container, code, theme);
			} catch {
				try {
					await renderMermaidSvg(container, code, theme);
				} catch (mermaidErr) {
					const msg = extractMermaidError(mermaidErr);
					console.error("Mermaid syntax error:", mermaidErr);
					setError(msg);
					onErrorRef.current?.(msg);
					container.innerHTML = "";
				}
			}
		})();
	}, [code, resolvedTheme]);

	return (
		<div ref={ref} className="mermaid-diagram-container">
			{error && <span className="text-destructive text-sm">{error}</span>}
		</div>
	);
}

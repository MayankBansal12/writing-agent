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

export function MermaidDiagram({ code }: { code: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		if (!ref.current || !code) return;

		const container = ref.current;
		container.innerHTML = "";
		setError(null);

		const isDark = resolvedTheme !== "light";
		const theme = resolvedTheme ?? "light";

		(async () => {
			try {
				const rendered = await renderExcalidrawSvg(container, code, isDark);
				if (!rendered) {
					await renderMermaidSvg(container, code, theme);
				}
			} catch (excalidrawErr) {
				console.warn(
					"Mermaid-to-excalidraw failed, falling back to mermaid:",
					excalidrawErr,
				);
				try {
					await renderMermaidSvg(container, code, theme);
				} catch (mermaidErr) {
					console.error("Mermaid syntax error:", mermaidErr);
					setError("Invalid diagram syntax");
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

"use client";

import CodeBlock from "@tiptap/extension-code-block";
import { findChildren } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
	bundledLanguages,
	createHighlighter,
	type Highlighter,
	type ThemedToken,
} from "shiki";

const SUPPORTED_LANGS = new Set(Object.keys(bundledLanguages));

let highlighterPromise: Promise<Highlighter> | null = null;
let currentTheme: "min-light" | "monokai" = "min-light";

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ["min-light", "monokai"],
			langs: [
				"ts",
				"tsx",
				"js",
				"jsx",
				"json",
				"html",
				"css",
				"bash",
				"shell",
				"python",
				"go",
				"rust",
				"sql",
				"yaml",
				"md",
				"mdx",
			],
		});
	}
	return highlighterPromise;
}

export function setShikiCodeBlockTheme(theme: "min-light" | "monokai") {
	currentTheme = theme;
}

function buildStyle(token: ThemedToken): string | undefined {
	const parts: string[] = [];
	if (token.color) parts.push(`color:${token.color}`);
	if (token.bgColor) parts.push(`background-color:${token.bgColor}`);
	if (token.fontStyle) {
		const styleProps: string[] = [];
		if ((token.fontStyle as number) & 1) styleProps.push("italic");
		if ((token.fontStyle as number) & 2) styleProps.push("bold");
		if ((token.fontStyle as number) & 4) styleProps.push("underline");
		if (styleProps.length) parts.push(`font-style:${styleProps.join(" ")}`);
	}
	return parts.length ? parts.join(";") : undefined;
}

function buildDecorations({
	doc,
	name,
	highlighter,
	theme,
}: {
	doc: Parameters<typeof findChildren>[0];
	name: string;
	highlighter: Highlighter;
	theme: "min-light" | "monokai";
}): DecorationSet {
	const decorations: Decoration[] = [];
	const blocks = findChildren(doc, (node) => node.type.name === name);
	const loadedLangs = highlighter.getLoadedLanguages() as string[];

	for (const block of blocks) {
		const languageAttr = block.node.attrs.language;
		const code = block.node.textContent;
		const from = block.pos + 1;
		const lang =
			languageAttr && SUPPORTED_LANGS.has(languageAttr) && loadedLangs.includes(languageAttr)
				? languageAttr
				: "txt";
		if (!loadedLangs.includes(lang)) continue;

		const result = highlighter.codeToTokens(code, { lang, theme });
		let offset = 0;
		for (const line of result.tokens) {
			for (const token of line) {
				const length = token.content.length;
				if (length === 0) continue;
				const style = buildStyle(token);
				decorations.push(
					Decoration.inline(from + offset, from + offset + length, {
						nodeName: "span",
						style,
					}),
				);
				offset += length;
			}
			offset += 1;
		}
	}

	return DecorationSet.create(doc, decorations);
}

export const ShikiCodeBlock = CodeBlock.extend({
	name: "codeBlock",
	addProseMirrorPlugins() {
		const pluginKey = new PluginKey("shiki-codeblock");
		return [
			new Plugin({
				key: pluginKey,
				state: {
					init: () => DecorationSet.empty,
					apply(tr, set) {
						const action = tr.getMeta("shikiCodeBlock") as
							| { type: "set"; decorationSet: DecorationSet; theme: "min-light" | "monokai" }
							| undefined;
						if (action?.type === "set") return action.decorationSet;
						return set.map(tr.mapping, tr.doc);
					},
				},
				props: {
					decorations(state) {
						return pluginKey.getState(state);
					},
				},
				view: (view) => {
					let lastTheme = currentTheme;
					let queued = false;
					const runUpdate = async () => {
						if (queued) return;
						queued = true;
						try {
							const highlighter = await getHighlighter();
							const decorationSet = buildDecorations({
								doc: view.state.doc,
								name: "codeBlock",
								highlighter,
								theme: currentTheme,
							});
							const tr = view.state.tr.setMeta("shikiCodeBlock", {
								type: "set",
								decorationSet,
								theme: currentTheme,
							});
							view.dispatch(tr);
							lastTheme = currentTheme;
						} catch (err) {
							console.error("[shiki] code block decoration update failed", err);
						} finally {
							queued = false;
						}
					};
					runUpdate();
					return {
						update(_view, _prevState) {
							if (currentTheme !== lastTheme) {
								runUpdate();
								return;
							}
							if (view.state.doc !== _prevState.doc) {
								runUpdate();
							}
						},
					};
				},
			}),
		];
	},
});

export function ShikiCodeBlockThemeBridge() {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	useEffect(() => {
		if (!mounted) return;
		setShikiCodeBlockTheme(resolvedTheme === "light" ? "min-light" : "monokai");
	}, [resolvedTheme, mounted]);
	return null;
}

"use client";

import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getAppHighlighter(): Promise<HighlighterCore> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighterCore({
			themes: [
				import("@shikijs/themes/min-light"),
				import("@shikijs/themes/monokai"),
			],
			langs: [
				import("@shikijs/langs/javascript"),
				import("@shikijs/langs/typescript"),
				import("@shikijs/langs/tsx"),
				import("@shikijs/langs/jsx"),
				import("@shikijs/langs/python"),
				import("@shikijs/langs/bash"),
				import("@shikijs/langs/json"),
				import("@shikijs/langs/css"),
				import("@shikijs/langs/html"),
				import("@shikijs/langs/markdown"),
				import("@shikijs/langs/yaml"),
				import("@shikijs/langs/go"),
				import("@shikijs/langs/rust"),
				import("@shikijs/langs/java"),
				import("@shikijs/langs/c"),
				import("@shikijs/langs/cpp"),
			],
			engine: createOnigurumaEngine(() => import("shiki/wasm")),
		});
	}
	return highlighterPromise;
}

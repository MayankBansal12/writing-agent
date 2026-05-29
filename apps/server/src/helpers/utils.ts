export function parseJSON<T>(text: string): T | null {
	try {
		const cleaned = text.trim();
		const candidates = [
			cleaned,
			cleaned
				.replace(/^```json\s*/i, "")
				.replace(/^```\s*/i, "")
				.replace(/\s*```$/i, ""),
		];

		for (const candidate of candidates) {
			const jsonMatch = candidate.match(/\{[\s\S]*\}/);
			if (!jsonMatch) continue;

			try {
				return JSON.parse(jsonMatch[0]) as T;
			} catch {
				const repaired = repairJsonLikeText(jsonMatch[0]);
				if (!repaired) continue;
				return JSON.parse(repaired) as T;
			}
		}

		return null;
	} catch {
		return null;
	}
}

function repairJsonLikeText(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;

	let result = "";
	let inString = false;
	let escaped = false;

	for (let index = 0; index < trimmed.length; index += 1) {
		const char = trimmed[index];

		if (inString) {
			if (escaped) {
				result += char;
				escaped = false;
				continue;
			}

			if (char === "\\") {
				result += char;
				escaped = true;
				continue;
			}

			if (char === '"') {
				inString = false;
				result += char;
				continue;
			}

			if (char === "\n") {
				result += "\\n";
				continue;
			}

			if (char === "\r") {
				continue;
			}

			result += char;
			continue;
		}

		if (char === '"') {
			inString = true;
			result += char;
			continue;
		}

		result += char;
	}

	return result;
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

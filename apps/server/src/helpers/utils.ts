export function parseJSON<T>(text: string): T | null {
	try {
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return null;
		return JSON.parse(jsonMatch[0]) as T;
	} catch {
		return null;
	}
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

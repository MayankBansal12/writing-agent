import type { WritingReview } from "../../types";

export function createImprovementPrompt(
	draft: string,
	review: WritingReview,
	currentDocument?: string,
	modelHint?: string,
	difficulty?: string,
): string {
	const reviewSummary = [
		review?.issues.length ? `Issues: ${review?.issues?.join("; ")}` : "",
		review?.missing_elements?.length
			? `Missing: ${review?.missing_elements?.join("; ")}`
			: "",
		review?.tone_mismatches?.length
			? `Tone issues: ${review?.tone_mismatches?.join("; ")}`
			: "",
		review?.structural_problems?.length
			? `Structure: ${review?.structural_problems?.join("; ")}`
			: "",
		review?.suggested_improvements?.length
			? `Improvements: ${review?.suggested_improvements?.join("; ")}`
			: "",
	]
		.filter(Boolean)
		.join("\n");

	const documentContext = currentDocument?.trim()
		? `\n\nCURRENT DOCUMENT (for reference): ${currentDocument}`
		: "";

	return `You are the Improvement Agent. Generate an improved and polished version of the draft using the review notes.
		DRAFT TO IMPROVE: ${draft}${documentContext}
		MODEL ROUTING:
		- Selected model: ${modelHint || "unspecified"}
		- Task difficulty: ${difficulty || "unspecified"}

		REVIEW NOTES: ${reviewSummary}

		INSTRUCTIONS:
		- If the task is light, make targeted improvements with minimal churn
		- If the task is high_end, be more thorough and polish structure and phrasing carefully
		- Fix all issues while preserving the meaning and user intent
		- Maintain the planned tone and structure
		- Expand missing parts only when required
		- Ensure proper MDX formatting with correct heading hierarchy
		- Produce the final polished version
		- Output valid JSON only

		Writing INSTRUCTIONS:
		- Don't use emdashes or emojies
		- No meta commentary or explanations
		- Avoid generic framing
		- No buzzword clustering
		- STRICT LIMIT: Maximum 1000 words

		JSON SCHEMA: {
			"final_document": "string - the complete polished MDX document"
		}
	`;
}

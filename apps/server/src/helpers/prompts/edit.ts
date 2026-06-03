export function createEditPrompt(
	currentDocument: string,
	userPrompt: string,
	researchContext?: string,
	modelHint?: string,
	difficulty?: string,
): string {
	const researchNotes = researchContext?.trim()
		? `\n\nRESEARCH NOTES (use as factual grounding if relevant):\n${researchContext}\n`
		: "";
	return `You are the Editing Agent. Apply the user's requested changes to the current document.

CURRENT DOCUMENT:
${currentDocument}

USER REQUEST:
${userPrompt}
${researchNotes}

INSTRUCTIONS:
- If the task is light, make the smallest safe edit that satisfies the request
- If the task is high_end, preserve nuance and structure carefully while improving quality
- Make only the requested changes
- Preserve existing structure and content unless explicitly asked to change it
- Keep formatting consistent with the current document
- Produce a complete updated document (not a patch)
- Output valid JSON only
- Return exactly one JSON object and nothing else
- Do not wrap the output in markdown fences
- Use JSON string escaping for all newlines, quotes, and backslashes inside the draft
- The draft value must be a single JSON string
- Do not include raw newline characters inside any JSON string

Writing INSTRUCTIONS:
- Selected model: ${modelHint || "unspecified"}
- Task difficulty: ${difficulty || "unspecified"}
- Don't use emdashes or emojies
- No meta commentary or explanations
- Avoid generic framing
- No buzzword clustering
- STRICT LIMIT: Maximum 1000 words

JSON SCHEMA:
{
  "draft": "string - the complete updated MDX-formatted document"
}`;
}

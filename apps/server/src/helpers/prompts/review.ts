import type { WritingPlan } from "../../types";

export function createReviewPrompt(plan: WritingPlan, draft: string): string {
	return `You are the Review Agent. Critically evaluate the draft based on the plan. Your task is to review the provided text and identify issues, especially signs of AI-generated or low-quality writing.
    PLAN CONTEXT:
    - Intent: ${plan?.intent}
    - Requirements: ${plan?.requirements}
    - Outline: ${plan?.outline}
    - Tone: ${plan?.tone}
    - Constraints: ${plan?.constraints}

    DRAFT TO REVIEW:
    ${draft}

    INSTRUCTIONS:
    - Identify issues in clarity, structure, tone, completeness, and factual gaps
    - Check MDX formatting correctness and code, mermaid syntax (if there)
    - Do NOT rewrite the draft
    - Keep feedback concise and actionable
    - Pick out any sign of AI slopness like emdashes, emojies, unnecessary introduction, summary etc.
    - Keep writing engaging in case of story or easy to understand for technical documents
    - Output valid JSON only and use concise points 

    JSON SCHEMA:
    {
      "issues": ["array of general issues found"],
      "missing_elements": ["array of missing content or sections"],
      "tone_mismatches": ["array of tone/style issues"],
      "structural_problems": ["array of structure/formatting issues"],
      "suggested_improvements": ["array of specific actionable improvements"]
    }
  `;
}

export type AgentStep = "write" | "edit" | "review" | "improve";

export interface WritingRoute {
	mode: "write" | "edit" | "review";
	steps: AgentStep[];
	needs_review?: boolean;
	needs_improvement?: boolean;
	edit_scope?: "none" | "small" | "medium" | "large";
}

export interface WritingPlan {
	intent: string;
	requirements: string;
	outline: string;
	tone: string;
	constraints: string;
	optional_search_queries?: string[];
	mode?: WritingRoute["mode"];
	steps?: AgentStep[];
	needs_review?: boolean;
	needs_improvement?: boolean;
	edit_scope?: WritingRoute["edit_scope"];
}

export interface WritingDraft {
	draft: string;
}

export interface WritingReview {
	issues: string[];
	missing_elements: string[];
	tone_mismatches: string[];
	structural_problems: string[];
	suggested_improvements: string[];
}

export interface FinalDocument {
	final_document: string;
}

export interface WritingAgentState {
	userPrompt: string;
	currentDocument?: string;
	plan?: WritingPlan;
	draft?: string;
	review?: WritingReview;
	finalDocument?: string;
	route?: WritingRoute;
	currentStepIndex?: number;
}

export interface AgentTiming {
	name: string;
	duration: number;
}

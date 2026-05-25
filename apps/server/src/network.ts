import { HumanMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createEditPrompt } from "./helpers/prompts/edit";
import { createImprovementPrompt } from "./helpers/prompts/improvement";
import { createPlanningPrompt } from "./helpers/prompts/planning";
import { createReviewPrompt } from "./helpers/prompts/review";
import { createWritingPrompt } from "./helpers/prompts/writing";
import { parseJSON } from "./helpers/utils";
import type {
	AgentStep,
	FinalDocument,
	WritingAgentState,
	WritingDraft,
	WritingPlan,
	WritingReview,
	WritingRoute,
} from "./types";

const openAIClientConfig = {
	apiKey: process.env.GROQ_API_KEY,
	configuration: {
		baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1/",
	},
};

const resolveModel = (fallback: string, envKey: string) =>
	process.env[envKey] || fallback;

const extractTextContent = (content: unknown): string => {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";

	return content
		.map((part) => {
			if (typeof part === "string") return part;
			if (
				typeof part === "object" &&
				part !== null &&
				"type" in part &&
				(part as { type?: string }).type === "text" &&
				"text" in part
			) {
				return String((part as { text: unknown }).text);
			}
			return "";
		})
		.filter(Boolean)
		.join("\n")
		.trim();
};

const invokeAgent = async (model: string, prompt: string): Promise<string> => {
	const llm = new ChatOpenAI({
		model,
		temperature: 0,
		...openAIClientConfig,
	});

	const response = await llm.invoke([new HumanMessage(prompt)]);
	const content = extractTextContent(response.content);

	if (!content) {
		throw new Error(`Model ${model} returned empty content`);
	}

	return content;
};

const fallbackRoute: AgentStep[] = ["write", "review", "improve"];

const getDefaultSteps = (
	plan?: WritingPlan,
	hasCurrentDocument?: boolean,
): AgentStep[] => {
	if (plan?.steps?.length) return plan.steps;
	if (plan?.mode === "review") return ["review"];
	if (plan?.mode === "edit" || hasCurrentDocument) {
		return ["edit", "review", "improve"];
	}
	return fallbackRoute;
};

const WritingFlowState = Annotation.Root({
	userPrompt: Annotation<string>(),
	currentDocument: Annotation<string | undefined>(),
	plan: Annotation<WritingPlan | undefined>(),
	draft: Annotation<string | undefined>(),
	review: Annotation<WritingReview | undefined>(),
	finalDocument: Annotation<string | undefined>(),
	route: Annotation<WritingRoute | undefined>(),
	currentStepIndex: Annotation<number | undefined>(),
});

type WritingFlowStateType = typeof WritingFlowState.State;

const planningNode = async (state: WritingFlowStateType) => {
	const planningPrompt = createPlanningPrompt(
		state.currentDocument,
		state.userPrompt,
	);
	const planningResponse = await invokeAgent(
		resolveModel("openai/gpt-oss-safeguard-20b", "GROQ_MODEL_PLANNING"),
		planningPrompt,
	);
	const plan = parseJSON<WritingPlan>(planningResponse);

	if (!plan) {
		throw new Error("Planning agent did not return a valid JSON plan");
	}

	const defaultSteps = getDefaultSteps(plan, !!state.currentDocument);
	const routeSteps = plan.steps?.length ? plan.steps : defaultSteps;

	return {
		plan,
		route: {
			mode: plan.mode || (state.currentDocument ? "edit" : "write"),
			steps: routeSteps,
			needs_review: plan.needs_review,
			needs_improvement: plan.needs_improvement,
			edit_scope: plan.edit_scope,
		},
		currentStepIndex: 0,
	};
};

const resolveNextStep = (
	state: WritingFlowStateType,
): AgentStep | typeof END => {
	const steps =
		state.route?.steps || getDefaultSteps(state.plan, !!state.currentDocument);
	const stepIndex = state.currentStepIndex ?? 0;
	return steps[stepIndex] || END;
};

const writeNode = async (state: WritingFlowStateType) => {
	if (!state.plan) {
		throw new Error("Writing step requires plan data");
	}

	const writingPrompt = createWritingPrompt(state.plan, state.currentDocument);
	const writingResponse = await invokeAgent(
		resolveModel("groq/compound", "GROQ_MODEL_WRITER"),
		writingPrompt,
	);
	const result = parseJSON<WritingDraft>(writingResponse);

	if (!result?.draft) {
		throw new Error("Writing agent did not return a draft");
	}

	return {
		draft: result.draft,
		currentStepIndex: (state.currentStepIndex ?? 0) + 1,
	};
};

const editNode = async (state: WritingFlowStateType) => {
	const sourceDocument = state.currentDocument || state.draft;
	if (!sourceDocument) {
		throw new Error("Editing step requires a current document");
	}

	const editingPrompt = createEditPrompt(sourceDocument, state.userPrompt);
	const editingResponse = await invokeAgent(
		resolveModel("groq/compound", "GROQ_MODEL_WRITER"),
		editingPrompt,
	);
	const result = parseJSON<WritingDraft>(editingResponse);

	if (!result?.draft) {
		throw new Error("Editing agent did not return an updated draft");
	}

	return {
		draft: result.draft,
		currentStepIndex: (state.currentStepIndex ?? 0) + 1,
	};
};

const reviewNode = async (state: WritingFlowStateType) => {
	if (!state.plan) {
		throw new Error("Review step requires plan data");
	}

	const draftToReview = state.draft || state.currentDocument;
	if (!draftToReview) {
		throw new Error("Review step requires a draft or current document");
	}

	const reviewPrompt = createReviewPrompt(
		state.plan,
		draftToReview,
		state.currentDocument,
	);
	const reviewResponse = await invokeAgent(
		resolveModel("openai/gpt-oss-20b", "GROQ_MODEL_REVIEW"),
		reviewPrompt,
	);
	const review = parseJSON<WritingReview>(reviewResponse);

	if (!review) {
		throw new Error("Review agent did not return valid review feedback");
	}

	return {
		review,
		draft: state.draft || draftToReview,
		currentStepIndex: (state.currentStepIndex ?? 0) + 1,
	};
};

const improveNode = async (state: WritingFlowStateType) => {
	if (!state.draft || !state.review) {
		throw new Error("Improvement step requires both draft and review data");
	}

	const improvementPrompt = createImprovementPrompt(
		state.draft,
		state.review,
		state.currentDocument,
	);
	const improvementResponse = await invokeAgent(
		resolveModel("qwen/qwen3-32b", "GROQ_MODEL_IMPROVEMENT"),
		improvementPrompt,
	);
	const finalResult = parseJSON<FinalDocument>(improvementResponse);

	if (!finalResult?.final_document) {
		throw new Error("Improvement agent did not return the final document");
	}

	return {
		finalDocument: finalResult.final_document,
		currentStepIndex: (state.currentStepIndex ?? 0) + 1,
	};
};

export const writingNetwork = new StateGraph(WritingFlowState)
	.addNode("planning", planningNode)
	.addNode("routeStep", () => ({}))
	.addNode("writeAgent", writeNode)
	.addNode("editAgent", editNode)
	.addNode("reviewAgent", reviewNode)
	.addNode("improveAgent", improveNode)
	.addEdge(START, "planning")
	.addEdge("planning", "routeStep")
	.addConditionalEdges("routeStep", resolveNextStep, {
		write: "writeAgent",
		edit: "editAgent",
		review: "reviewAgent",
		improve: "improveAgent",
		[END]: END,
	})
	.addEdge("writeAgent", "routeStep")
	.addEdge("editAgent", "routeStep")
	.addEdge("reviewAgent", "routeStep")
	.addEdge("improveAgent", "routeStep")
	.compile();

export interface OrchestratorResult {
	success: boolean;
	finalDocument?: string;
	state: WritingAgentState;
}

export async function runWritingWorkflow(
	userPrompt: string,
	currentDocument?: string,
): Promise<OrchestratorResult> {
	const state = await writingNetwork.invoke({
		userPrompt,
		currentDocument,
	});

	const normalizedState: WritingAgentState = {
		userPrompt,
		currentDocument,
		plan: state.plan,
		draft: state.draft,
		review: state.review,
		finalDocument: state.finalDocument,
		route: state.route,
		currentStepIndex: state.currentStepIndex,
	};

	return {
		success: !!(
			normalizedState.finalDocument ||
			normalizedState.draft ||
			normalizedState.review
		),
		finalDocument: normalizedState.finalDocument,
		state: normalizedState,
	};
}

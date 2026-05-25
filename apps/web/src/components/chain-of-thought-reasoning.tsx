import { MessageSquareQuote, Pencil, Search, Target } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
	ChainOfThought,
	ChainOfThoughtContent,
	ChainOfThoughtItem,
	ChainOfThoughtStep,
	ChainOfThoughtTrigger,
} from "./ui/chain-of-thought";
import { TextShimmer } from "./ui/text-shimmer";

interface WritingAgentState {
	userPrompt: string;
	currentDocument?: string;
	plan?: {
		intent: string;
		requirements: string;
		outline: string;
		tone: string;
		constraints: string;
		optional_search_queries?: string[];
		mode?: "write" | "edit" | "review";
		steps?: ("write" | "edit" | "review" | "improve")[];
		needs_review?: boolean;
		needs_improvement?: boolean;
		edit_scope?: "none" | "small" | "medium" | "large";
	};
	draft?: string;
	review?: {
		issues: string[];
		missing_elements: string[];
		tone_mismatches: string[];
		structural_problems: string[];
		suggested_improvements: string[];
	};
	finalDocument?: string;
	route?: {
		mode: "write" | "edit" | "review";
		steps: ("write" | "edit" | "review" | "improve")[];
		needs_review?: boolean;
		needs_improvement?: boolean;
		edit_scope?: "none" | "small" | "medium" | "large";
	};
	currentStepIndex?: number;
}

interface ChainOfThoughtReasoningProps {
	isLoading?: boolean;
	stepItems?: (React.ReactNode | string)[][];
	stateData?: WritingAgentState;
	animated?: boolean;
}

const stepTitles = {
	planning: "Planning next moves: Understanding the requirements",
	write: "Writing a draft: Implementing the plan",
	edit: "Editing the document: Applying requested changes",
	review: "Reviewing the draft: Generating correction pointers",
	improve: "Finalizing the draft: Implementing targeted improvements",
};

const stepIcons = {
	planning: <Search className="size-4" />,
	write: <Pencil className="size-4" />,
	edit: <Pencil className="size-4" />,
	review: <MessageSquareQuote className="size-4" />,
	improve: <Target className="size-4" />,
};

function formatPlan(plan: WritingAgentState["plan"]): React.ReactNode {
	if (!plan) return null;
	return (
		<div className="space-y-2 text-sm">
			<div>
				<strong>Intent:</strong> {plan?.intent}
			</div>
			<div>
				<strong>Requirements:</strong> {plan?.requirements}
			</div>
			<div>
				<strong>Outline:</strong> {plan?.outline}
			</div>
			<div>
				<strong>Tone:</strong> {plan?.tone}
			</div>
			{plan?.constraints && (
				<div>
					<strong>Constraints:</strong> {plan?.constraints}
				</div>
			)}
			{plan?.optional_search_queries &&
				plan?.optional_search_queries?.length > 0 && (
					<div>
						<strong>Search Queries:</strong>{" "}
						{plan?.optional_search_queries?.join(", ")}
					</div>
				)}
		</div>
	);
}

function formatReview(review: WritingAgentState["review"]): React.ReactNode {
	if (!review) return null;
	const buildKeyedItems = (items?: string[]) => {
		const counts = new Map<string, number>();
		return (items || []).map((item) => {
			const count = counts.get(item) ?? 0;
			counts.set(item, count + 1);
			return { key: `${item}-${count}`, value: item };
		});
	};

	return (
		<div className="space-y-2 text-sm">
			{review?.issues?.length > 0 && (
				<div>
					<strong>Issues:</strong>
					<ul className="ml-2 list-inside list-disc">
						{buildKeyedItems(review.issues).map((issue) => (
							<li key={issue.key}>{issue.value}</li>
						))}
					</ul>
				</div>
			)}
			{review?.missing_elements?.length > 0 && (
				<div>
					<strong>Missing Elements:</strong>
					<ul className="ml-2 list-inside list-disc">
						{buildKeyedItems(review.missing_elements).map((elem) => (
							<li key={elem.key}>{elem.value}</li>
						))}
					</ul>
				</div>
			)}
			{review?.tone_mismatches?.length > 0 && (
				<div>
					<strong>Tone Mismatches:</strong>
					<ul className="ml-2 list-inside list-disc">
						{buildKeyedItems(review.tone_mismatches).map((mismatch) => (
							<li key={mismatch.key}>{mismatch.value}</li>
						))}
					</ul>
				</div>
			)}
			{review?.structural_problems?.length > 0 && (
				<div>
					<strong>Structural Problems:</strong>
					<ul className="ml-2 list-inside list-disc">
						{buildKeyedItems(review.structural_problems).map((problem) => (
							<li key={problem.key}>{problem.value}</li>
						))}
					</ul>
				</div>
			)}
			{review?.suggested_improvements?.length > 0 && (
				<div>
					<strong>Suggested Improvements:</strong>
					<ul className="ml-2 list-inside list-disc">
						{buildKeyedItems(review.suggested_improvements).map(
							(improvement) => (
								<li key={improvement.key}>{improvement.value}</li>
							),
						)}
					</ul>
				</div>
			)}
		</div>
	);
}

export function ChainOfThoughtReasoning({
	isLoading = false,
	stepItems = [],
	stateData,
	animated = true,
}: ChainOfThoughtReasoningProps) {
	const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
	const routeSteps = stateData?.route?.steps || [];
	const defaultStepOrder = ["planning", "write", "review", "improve"] as const;
	const stepOrder = routeSteps.length
		? (["planning", ...routeSteps] as const)
		: defaultStepOrder;

	const stateStepItems: (React.ReactNode | string)[][] = stateData
		? stepOrder.map((step) => {
				switch (step) {
					case "planning":
						return stateData.plan ? [formatPlan(stateData.plan)] : [];
					case "write":
					case "edit":
						return stateData.draft ? [stateData.draft] : [];
					case "review":
						return stateData.review ? [formatReview(stateData.review)] : [];
					case "improve":
						return stateData.finalDocument ? [stateData.finalDocument] : [];
					default:
						return [];
				}
			})
		: [];

	const itemsToUse = stateData ? stateStepItems : stepItems;
	const stepCount = Math.max(stepOrder.length, itemsToUse?.length || 0);

	useEffect(() => {
		if (!animated || !isLoading) {
			// If not animated or not loading, show all steps immediately
			setVisibleSteps(Array.from({ length: stepCount }, (_, i) => i));
			return;
		}

		setVisibleSteps([]);

		const timeouts: NodeJS.Timeout[] = [];
		for (let index = 0; index < stepCount; index++) {
			const timeout = setTimeout(() => {
				setVisibleSteps((prev) => [...prev, index]);
			}, index * 5000);
			timeouts.push(timeout);
		}

		return () => {
			timeouts.forEach(clearTimeout);
		};
	}, [isLoading, itemsToUse?.length, animated, stepCount]);

	return (
		<div className="w-full max-w-3xl">
			<ChainOfThought>
				{animated ? (
					<AnimatePresence>
						{stepOrder.map((stepKey, index) => {
							if (!visibleSteps.includes(index)) return null;

							const items = itemsToUse[index] || [];
							const hasItems = items?.length > 0;
							const title =
								stepTitles[stepKey] || "Generating Final Response...";
							const icon = stepIcons[stepKey] || <Target className="size-4" />;
							let itemCounter = 0;

							return (
								<motion.div
									key={stepKey}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.3, ease: "easeInOut" }}
								>
									<ChainOfThoughtStep>
										<ChainOfThoughtTrigger leftIcon={icon}>
											<TextShimmer>{title}</TextShimmer>
										</ChainOfThoughtTrigger>
										{hasItems ? (
											<ChainOfThoughtContent>
												{items?.map((item) => {
													const key =
														typeof item === "string"
															? `${stepKey}-${itemCounter++}-${item.slice(0, 12)}`
															: `${stepKey}-item-${itemCounter++}`;
													return (
														<ChainOfThoughtItem key={key}>
															{item}
														</ChainOfThoughtItem>
													);
												})}
											</ChainOfThoughtContent>
										) : (
											<ChainOfThoughtContent>
												<ChainOfThoughtItem>
													Generating Please hold on...
												</ChainOfThoughtItem>
											</ChainOfThoughtContent>
										)}
									</ChainOfThoughtStep>
								</motion.div>
							);
						})}
					</AnimatePresence>
				) : (
					<>
						{stepOrder.map((stepKey, index) => {
							const items = itemsToUse[index] || [];
							const hasItems = items?.length > 0;
							const title =
								stepTitles[stepKey] || "Generating Final Response...";
							const icon = stepIcons[stepKey] || <Target className="size-4" />;
							let itemCounter = 0;

							// Only show steps that have data
							if (!hasItems) return null;

							return (
								<ChainOfThoughtStep key={stepKey}>
									<ChainOfThoughtTrigger leftIcon={icon}>
										{title}
									</ChainOfThoughtTrigger>
									<ChainOfThoughtContent>
										{items?.map((item) => {
											const key =
												typeof item === "string"
													? `${stepKey}-${itemCounter++}-${item.slice(0, 12)}`
													: `${stepKey}-item-${itemCounter++}`;
											return (
												<ChainOfThoughtItem key={key}>
													{item}
												</ChainOfThoughtItem>
											);
										})}
									</ChainOfThoughtContent>
								</ChainOfThoughtStep>
							);
						})}
					</>
				)}
			</ChainOfThought>
		</div>
	);
}

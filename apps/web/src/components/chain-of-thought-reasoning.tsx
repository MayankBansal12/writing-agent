import {
	FlaskConical,
	MessageSquareQuote,
	Pencil,
	Search,
	Target,
} from "lucide-react";
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
		mode?: "write" | "edit" | "review" | "research";
		tasks?: WritingTask[];
		needs_review?: boolean;
		needs_improvement?: boolean;
		edit_scope?: "none" | "small" | "medium" | "large";
		stop_conditions?: {
			max_calls?: number;
		};
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
}

type TaskStatus = "pending" | "running" | "done" | "failed" | "skipped";
type TaskType = "research" | "write" | "edit" | "review" | "improve";

type WritingTask = {
	id: string;
	type: TaskType;
	title: string;
	description?: string;
	depends_on?: string[];
	status: TaskStatus;
	outputs?: Record<string, unknown>;
};

type TimelineStep =
	| { key: string; type: "planning" }
	| { key: string; type: TaskType; task: WritingTask };

interface ChainOfThoughtReasoningProps {
	isLoading?: boolean;
	stepItems?: (React.ReactNode | string)[][];
	stateData?: WritingAgentState;
	streamTasks?: WritingTask[];
	animated?: boolean;
}

const stepTitles: Record<TaskType | "planning", string> = {
	planning: "Planning next moves: Understanding the requirements",
	research: "Researching: Gathering sources and notes",
	write: "Writing a draft: Implementing the plan",
	edit: "Editing the document: Applying requested changes",
	review: "Reviewing the draft: Generating correction pointers",
	improve: "Finalizing the draft: Implementing targeted improvements",
};

const stepIcons: Record<TaskType | "planning", React.ReactNode> = {
	planning: <Search className="size-4" />,
	research: <FlaskConical className="size-4" />,
	write: <Pencil className="size-4" />,
	edit: <Pencil className="size-4" />,
	review: <MessageSquareQuote className="size-4" />,
	improve: <Target className="size-4" />,
};

const statusStyles: Record<TaskStatus, string> = {
	pending: "text-muted-foreground",
	running: "text-primary",
	done: "text-emerald-500",
	failed: "text-red-500",
	skipped: "text-muted-foreground",
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
	streamTasks = [],
	animated = true,
}: ChainOfThoughtReasoningProps) {
	const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
	const planTasks = streamTasks.length
		? streamTasks
		: stateData?.plan?.tasks || [];
	const steps: TimelineStep[] = [
		{ key: "planning", type: "planning" as const },
		...planTasks.map((task) => ({
			key: task.id,
			type: task.type as TaskType,
			task,
		})),
	];

	const stateStepItems: (React.ReactNode | string)[][] = [
		stateData?.plan ? [formatPlan(stateData.plan)] : [],
		...planTasks.map((task) => {
			switch (task.type) {
				case "write":
				case "edit":
					return stateData?.draft ? [stateData.draft] : [];
				case "review":
					return stateData?.review ? [formatReview(stateData.review)] : [];
				case "improve":
					return stateData?.finalDocument ? [stateData.finalDocument] : [];
				case "research":
					return task.outputs?.researchSummary
						? [String(task.outputs.researchSummary)]
						: [];
				default:
					return [];
			}
		}),
	];

	const itemsToUse = stateData ? stateStepItems : stepItems;
	const stepCount = Math.max(steps.length, itemsToUse?.length || 0);

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
						{steps.map((step, index) => {
							if (!visibleSteps.includes(index)) return null;

							const items = itemsToUse[index] || [];
							const hasItems = items?.length > 0;
							const title =
								"task" in step
									? step.task.title
									: stepTitles[step.type] || "Generating Final Response...";
							const icon = stepIcons[step.type] || (
								<Target className="size-4" />
							);
							let itemCounter = 0;
							const taskMeta = "task" in step ? step.task : undefined;

							return (
								<motion.div
									key={step.key}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.3, ease: "easeInOut" }}
								>
									<ChainOfThoughtStep>
										<ChainOfThoughtTrigger leftIcon={icon}>
											<TextShimmer>{title}</TextShimmer>
											{taskMeta && (
												<span
													className={`ml-2 text-xs ${statusStyles[taskMeta.status]}`}
												>
													{taskMeta.status}
												</span>
											)}
										</ChainOfThoughtTrigger>
										{hasItems ? (
											<ChainOfThoughtContent>
												{items?.map((item) => {
													const key =
														typeof item === "string"
															? `${step.key}-${itemCounter++}-${item.slice(0, 12)}`
															: `${step.key}-item-${itemCounter++}`;
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
													{taskMeta?.status === "running"
														? "Working..."
														: "Queued"}
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
						{steps.map((step, index) => {
							const items = itemsToUse[index] || [];
							const hasItems = items?.length > 0;
							const title =
								"task" in step
									? step.task.title
									: stepTitles[step.type] || "Generating Final Response...";
							const icon = stepIcons[step.type] || (
								<Target className="size-4" />
							);
							let itemCounter = 0;
							const taskMeta = "task" in step ? step.task : undefined;

							// Only show steps that have data
							if (!hasItems) return null;

							return (
								<ChainOfThoughtStep key={step.key}>
									<ChainOfThoughtTrigger leftIcon={icon}>
										{title}
										{taskMeta && (
											<span
												className={`ml-2 text-xs ${statusStyles[taskMeta.status]}`}
											>
												{taskMeta.status}
											</span>
										)}
									</ChainOfThoughtTrigger>
									<ChainOfThoughtContent>
										{items?.map((item) => {
											const key =
												typeof item === "string"
													? `${step.key}-${itemCounter++}-${item.slice(0, 12)}`
													: `${step.key}-item-${itemCounter++}`;
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

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
	plan?: {
		intent: string;
		requirements: string;
		outline: string;
		tone: string;
		constraints: string;
		optional_search_queries?: string[];
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

interface ChainOfThoughtReasoningProps {
	isLoading?: boolean;
	stepItems?: (React.ReactNode | string)[][];
	stateData?: WritingAgentState;
	animated?: boolean;
}

const stepTitles = [
	"Planning next moves: Understanding the requirements and making a plan",
	"Writing a draft: Implementing the plan to write an initial draft",
	"Reviewing the draft: Generating correction pointers",
	"Getting Final Draft Ready: Implementing targeted improvements",
];

const stepIcons = [
	<Search className="size-4" />,
	<Pencil className="size-4" />,
	<MessageSquareQuote className="size-4" />,
	<Target className="size-4" />,
];

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
	return (
		<div className="space-y-2 text-sm">
			{review?.issues?.length > 0 && (
				<div>
					<strong>Issues:</strong>
					<ul className="ml-2 list-inside list-disc">
						{review?.issues?.map((issue, i) => (
							<li key={i}>{issue}</li>
						))}
					</ul>
				</div>
			)}
			{review?.missing_elements?.length > 0 && (
				<div>
					<strong>Missing Elements:</strong>
					<ul className="ml-2 list-inside list-disc">
						{review?.missing_elements?.map((elem, i) => (
							<li key={i}>{elem}</li>
						))}
					</ul>
				</div>
			)}
			{review?.tone_mismatches?.length > 0 && (
				<div>
					<strong>Tone Mismatches:</strong>
					<ul className="ml-2 list-inside list-disc">
						{review?.tone_mismatches?.map((mismatch, i) => (
							<li key={i}>{mismatch}</li>
						))}
					</ul>
				</div>
			)}
			{review?.structural_problems?.length > 0 && (
				<div>
					<strong>Structural Problems:</strong>
					<ul className="ml-2 list-inside list-disc">
						{review?.structural_problems?.map((problem, i) => (
							<li key={i}>{problem}</li>
						))}
					</ul>
				</div>
			)}
			{review?.suggested_improvements?.length > 0 && (
				<div>
					<strong>Suggested Improvements:</strong>
					<ul className="ml-2 list-inside list-disc">
						{review?.suggested_improvements?.map((improvement, i) => (
							<li key={i}>{improvement}</li>
						))}
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

	const stateStepItems: (React.ReactNode | string)[][] = stateData
		? [
				stateData.plan ? [formatPlan(stateData.plan)] : [],
				stateData.draft ? [stateData.draft] : [],
				stateData.review ? [formatReview(stateData.review)] : [],
				stateData.finalDocument ? [stateData.finalDocument] : [],
			]
		: [];

	const itemsToUse = stateData ? stateStepItems : stepItems;

	useEffect(() => {
		if (!animated || !isLoading) {
			// If not animated or not loading, show all steps immediately
			const maxSteps = Math.max(stepTitles?.length, itemsToUse?.length || 0);
			setVisibleSteps(Array.from({ length: maxSteps }, (_, i) => i));
			return;
		}

		setVisibleSteps([]);

		const timeouts: NodeJS.Timeout[] = [];
		const maxSteps = Math.max(stepTitles?.length, itemsToUse?.length || 0);

		for (let index = 0; index < maxSteps; index++) {
			const timeout = setTimeout(() => {
				setVisibleSteps((prev) => [...prev, index]);
			}, index * 5000);
			timeouts.push(timeout);
		}

		return () => {
			timeouts.forEach(clearTimeout);
		};
	}, [isLoading, itemsToUse?.length, animated]);

	const maxSteps = Math.max(stepTitles?.length, itemsToUse?.length || 0);

	return (
		<div className="w-full max-w-3xl">
			<ChainOfThought>
				{animated ? (
					<AnimatePresence>
						{Array.from({ length: maxSteps })?.map((_, index) => {
							if (!visibleSteps.includes(index)) return null;

							const items = itemsToUse[index] || [];
							const hasItems = items?.length > 0;
							const title = stepTitles[index] || "Generating Final Response...";
							const icon = stepIcons[index] || <Target className="size-4" />;

							return (
								<motion.div
									key={index}
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
												{items?.map((item, itemIndex) => (
													<ChainOfThoughtItem key={itemIndex}>
														{item}
													</ChainOfThoughtItem>
												))}
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
						{Array.from({ length: maxSteps })?.map((_, index) => {
							const items = itemsToUse[index] || [];
							const hasItems = items?.length > 0;
							const title = stepTitles[index] || "Generating Final Response...";
							const icon = stepIcons[index] || <Target className="size-4" />;

							// Only show steps that have data
							if (!hasItems) return null;

							return (
								<ChainOfThoughtStep key={index}>
									<ChainOfThoughtTrigger leftIcon={icon}>
										{title}
									</ChainOfThoughtTrigger>
									<ChainOfThoughtContent>
										{items?.map((item, itemIndex) => (
											<ChainOfThoughtItem key={itemIndex}>
												{item}
											</ChainOfThoughtItem>
										))}
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

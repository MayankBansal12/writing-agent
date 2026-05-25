"use client";

import { ArrowUp, CheckLine, Copy, Square, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { promptSuggestions } from "@/lib/constants/suggestions";
import { cn } from "@/lib/utils";
import { ChainOfThoughtReasoning } from "./chain-of-thought-reasoning";
import {
	Message,
	MessageAction,
	MessageActions,
	MessageContent,
} from "./ui/message";
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	type PromptInputRef,
	PromptInputTextarea,
} from "./ui/prompt-input";
import { PromptSuggestion } from "./ui/prompt-suggestion";
import { SystemMessage } from "./ui/system-message";

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

interface ChatMessage {
	id: string;
	content: string;
	role: "user" | "assistant";
	format?: "mdx" | "plain";
	stateData?: WritingAgentState;
	canReviewDiff?: boolean;
}

type DiffLine = {
	type: "equal" | "add" | "remove";
	text: string;
	originalIndex?: number;
	suggestedIndex?: number;
};

type DiffReview = {
	original: string;
	suggested: string;
	diff: DiffLine[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function ChatPanel({
	changeDocument,
	currentDocument,
}: {
	changeDocument: (content: string) => void;
	currentDocument: string;
}) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState<string | null>(null);
	const [diffReview, setDiffReview] = useState<DiffReview | null>(null);
	const promptInputRef = useRef<PromptInputRef>(null);

	const buildDiff = (original: string, suggested: string): DiffLine[] => {
		const originalLines = original.split("\n");
		const suggestedLines = suggested.split("\n");
		const rows = originalLines.length;
		const cols = suggestedLines.length;
		const dp = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

		for (let i = rows - 1; i >= 0; i -= 1) {
			for (let j = cols - 1; j >= 0; j -= 1) {
				dp[i][j] =
					originalLines[i] === suggestedLines[j]
						? dp[i + 1][j + 1] + 1
						: Math.max(dp[i + 1][j], dp[i][j + 1]);
			}
		}

		const diff: DiffLine[] = [];
		let i = 0;
		let j = 0;

		while (i < rows && j < cols) {
			if (originalLines[i] === suggestedLines[j]) {
				diff.push({
					type: "equal",
					text: originalLines[i],
					originalIndex: i,
					suggestedIndex: j,
				});
				i += 1;
				j += 1;
				continue;
			}

			if (dp[i + 1][j] >= dp[i][j + 1]) {
				diff.push({ type: "remove", text: originalLines[i], originalIndex: i });
				i += 1;
			} else {
				diff.push({ type: "add", text: suggestedLines[j], suggestedIndex: j });
				j += 1;
			}
		}

		while (i < rows) {
			diff.push({ type: "remove", text: originalLines[i], originalIndex: i });
			i += 1;
		}

		while (j < cols) {
			diff.push({ type: "add", text: suggestedLines[j], suggestedIndex: j });
			j += 1;
		}

		return diff;
	};

	const handleCopy = (content: string, messageId: string) => {
		navigator.clipboard.writeText(content);
		setCopied(messageId);
		setTimeout(() => setCopied(null), 2000);
	};

	const formatReviewAsMarkdown = (
		review: WritingAgentState["review"],
	): string => {
		if (!review) return "No review feedback returned.";

		const sections: { title: string; items?: string[] }[] = [
			{ title: "Issues", items: review.issues },
			{ title: "Missing Elements", items: review.missing_elements },
			{ title: "Tone Mismatches", items: review.tone_mismatches },
			{ title: "Structural Problems", items: review.structural_problems },
			{ title: "Suggested Improvements", items: review.suggested_improvements },
		];

		const body = sections
			.filter((section) => section.items && section.items.length > 0)
			.map(
				(section) =>
					`### ${section.title}\n${section.items
						?.map((item) => `- ${item}`)
						.join("\n")}`,
			)
			.join("\n\n");

		return `## Review Feedback\n\n${body || "No actionable issues found."}`;
	};

	const openDiffReview = (content: string) => {
		setDiffReview({
			original: currentDocument,
			suggested: content,
			diff: buildDiff(currentDocument, content),
		});
	};

	const handleApplyDiff = () => {
		if (!diffReview) return;
		changeDocument(diffReview.suggested);
		setDiffReview(null);
	};

	const handleSend = async () => {
		if (!inputValue.trim()) return;
		setIsLoading(true);
		setError(null);

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			content: inputValue,
			role: "user",
		};

		setMessages((prev) => [...prev, userMessage]);
		const promptValue = inputValue;
		setInputValue("");

		try {
			const response = await fetch(`${API_BASE_URL}/api/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userPrompt: promptValue,
					currentDocument,
				}),
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ error: "Failed to send message" }));
				throw new Error(
					errorData.error || errorData.message || "Failed to send message",
				);
			}

			const data = await response.json();
			console.log("agent data: ", data);

			if (!data) throw Error("No data received");

			const routeSteps = data.state?.route?.steps || [];
			const isReviewOnly =
				data.state?.route?.mode === "review" ||
				(routeSteps.length === 1 && routeSteps[0] === "review");
			const contentToUse =
				data.finalDocument || data.state?.finalDocument || data.state?.draft;

			const messageContent = isReviewOnly
				? formatReviewAsMarkdown(data.state?.review)
				: contentToUse;

			if (!messageContent) throw Error("No content generated");

			const canReviewDiff = !isReviewOnly;

			const assistantMessage: ChatMessage = {
				id: (Date.now() + 1).toString(),
				content: messageContent,
				role: "assistant",
				format: "plain",
				stateData: data.state,
				canReviewDiff,
			};
			setMessages((prev) => [...prev, assistantMessage]);
		} catch (err) {
			const errorMessage = err instanceof Error ? err?.message : "Error!";
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="flex h-full flex-col">
			<CardHeader>
				<h2 className="font-semibold text-lg">Agent Chat</h2>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col justify-between gap-4 overflow-hidden p-0">
				<div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4">
					{messages.length > 0 ? (
						<AnimatePresence mode="popLayout">
							{messages?.map((message) => (
								<div
									key={message.id}
									className={cn(
										"flex w-full flex-col gap-2",
										message.role === "assistant" ? "items-start" : "items-end",
									)}
								>
									{message.role === "assistant" && message.stateData && (
										<ChainOfThoughtReasoning
											key={message.id}
											isLoading={false}
											stateData={message.stateData}
											animated={false}
										/>
									)}
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -10 }}
										transition={{ duration: 0.3, ease: "easeOut" }}
										className={cn(
											"group flex w-full flex-col gap-2",
											message.role === "user" ? "items-end" : "items-start",
										)}
									>
										<Message
											className={message.role === "assistant" ? "w-full" : ""}
										>
											<MessageContent
												markdown
												className={cn(
													message.role === "user"
														? "bg-primary text-primary-foreground"
														: "bg-primary-foreground dark:bg-secondary-foreground",
												)}
											>
												{message.content}
											</MessageContent>
										</Message>
										<MessageActions>
											<MessageAction tooltip="Copy to clipboard">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100"
													onClick={() =>
														handleCopy(message.content, message.id)
													}
												>
													<Copy
														className={`size-4 ${copied === message.id ? "text-green-500" : ""}`}
													/>
												</Button>
											</MessageAction>
											{message.role === "assistant" &&
												message.canReviewDiff && (
													<MessageAction tooltip="Compare changes with the document">
														<Button
															variant="ghost"
															size="icon"
															className="w-fit px-2 opacity-0 group-hover:opacity-100"
															onClick={() => openDiffReview(message.content)}
														>
															<CheckLine className="size-4" /> Review Changes
														</Button>
													</MessageAction>
												)}
										</MessageActions>
									</motion.div>
								</div>
							))}
						</AnimatePresence>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-8 text-center">
							<div className="flex flex-col gap-1">
								<h2 className="font-medium text-xl">
									Experiment your writings with
									<span className="font-semibold"> Wavmo </span>
								</h2>
								<p className="text-accent-foreground/60 text-sm">
									Use suggestions to get started or input your prompt below.{" "}
									<br /> Rate limits may be applied and it will def make
									mistakes.
								</p>
							</div>
							<div className="flex w-[90%] min-w-sm flex-wrap items-center gap-2">
								{promptSuggestions?.map((suggestion) => (
									<PromptSuggestion
										key={suggestion.slice(0, 10)}
										size="lg"
										highlight="true"
										onClick={() => {
											setInputValue(suggestion);
											setTimeout(() => promptInputRef.current?.focus(), 0);
										}}
									>
										{suggestion}
									</PromptSuggestion>
								))}
							</div>
						</div>
					)}

					{isLoading && <ChainOfThoughtReasoning isLoading={isLoading} />}
					{error && (
						<SystemMessage variant="error" fill>
							Unable to generate response, seems like a error from our side,
							please try again.
						</SystemMessage>
					)}
				</div>

				<PromptInput
					ref={promptInputRef}
					value={inputValue}
					onValueChange={(value) => setInputValue(value)}
					isLoading={isLoading}
					onSubmit={handleSend}
					className="m-4 mx-auto w-[85%] min-w-sm"
				>
					<PromptInputTextarea placeholder="Explain, Generate, review your documents..." />
					<PromptInputActions className="justify-end pt-2">
						<PromptInputAction
							tooltip={isLoading ? "Stop generation" : "Send message"}
						>
							<Button
								variant="default"
								size="icon"
								className="h-8 w-8 rounded-full"
								onClick={handleSend}
							>
								{isLoading ? (
									<Square className="size-5 fill-current" />
								) : (
									<ArrowUp className="size-5" />
								)}
							</Button>
						</PromptInputAction>
					</PromptInputActions>
				</PromptInput>

				{diffReview && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
						<div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
							<div className="flex items-start justify-between border-b border-border px-6 py-5">
								<div>
									<h3 className="font-semibold text-xl">Review AI Changes</h3>
									<p className="mt-1 text-muted-foreground text-sm">
										Nothing changes until you approve the suggestion.
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setDiffReview(null)}
								>
									<X className="size-4" />
								</Button>
							</div>

							<div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
								<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-muted/30">
									<div className="sticky top-0 grid border-b border-border bg-card px-4 py-3 text-sm font-medium md:grid-cols-2">
										<div>Original</div>
										<div>Suggested Fix</div>
									</div>
									<div className="divide-y divide-border font-mono text-sm leading-6">
										{diffReview.diff.map((line, index) => (
											<div
												key={`${line.originalIndex ?? "o"}-${line.suggestedIndex ?? "s"}-${index}`}
												className="grid md:grid-cols-2"
											>
												<div
													className={cn(
														"min-h-8 border-border px-4 py-2 whitespace-pre-wrap",
														line.type === "remove"
															? "bg-red-500/15 text-red-200 line-through"
															: line.type === "equal"
																? "text-foreground"
																: "text-muted-foreground",
													)}
												>
													{line.type === "add" ? "" : line.text || " "}
												</div>
												<div
													className={cn(
														"min-h-8 border-border px-4 py-2 whitespace-pre-wrap",
														line.type === "add"
															? "bg-emerald-500/15 text-emerald-200"
															: line.type === "equal"
																? "text-foreground"
																: "text-muted-foreground",
													)}
												>
													{line.type === "remove" ? "" : line.text || " "}
												</div>
											</div>
										))}
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
								<p className="text-muted-foreground text-sm">
									Apply will replace the current document with the suggested
									version.
								</p>
								<div className="flex items-center gap-2">
									<Button variant="outline" onClick={() => setDiffReview(null)}>
										Cancel
									</Button>
									<Button onClick={handleApplyDiff}>Accept Changes</Button>
								</div>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

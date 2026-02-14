"use client";

import { ArrowUp, CheckLine, Copy, Square } from "lucide-react";
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

interface Message {
	id: string;
	content: string;
	role: "user" | "assistant";
	format?: "mdx" | "plain";
	stateData?: WritingAgentState;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function ChatPanel({
	changeDocument,
}: {
	changeDocument: (content: string) => void;
}) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState<string | null>(null);
	const promptInputRef = useRef<PromptInputRef>(null);

	const handleCopy = (content: string, messageId: string) => {
		navigator.clipboard.writeText(content);
		setCopied(messageId);
		setTimeout(() => setCopied(null), 2000);
	};

	const handleSend = async () => {
		if (!inputValue.trim()) return;
		setIsLoading(true);
		setError(null);

		const userMessage: Message = {
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
				body: JSON.stringify({ userPrompt: promptValue }),
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

			if (!data || !data.success || !data.finalDocument) throw Error("");

			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				content: `${data.finalDocument}`,
				role: "assistant",
				format: "mdx",
				stateData: data.state,
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
											{message.role === "assistant" && (
												<MessageAction tooltip="Apply changes to document">
													<Button
														variant="ghost"
														size="icon"
														className="w-fit px-2 opacity-0 group-hover:opacity-100"
														onClick={() => changeDocument(message.content)}
													>
														<CheckLine className="size-4" /> Apply Changes
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
			</CardContent>
		</Card>
	);
}

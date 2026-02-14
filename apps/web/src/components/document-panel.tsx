"use client";

import { PanelLeft, PanelLeftOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FormatToggle, type FormatType } from "@/components/format-toggle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

interface DocumentPanelProps {
	isChatOpen: boolean;
	content: string;
	changeDocument: (content: string) => void;
	onToggleChat: () => void;
}

export function DocumentPanel({
	content,
	changeDocument,
	isChatOpen,
	onToggleChat,
}: DocumentPanelProps) {
	const [format, setFormat] = useState<FormatType>("mdx");
	const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);

	return (
		<Card className="flex h-full w-full flex-col">
			<CardHeader className="flex flex-row items-center justify-between p-2">
				<h2 className="px-2 font-semibold text-lg">Wavmo</h2>
				<div className="flex items-center gap-2">
					<FormatToggle
						format={isEditingMarkdown ? "mdx" : format}
						onFormatChange={setFormat}
					/>
					<ModeToggle />
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={onToggleChat}
								className={isChatOpen ? "" : "text-muted-foreground"}
							>
								<AnimatePresence mode="wait" initial={false}>
									<motion.span
										key={isChatOpen ? "sidebar-open" : "sidebar-closed"}
										initial={{ rotateY: 90, opacity: 0 }}
										animate={{ rotateY: 0, opacity: 1 }}
										exit={{ rotateY: -90, opacity: 0 }}
										transition={{ duration: 0.3 }}
										className="flex items-center justify-center"
									>
										{!isChatOpen ? (
											<PanelLeft className="h-5 w-5" />
										) : (
											<PanelLeftOpen className="h-5 w-5" />
										)}
									</motion.span>
								</AnimatePresence>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{isChatOpen ? "Hide Chat" : "Open Agent Chat"}</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden p-4">
				{format === "mdx" ? (
					<textarea
						value={content}
						onChange={(e) => changeDocument(e.target.value)}
						className="h-full w-full resize-none whitespace-pre-wrap rounded-sm border-none bg-transparent p-0 font-mono text-sm outline-none"
						placeholder="Start editing your document..."
					/>
				) : (
					<div className="relative h-full w-full overflow-y-auto">
						{isEditingMarkdown ? (
							<textarea
								value={content}
								onChange={(e) => changeDocument(e.target.value)}
								onBlur={() => setIsEditingMarkdown(false)}
								autoFocus
								className="h-full w-full resize-none overflow-hidden whitespace-pre-wrap rounded-sm border-none bg-transparent p-0 font-mono text-sm outline-none"
								placeholder="Start editing your document..."
							/>
						) : (
							<div
								onDoubleClick={() => setIsEditingMarkdown(true)}
								className="prose prose-sm dark:prose-invert -m-2 min-h-full w-full max-w-none cursor-text rounded-sm p-2 transition-all"
							>
								<Markdown>{content}</Markdown>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

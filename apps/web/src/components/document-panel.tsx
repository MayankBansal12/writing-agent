"use client";

import { PanelLeft, PanelLeftOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { RichDocumentEditor } from "@/components/tiptap/rich-document-editor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
	return (
		<Card className="flex h-full w-full flex-col">
			<CardHeader className="flex flex-row items-center justify-between p-2">
				<h2 className="px-2 font-semibold text-lg">Wavmo</h2>
				<div className="flex items-center gap-2">
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
				<RichDocumentEditor content={content} onChange={changeDocument} />
			</CardContent>
		</Card>
	);
}
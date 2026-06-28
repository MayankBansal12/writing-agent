"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import {
	type ImperativePanelHandle,
	Panel,
	PanelGroup,
	PanelResizeHandle,
} from "react-resizable-panels";
import { ChatPanel } from "@/components/chat-panel";
import { DocumentPanel } from "@/components/document-panel";
import { welcomeText } from "@/lib/constants/welcome-text";
import { ensureSeeded, loadDocument, saveDocument } from "@/lib/db";

const SAVE_DEBOUNCE_MS = 400;

export default function Home() {
	const [isChatOpen, setIsChatOpen] = useState(true);
	const documentPanelRef = useRef<ImperativePanelHandle>(null);
	const chatPanelRef = useRef<ImperativePanelHandle>(null);

	const persistedContent = useLiveQuery(() => loadDocument(), []);
	const [content, setContent] = useState(welcomeText);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedRef = useRef<string | null>(null);
	const hydratedRef = useRef(false);

	useEffect(() => {
		ensureSeeded().catch(() => {});
	}, []);

	useEffect(() => {
		if (hydratedRef.current) return;
		if (persistedContent === undefined) return;
		hydratedRef.current = true;
		const next = persistedContent ?? welcomeText;
		setContent(next);
		lastSavedRef.current = next;
	}, [persistedContent]);

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		};
	}, []);

	const handleDocumentChange = (next: string) => {
		setContent(next);
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			if (next !== lastSavedRef.current) {
				lastSavedRef.current = next;
				saveDocument(next).catch(() => {
					lastSavedRef.current = null;
				});
			}
		}, SAVE_DEBOUNCE_MS);
	};

	const handleToggleChat = () => {
		setIsChatOpen((isChatOpen) => !isChatOpen);
	};

	useEffect(() => {
		if (isChatOpen) {
			documentPanelRef.current?.resize(60);
			chatPanelRef.current?.resize(40);
		} else {
			documentPanelRef.current?.resize(100);
			chatPanelRef.current?.resize(0);
		}
	}, [isChatOpen]);

	return (
		<div className="flex h-svh flex-1 flex-col overflow-hidden bg-primary-foreground p-2 dark:bg-secondary-foreground">
			<PanelGroup direction="horizontal" className="h-full w-full">
				<Panel
					ref={documentPanelRef}
					defaultSize={60}
					minSize={50}
					maxSize={isChatOpen ? 70 : 100}
				>
					<div className="h-full w-full overflow-hidden pr-1">
						<DocumentPanel
							isChatOpen={isChatOpen}
							content={content}
							changeDocument={handleDocumentChange}
							onToggleChat={handleToggleChat}
						/>
					</div>
				</Panel>

				{isChatOpen && (
					<PanelResizeHandle className="bg-border transition-colors hover:bg-primary/20" />
				)}

				<Panel
					ref={chatPanelRef}
					defaultSize={40}
					minSize={30}
					maxSize={50}
					collapsible
				>
					{isChatOpen && (
						<div className="h-full w-full overflow-hidden pl-1">
							<ChatPanel
								changeDocument={handleDocumentChange}
								currentDocument={content}
							/>
						</div>
					)}
				</Panel>
			</PanelGroup>
		</div>
	);
}

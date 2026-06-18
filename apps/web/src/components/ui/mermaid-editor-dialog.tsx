"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
} from "./dialog";
import { Check } from "lucide-react";
import { MermaidDiagram } from "./mermaid-diagram";

const WIDTH_OPTIONS = ["25%", "50%", "75%", "100%"] as const;
const DEFAULT_CODE = "flowchart LR\n  A --> B";

interface MermaidEditorDialogProps {
	open: boolean;
	code: string;
	width: string;
	onSave: (code: string, width: string) => void;
	onOpenChange: (open: boolean) => void;
}

export function MermaidEditorDialog({
	open,
	code,
	width,
	onSave,
	onOpenChange,
}: MermaidEditorDialogProps) {
	const [editCode, setEditCode] = useState(code);
	const [editWidth, setEditWidth] = useState(width);
	const [debouncedCode, setDebouncedCode] = useState(
		code || DEFAULT_CODE,
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

	useEffect(() => {
		if (open) {
			setEditCode(code || DEFAULT_CODE);
			setEditWidth(width);
			setDebouncedCode(code || DEFAULT_CODE);
			setErrorMsg(null);
		}
	}, [open, code, width]);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setDebouncedCode(editCode);
		}, 300);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [editCode]);

	const handleSave = useCallback(() => {
		onSave(editCode, editWidth);
		onOpenChange(false);
	}, [editCode, editWidth, onSave, onOpenChange]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onOpenChange(false);
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
				e.preventDefault();
				handleSave();
			}
		},
		[onOpenChange, handleSave],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="mermaid-dialog-content"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onKeyDown={handleKeyDown}
			>
				<div className="mermaid-dialog-body">
					<div className="mermaid-dialog-preview">
						<MermaidDiagram
							code={debouncedCode}
							onError={(msg) => setErrorMsg(msg)}
						/>
						{errorMsg && (
							<div className="mermaid-dialog-error">
								<span className="text-destructive text-sm font-medium">
									Syntax Error
								</span>
								<span className="text-destructive/80 text-xs">{errorMsg}</span>
							</div>
						)}
					</div>
					<div className="mermaid-dialog-editor">
						<textarea
							className="mermaid-dialog-textarea"
							value={editCode}
							onChange={(e) => {
								setEditCode(e.target.value);
								setErrorMsg(null);
							}}
							placeholder={DEFAULT_CODE}
							spellCheck={false}
							autoFocus
						/>
						<div className="mermaid-dialog-controls">
							<label className="mermaid-dialog-width-label">
								Width
								<select
									className="mermaid-dialog-width-select"
									value={editWidth}
									onChange={(e) => setEditWidth(e.target.value)}
								>
									{WIDTH_OPTIONS.map((w) => (
										<option key={w} value={w}>
											{w}
										</option>
									))}
								</select>
							</label>
							<button
								type="button"
								className="mermaid-dialog-btn mermaid-dialog-btn-save"
								onClick={handleSave}
							>
								<Check className="h-3.5 w-3.5" />
								Save
							</button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
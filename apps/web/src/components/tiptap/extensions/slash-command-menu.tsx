"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { defaultSlashCommands, type SlashCommandItem } from "./slash-command";

type SlashCommandMenuProps = {
	editor: Editor;
};

function getSlashRange(editor: Editor) {
	const { $head } = editor.state.selection;
	const textBefore = $head.parent.textContent.slice(0, $head.parentOffset);
	const match = textBefore.match(/\/([^/\s]*)$/);
	if (!match) return null;
	const query = match[1];
	const from = $head.pos - query.length - 1;
	const to = $head.pos;
	return { query, from, to };
}

export function SlashCommandMenu({ editor }: SlashCommandMenuProps) {
	const [active, setActive] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [items, setItems] = useState<SlashCommandItem[]>(defaultSlashCommands);
	const [coords, setCoords] = useState({ top: 0, left: 0 });
	const menuRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const activeRef = useRef(false);
	const selectedIndexRef = useRef(0);
	const itemsRef = useRef<SlashCommandItem[]>(defaultSlashCommands);

	activeRef.current = active;
	selectedIndexRef.current = selectedIndex;
	itemsRef.current = items;

	const close = useCallback(() => {
		setActive(false);
		setSelectedIndex(0);
	}, []);

	const selectItem = useCallback(
		(index: number) => {
			const slash = getSlashRange(editor);
			if (!slash) return;
			const item = itemsRef.current[index];
			if (!item) return;
			editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }).run();
			item.command({ editor, range: { from: slash.from, to: slash.from } });
			close();
		},
		[editor, close],
	);

	const refresh = useCallback(() => {
		const slash = getSlashRange(editor);
		if (!slash) {
			setActive(false);
			return;
		}

		const q = slash.query.toLowerCase();
		const filtered = defaultSlashCommands.filter(
			(item) =>
				item.title.toLowerCase().includes(q) ||
				item.description.toLowerCase().includes(q),
		);

		if (filtered.length === 0) {
			setActive(false);
			return;
		}

		setItems(filtered);
		setSelectedIndex(0);

		const cursorCoords = editor.view.coordsAtPos(editor.state.selection.from);

		const estimatedHeight = Math.min(filtered.length * 44, 280) + 16;
		const spaceBelow = window.innerHeight - cursorCoords.bottom;
		const showAbove = spaceBelow < estimatedHeight + 60;

		setCoords({
			top: showAbove
				? Math.max(8, cursorCoords.top - estimatedHeight - 16)
				: cursorCoords.bottom + 4,
			left: Math.min(Math.max(4, cursorCoords.left), window.innerWidth - 270),
		});
		setActive(true);
	}, [editor]);

	useEffect(() => {
		editor.on("update", refresh);
		editor.on("selectionUpdate", refresh);
		return () => {
			editor.off("update", refresh);
			editor.off("selectionUpdate", refresh);
		};
	}, [editor, refresh]);

	useEffect(() => {
		if (!active || items.length === 0) return;
		const el = itemRefs.current[selectedIndex];
		if (el) el.scrollIntoView({ block: "nearest" });
	}, [selectedIndex, active, items.length]);

	useEffect(() => {
		const editorEl = editor.view.dom as HTMLElement;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (!activeRef.current) return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				e.stopPropagation();
				setSelectedIndex((i) => (i + 1) % itemsRef.current.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				e.stopPropagation();
				setSelectedIndex(
					(i) => (i - 1 + itemsRef.current.length) % itemsRef.current.length,
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				e.stopPropagation();
				selectItem(selectedIndexRef.current);
			} else if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				close();
			}
		};

		editorEl.addEventListener("keydown", handleKeyDown, true);
		return () => editorEl.removeEventListener("keydown", handleKeyDown, true);
	}, [editor, selectItem, close]);

	useEffect(() => {
		if (!active) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				close();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [active, close]);

	if (!active || items.length === 0) return null;

	return createPortal(
		<div ref={menuRef} className="slash-command-menu" style={{ top: coords.top, left: coords.left }}>
			{items.map((item, index) => (
				<button
					type="button"
					key={item.title}
					ref={(el) => {
						itemRefs.current[index] = el;
					}}
					className={cn(
						"slash-command-item",
						index === selectedIndex && "slash-command-item-active",
					)}
					onClick={() => selectItem(index)}
					onMouseEnter={() => setSelectedIndex(index)}
				>
					<span className="slash-command-icon">{item.icon}</span>
					<span className="slash-command-text">
						<span className="slash-command-title">{item.title}</span>
						<span className="slash-command-desc">{item.description}</span>
					</span>
				</button>
			))}
		</div>,
		document.body,
	);
}
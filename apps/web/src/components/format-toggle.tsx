"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FormatType = "mdx" | "plain";

interface FormatToggleProps {
	format: FormatType;
	onFormatChange: (format: FormatType) => void;
	className?: string;
}

export function FormatToggle({
	format,
	onFormatChange,
	className,
}: FormatToggleProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className={cn("flex gap-1 rounded-md border p-1", className)}>
					<Button
						variant={format === "plain" ? "default" : "ghost"}
						size="sm"
						onClick={() => onFormatChange("plain")}
						className={cn(
							"h-7 px-3 text-xs",
							format === "plain" && "bg-primary text-primary-foreground",
						)}
					>
						Plain
					</Button>
					<Button
						variant={format === "mdx" ? "default" : "ghost"}
						size="sm"
						onClick={() => onFormatChange("mdx")}
						className={cn(
							"h-7 px-3 text-xs",
							format === "mdx" && "bg-primary text-primary-foreground",
						)}
					>
						MDX
					</Button>
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<p>
					{format === "mdx"
						? "Switch to plain for reading"
						: "Switch to mdx for editing"}
				</p>
			</TooltipContent>
		</Tooltip>
	);
}

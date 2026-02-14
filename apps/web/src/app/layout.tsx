import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../index.css";
import { Analytics } from "@vercel/analytics/next";
import Providers from "@/components/providers";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Wavmo Playground - AI Writing Agent",
	description:
		"It's a playground for experimenting with the Wavmo AI Writing Agent. Try it out and see how it works by generating a document.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} bg-primary-foreground antialiased`}
			>
				<Providers>{children}</Providers>
				<Analytics />
			</body>
		</html>
	);
}

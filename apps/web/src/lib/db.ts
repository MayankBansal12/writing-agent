import Dexie, { type Table } from "dexie";
import { welcomeText } from "@/lib/constants/welcome-text";

export type PersistedChatMessage = {
	id: string;
	content: string;
	role: "user" | "assistant";
	stateData?: unknown;
	canReviewDiff?: boolean;
};

type DocumentRow = {
	id: "current";
	content: string;
	updatedAt: number;
};

type ChatRow = {
	id: "current";
	messages: PersistedChatMessage[];
	updatedAt: number;
};

class WavmoDB extends Dexie {
	document!: Table<DocumentRow, "current">;
	chat!: Table<ChatRow, "current">;

	constructor() {
		super("wavmo");
		this.version(1).stores({
			document: "id",
			chat: "id",
		});
	}
}

let _db: WavmoDB | null = null;

function getDB(): WavmoDB {
	if (typeof window === "undefined") {
		throw new Error("WavmoDB is only available in the browser");
	}
	if (!_db) {
		_db = new WavmoDB();
	}
	return _db;
}

const DOCUMENT_ID = "current" as const;
const CHAT_ID = "current" as const;

export async function loadDocument(): Promise<string | undefined> {
	const row = await getDB().document.get(DOCUMENT_ID);
	return row?.content;
}

export async function saveDocument(content: string): Promise<void> {
	await getDB().document.put({
		id: DOCUMENT_ID,
		content,
		updatedAt: Date.now(),
	});
}

export async function loadChat(): Promise<PersistedChatMessage[] | undefined> {
	const row = await getDB().chat.get(CHAT_ID);
	return row?.messages;
}

export async function saveChat(
	messages: PersistedChatMessage[],
): Promise<void> {
	await getDB().chat.put({
		id: CHAT_ID,
		messages,
		updatedAt: Date.now(),
	});
}

let seeded = false;
export async function ensureSeeded(): Promise<void> {
	if (seeded) return;
	const db = getDB();
	const [doc, chat] = await Promise.all([
		db.document.get(DOCUMENT_ID),
		db.chat.get(CHAT_ID),
	]);
	const now = Date.now();
	const needDoc = !doc;
	const needChat = !chat;
	if (needDoc || needChat) {
		await db.transaction("rw", db.document, db.chat, async () => {
			if (needDoc) {
				await db.document.put({
					id: DOCUMENT_ID,
					content: welcomeText,
					updatedAt: now,
				});
			}
			if (needChat) {
				await db.chat.put({
					id: CHAT_ID,
					messages: [],
					updatedAt: now,
				});
			}
		});
	}
	seeded = true;
}

import Redis from "ioredis";

let client: Redis | null = null;

export const getRedis = (): Redis => {
	if (client) return client;
	const url = process.env.REDIS_URL;
	if (!url) {
		throw new Error("REDIS_URL is not set");
	}
	client = new Redis(url, {
		lazyConnect: false,
		maxRetriesPerRequest: 3,
		enableReadyCheck: true,
	});
	return client;
};

export const closeRedis = async (): Promise<void> => {
	if (!client) return;
	await client.quit();
	client = null;
};

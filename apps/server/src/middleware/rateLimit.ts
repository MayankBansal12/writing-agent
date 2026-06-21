import type { FastifyReply, FastifyRequest } from "fastify";
import type { Redis } from "ioredis";
import { getClientIp } from "../lib/clientIp";
import { getRedis } from "../lib/redis";

export interface RateLimitOptions {
	defaultLimit: number;
	windowSeconds: number;
	bypassDefaultLimit: number;
}

const BYPASS_SET_KEY = "rl:bypass:ips";
const bypassLimitKey = (ip: string) => `rl:bypass:limit:${ip}`;
const rateKey = (ip: string) => `rl:ip:${ip}`;

const SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local existing = redis.call('GET', key)
if existing then
  local data = cjson.decode(existing)
  local windowStart = tonumber(data.windowStart)
  if (now - windowStart) < windowMs then
    data.count = tonumber(data.count) + 1
    redis.call('SET', key, cjson.encode(data), 'KEEPTTL')
    return {data.count, windowStart}
  end
end

local payload = cjson.encode({count = 1, windowStart = now})
redis.call('SET', key, payload, 'EX', math.ceil(windowMs / 1000))
return {1, now}
`;

const SCRIPT_SHA = "rl_incr_v1";

const loadScript = async (redis: Redis): Promise<string> => {
	try {
		await redis.evalsha(SCRIPT_SHA, 0);
	} catch {
		await redis.script("LOAD", SCRIPT);
	}
	return SCRIPT_SHA;
};

const resolveLimit = async (
	redis: Redis,
	ip: string,
	opts: RateLimitOptions,
): Promise<number> => {
	const isBypass = await redis.sismember(BYPASS_SET_KEY, ip);
	if (!isBypass) return opts.defaultLimit;
	const custom = await redis.get(bypassLimitKey(ip));
	if (custom) {
		const n = Number.parseInt(custom, 10);
		if (Number.isFinite(n) && n > 0) return n;
	}
	return opts.bypassDefaultLimit;
};

export interface RateLimitInfo {
	limit: number;
	remaining: number;
	resetAt: number;
	allowed: boolean;
}

const evaluate = async (
	redis: Redis,
	ip: string,
	opts: RateLimitOptions,
): Promise<RateLimitInfo> => {
	const limit = await resolveLimit(redis, ip, opts);
	const now = Date.now();
	const windowMs = opts.windowSeconds * 1000;
	const key = rateKey(ip);
	const sha = await loadScript(redis);
	const result = (await redis.evalsha(
		sha,
		1,
		key,
		String(now),
		String(windowMs),
		String(limit),
	)) as [number, number];
	const [count, windowStart] = result;
	const allowed = count <= limit;
	return {
		limit,
		remaining: Math.max(0, limit - count),
		resetAt: windowStart + windowMs,
		allowed,
	};
};

export const peekRateLimit = async (
	redis: Redis,
	ip: string,
	opts: RateLimitOptions,
): Promise<RateLimitInfo> => {
	const limit = await resolveLimit(redis, ip, opts);
	const now = Date.now();
	const windowMs = opts.windowSeconds * 1000;
	const key = rateKey(ip);
	const existing = await redis.get(key);
	if (!existing) {
		return {
			limit,
			remaining: limit,
			resetAt: now + windowMs,
			allowed: true,
		};
	}
	try {
		const data = JSON.parse(existing) as {
			count?: number;
			windowStart?: number;
		};
		const count = typeof data.count === "number" ? data.count : 0;
		const windowStart =
			typeof data.windowStart === "number" ? data.windowStart : now;
		if (now - windowStart >= windowMs) {
			return {
				limit,
				remaining: limit,
				resetAt: now + windowMs,
				allowed: true,
			};
		}
		return {
			limit,
			remaining: Math.max(0, limit - count),
			resetAt: windowStart + windowMs,
			allowed: count <= limit,
		};
	} catch {
		return {
			limit,
			remaining: limit,
			resetAt: now + windowMs,
			allowed: true,
		};
	}
};

const failClosed = (reply: FastifyReply): void => {
	reply.status(503).send({
		error: "rate_limit_unavailable",
		message: "Rate limiting is temporarily unavailable. Please retry shortly.",
	});
};

export const buildRateLimit = (opts: RateLimitOptions) => {
	return async function rateLimit(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> {
		let redis: Redis;
		try {
			redis = getRedis();
		} catch (error) {
			request.log.error(
				{ err: error },
				"rate limiter: REDIS_URL missing, failing closed",
			);
			failClosed(reply);
			return;
		}

		const ip = getClientIp(request);
		let info: RateLimitInfo;
		try {
			info = await evaluate(redis, ip, opts);
		} catch (error) {
			request.log.error({ err: error, ip }, "rate limiter: redis error");
			failClosed(reply);
			return;
		}

		reply.header("X-RateLimit-Limit", String(info.limit));
		reply.header("X-RateLimit-Remaining", String(info.remaining));
		reply.header("X-RateLimit-Reset", String(Math.floor(info.resetAt / 1000)));

		if (!info.allowed) {
			const retryAfter = Math.max(
				1,
				Math.ceil((info.resetAt - Date.now()) / 1000),
			);
			reply.header("Retry-After", String(retryAfter));
			request.log.warn(
				{ ip, count: info.limit - info.remaining, limit: info.limit },
				"rate limit exceeded",
			);
			reply.status(429).send({
				error: "rate_limit_exceeded",
				limit: info.limit,
				remaining: 0,
				resetAt: new Date(info.resetAt).toISOString(),
			});
			return;
		}
	};
};

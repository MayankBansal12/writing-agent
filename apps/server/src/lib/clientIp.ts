import type { FastifyRequest } from "fastify";

const FORWARDED_HEADER = "x-forwarded-for";

export const getClientIp = (request: FastifyRequest): string => {
	const forwarded = request.headers[FORWARDED_HEADER];
	if (typeof forwarded === "string" && forwarded.length > 0) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	if (Array.isArray(forwarded) && forwarded.length > 0) {
		const first = forwarded[0]?.split(",")[0]?.trim();
		if (first) return first;
	}
	return request.ip || "unknown";
};

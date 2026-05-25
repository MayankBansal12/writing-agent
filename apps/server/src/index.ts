import fastifyCors from "@fastify/cors";
import "dotenv/config";
import Fastify from "fastify";
import { fastifyPlugin } from "inngest/fastify";
import { agentRunFunction, inngestClient } from "./inngest";
import { runWritingWorkflow } from "./network";

const baseCorsConfig = {
	origin: process.env.CORS_ORIGIN || "",
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	credentials: true,
	maxAge: 86400,
};

const fastify = Fastify({
	logger: true,
});

fastify.register(fastifyCors, baseCorsConfig);

fastify.register(fastifyPlugin, {
	client: inngestClient,
	functions: [agentRunFunction],
});

fastify.post("/api/chat", async (request, reply) => {
	try {
		const { userPrompt, currentDocument } = request.body as {
			userPrompt: string;
			currentDocument?: string;
		};
		if (!userPrompt) {
			return reply.status(400).send({
				error: "userPrompt is required",
			});
		}

		const agentResponse = await runWritingWorkflow(userPrompt, currentDocument);
		if (!agentResponse) {
			return reply.status(500).send({
				error: "",
			});
		}

		return agentResponse;
	} catch (error) {
		fastify.log.error(error);
		return reply.status(500).send({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

fastify.get("/health", async () => {
	return "Server is healthy!";
});

const host = "RENDER" in process.env ? "0.0.0.0" : "localhost";
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 8000;
fastify.listen({ host, port: PORT }, (err, address) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});

// const server = createServer({
// 	networks: [writingNetwork],
// });

// server.listen(3010, () => console.log("Agent kit running!"));

import type { FastifyRequest, FastifyReply } from "fastify";

const API_TOKEN = process.env.API_TOKEN || "";

export async function bearerAuth(req: FastifyRequest, reply: FastifyReply) {
  // libera preflight/CORS e health
  if (req.method === "OPTIONS" || req.url.startsWith("/health")) return;

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = auth.slice("Bearer ".length);
  if (!API_TOKEN || token !== API_TOKEN) {
    return reply.code(401).send({ error: "Invalid token" });
  }
}

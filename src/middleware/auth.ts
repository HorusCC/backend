import { FastifyReply, FastifyRequest } from "fastify";

export async function bearerAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers["authorization"];
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return reply.status(401).send({ error: "Missing bearer token" });
  }

  const expected = process.env.API_TOKEN;
  if (!expected) {
    // se esquecer de setar o token no .env, trate como bloqueado
    req.log.warn("[auth] API_TOKEN não definido");
    return reply.status(500).send({ error: "Auth misconfigured" });
  }

  if (token !== expected) {
    return reply.status(403).send({ error: "Invalid token" });
  }
}

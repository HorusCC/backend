// src/routes/routesSmartwatch.ts
import { FastifyInstance, FastifyPluginOptions } from "fastify";

type SmartwatchMetrics = {
  calories: number;
  steps: number;
};

export async function smartwatchRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // GET /api/smartwatch/metrics
  app.get("/smartwatch/metrics", async (_request, reply) => {
    // 🔴 Por enquanto é um valor fixo (mock do lado do backend).
    // O frontend JÁ NÃO tem mock, está consumindo de verdade essa API.
    // Depois você pode trocar isso por dados do banco ou de uma integração real.
    const data: SmartwatchMetrics = {
      calories: 245.3,
      steps: 5632,
    };

    return reply.send(data);
  });
}

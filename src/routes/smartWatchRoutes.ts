import { FastifyInstance } from "fastify";
import { getTodayGoogleFitMetrics } from "../services/googleFitService";

export async function smartwatchRoutes(app: FastifyInstance) {
  app.get("/smartwatch/metrics", async (_request, reply) => {
    try {
      const metrics = await getTodayGoogleFitMetrics();

      return reply.send({
        steps: metrics.steps,
        calories: metrics.calories,
      });
    } catch (error: any) {
      console.error(
        "[Smartwatch] Erro ao buscar métricas:",
        error?.response?.data || error?.message || error
      );

      return reply.status(500).send({
        message: "Erro ao buscar dados do smartwatch",
      });
    }
  });
}

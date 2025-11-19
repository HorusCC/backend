import { FastifyInstance } from "fastify";
import { getTodayGoogleFitMetrics } from "../services/googleFitService";

export async function smartwatchRoutes(app: FastifyInstance) {
  app.get("/metrics", async (_request, reply) => {
    try {
      const metrics = await getTodayGoogleFitMetrics();

      return reply.send({
        ok: true,
        steps: metrics.steps,
        calories: metrics.calories,
      });
    } catch (error: any) {
      const detail =
        error?.response?.data || error?.message || JSON.stringify(error);

      console.error("[Smartwatch] Erro ao buscar métricas:", detail);

      // ⚠️ SÓ PARA DEBUG! depois tira esse "detail" da resposta.
      return reply.status(500).send({
        message: "Erro ao buscar dados do smartwatch",
        detail,
      });
    }
  });
}

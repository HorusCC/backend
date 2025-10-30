import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";

import { CreateNutritionController } from "../controllers/CreateNutritionController.js";

export async function routes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // rota de teste
  fastify.get("/teste", (request: FastifyRequest, reply: FastifyReply) => {
    const responseText = `
      \`\`\`json
      {
        "nome": "Lorenzzo",
        "sexo": "Masculino",
        "idade": 21,
        "altura": 175,
        "peso": 66,
        "objetivo": "Engordar"
      }
      \`\`\`
    `;

    try {
      // limpa as marcações de código (```json ... ```)
      const jsonString = responseText
        .replace(/```\w*\n/g, "")
        .replace(/```/g, "")
        .trim();

      const jsonObject = JSON.parse(jsonString);

      return reply.send({ data: jsonObject });
    } catch (error) {
      console.error("Erro ao processar a resposta de teste:", error);
      return reply.status(500).send({ error: "Erro ao processar JSON" });
    }
  });

  // rota principal de criação
  fastify.post(
    "/create",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return new CreateNutritionController().handle(request, reply);
    }
  );
}

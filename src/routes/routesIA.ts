import fastify, {
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
  fastify.get("/teste", (request: FastifyRequest, reply: FastifyReply) => {
    let responseText =
      '```json\n{\n  "nome": "Lorenzzo",\n  "sexo": "Masculino",\n  "idade": 21,\n  "altura": 175,\n  "peso": 66,\n  "objetivo": "Engordar",\n  "refeicoes": [\n    {\n      "horario": "7:00",\n      "nome": "Primeira refeicao",\n      "alimentos": [\n        "3 ovos inteiros com 2 fatias de queijo prato",\n        "1 copo (200ml) de leite integral",\n        "1 fatia de pão integral com 1 colher de sopa de pasta de amendoim"\n      ]\n    },\n    {\n      "horario": "10:00",\n      "nome": "Lanche da manha",\n      "alimentos": [\n        "1 banana com 1 colher de sopa de pasta de amendoim",\n        "1 copo (200ml) de iogurte integral"\n      ]\n    },\n    {\n      "horario": "13:00",\n      "nome": "Segunda refeicao",\n      "alimentos": [\n        "200g de arroz branco",\n        "200g de carne vermelha (frango ou peixe)",\n        "Salada a vontade (alface, tomate, pepino)",\n        "1 colher de sopa de azeite"\n      ]\n    },\n    {\n      "horario": "16:00",\n      "nome": "Lanche da tarde",\n      "alimentos": [\n        "1 copo (200ml) de leite integral com 2 colheres de sopa de achocolatado integral",\n        "2 biscoitos integrais com 1 colher de sopa de requeijao"\n      ]\n    },\n    {\n      "horario": "19:00",\n      "nome": "Terceira refeicao",\n      "alimentos": [\n        "200g de batata doce cozida",\n        "150g de carne branca (peito de frango grelhado)",\n        "Salada a vontade (alface, tomate, pepino)",\n        "1 colher de sopa de azeite"\n\n      ]\n    },\n    {\n      "horario": "21:00",\n      "nome": "Ceia",\n      "alimentos": [\n        "1 copo (200ml) de leite integral com 1 colher de sopa de mel"\n      ]\n    }\n  ],\n  "suplementos": [\n    "Creatina (5g ao dia)",\n    "Whey protein (30g apos o treino - caso inicie atividades fisicas)",\n    "Maltodextrina (opcional, para aumentar calorias)"\n  ],\n  "agua_diaria": "3 Litros"\n}\n```';

    try {
      let jsonString = responseText
        .replace(/```\w*\n/g, "")
        .replace(/```/g, "")
        .trim();

      const jsonObject = JSON.parse(jsonString);

      return reply.send({ data: jsonObject });
    } catch (error) {
      console.error("Erro ao processar a resposta de teste:", error);
    }

    reply.send({ ok: true });
  });

  fastify.post(
    "/create",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return new CreateNutritionController().handle(request, reply); // o new é usado porque a gente ta instanciando a classe
    }
  );
}

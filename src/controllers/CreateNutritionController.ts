import { FastifyRequest, FastifyReply } from "fastify";
import { CreateNutritionService } from "../services/CreateNutritionService.js";
export interface DataProps {
  name: string;
  email: string;
  password: string;
  age: string;
  weight: string;
  height: string;
  gender: string;
  level: string;
  objective: string;
}

class CreateNutritionController {
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const {
      name,
      email,
      password,
      age,
      weight,
      height,
      gender,
      level,
      objective,
    } = request.body as DataProps; // desestruturando o body, pegando os dados que vieram na requisição e tipando com a interface DataProps

    console.log("Rota foi chamada!");

    const createNutritionService = new CreateNutritionService();
    const result = await createNutritionService.execute({
      name,
      email,
      password,
      age,
      weight,
      height,
      gender,
      level,
      objective,
    });

    reply.send(result);
  }
}

export { CreateNutritionController };

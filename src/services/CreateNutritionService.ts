import { DataProps } from "../controllers/CreateNutritionController";
import { GoogleGenerativeAI } from "@google/generative-ai";

class CreateNutritionService {
  async execute({
    name,
    email,
    password,
    age,
    weight,
    height,
    gender,
    level,
    objective,
  }: DataProps) {
    console.log("Service foi chamado!");

    try {
      const genAI = new GoogleGenerativeAI(process.env.API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const response = await model.generateContent(
        `Crie uma dieta completa para uma pessoa com nome: ${name} do sexo ${gender} com peso atual: ${weight}kg, altura: ${height}, idade: ${age} anos e com foco e objetivo em ${objective}, atualmente nível de atividade: ${level} e ignore qualquer outro parametro que não seja o(s) passado(s), retorne em json com as respectivas propriedades, propriedade nome ou nome da pessoa, propriedade sexo com sexo, propriedade idade, propriedade altura, propriedade peso, propriedade objetivo com o objetivo atual, propriedade refeicoes com uma array contendo dentro cada objeto sendo uma refeicao da dieta e dentro de cada refeicao a propriedade horario com horario da refeicao, propriedade nome com nome e a propriedade alimentos com array contendo os alimentos dessa refeicao e pode incluir uma propriedade como suplementos contendo array com sugestao de suplemento que é indicado para o sexo dessa pessoa e o objetivo dela e não retorne nenhuma observacao alem das passadas no prompt, retorne em json e nenhuma propriedade pode ter acento. (obs: especificando quantidade de água  diária el litros, e ao invés de café da manhã, almoço, jantar, pode usar termos como primeira refeição, segunda refeição, terceira refeição e assim por diante)`
      );

      console.log(JSON.stringify(response, null, 2)); // essa linha é para formatar o JSON de resposta, deixando ele mais legível, o null é para não substituir nada, e o 2 é para colocar 2 espaços de indentação

      if (response.response && response.response.candidates) {
        // o response.response serve para garantir que a propriedade response existe antes de tentar acessar candidates
        const jsonText = response.response.candidates[0]?.content?.parts[0]
          .text as string; // o ? serve para garantir que a propriedade candidates[0] existe antes de tentar acessar content, evitando erros

        let jsonString = jsonText
          .replace(/```\w*\n/g, "")
          .replace(/```/g, "")
          .trim();

        let jsonObject = JSON.parse(jsonString);

        return { data: jsonObject };
      }
    } catch (error) {
      console.error("Erro ao executar o serviço:", error);
      throw new Error("Erro ao executar o serviço"); //o throw new Error é para lançar um erro personalizado
    }

    return { message: "Service executado com sucesso!" };
  }
}

export { CreateNutritionService };

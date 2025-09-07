class CreateNutritionService {
  async execute() {
    console.log("Service foi chamado!");

    return { message: "Service executado com sucesso!" };
  }
}

export { CreateNutritionService };

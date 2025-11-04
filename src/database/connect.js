const mongoose = require("mongoose");

const connectToDatabase = async () => {
  await mongoose
    .connect(
      `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@horus.h6hesl4.mongodb.net/?retryWrites=true&w=majority&appName=Horus`
    )
    .then(() => console.log("Conectado com o banco de dados"))
    .catch((error) =>
      console.log("Erro ao conectar com o banco de dados: " + error)
    );
};

module.exports = connectToDatabase;

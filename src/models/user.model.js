const mongoose = require("mongoose");

// Valores salvos no banco (estáveis)
const GENDERS = ["masculino", "feminino"];
const ACTIVITY_LEVELS = [
  "sedentario",
  "levemente_ativo",
  "consideravelmente_ativo",
  "ativo_com_frequencia",
];
const OBJECTIVES = ["emagrecer", "manutencao", "ganhar_massa"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0 },
    height: { type: Number, required: true, min: 0 },

    email: {
      type: String,
      required: true,
      unique: true, // cria índice único
      index: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // não retorna a senha por padrão
    },

    // ---- NOVOS ENUMs ----
    gender: {
      type: String,
      enum: GENDERS,
      required: true,
      lowercase: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ACTIVITY_LEVELS,
      required: true,
      lowercase: true,
      trim: true,
    },
    objective: {
      type: String,
      enum: OBJECTIVES,
      required: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

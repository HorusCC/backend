import { Schema, model, type Model } from "mongoose";
import bcrypt from "bcryptjs";

/** enums estáveis */
export const GENDERS = ["masculino", "feminino"] as const;
export const ACTIVITY_LEVELS = [
  "sedentario",
  "levemente_ativo",
  "consideravelmente_ativo",
  "ativo_com_frequencia",
] as const;
export const OBJECTIVES = ["emagrecer", "manutencao", "ganhar_massa"] as const;

export type Gender = (typeof GENDERS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type Objective = (typeof OBJECTIVES)[number];

export interface User {
  name: string;
  age: number;
  weight: number;
  height: number;

  email: string;
  password: string; // é o hash salvo

  gender: Gender;
  level: ActivityLevel;
  objective: Objective;
}

export interface UserMethods {
  comparePassword(plain: string): Promise<boolean>;
}

export type UserModelType = Model<User, {}, UserMethods>;

const UserSchema = new Schema<User, UserModelType, UserMethods>(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0 },
    height: { type: Number, required: true, min: 0 },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // não retorna por padrão
    },

    gender: { type: String, enum: GENDERS, required: true, lowercase: true, trim: true },
    level: { type: String, enum: ACTIVITY_LEVELS, required: true, lowercase: true, trim: true },
    objective: { type: String, enum: OBJECTIVES, required: true, lowercase: true, trim: true },
  },
  { collection: "users", timestamps: true }
);

// hash antes de salvar se a senha foi alterada
UserSchema.pre("save", async function (next) {
  
  if (!this.isModified("password")) return next();
  
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// método de instância
UserSchema.method("comparePassword", function (plain: string) {
  
  return bcrypt.compare(plain, this.password);
});

export const UserModel = model<User, UserModelType>("User", UserSchema);

import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserModel = require(".././models/user.model.js");

function isObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// schema só para LOGIN
const loginSchema = {
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 1 },
    },
    required: ["email", "password"],
    additionalProperties: false,
  },
};

const GENDERS = ["masculino", "feminino"] as const;
const ACTIVITY_LEVELS = [
  "sedentario",
  "levemente_ativo",
  "consideravelmente_ativo",
  "ativo_com_frequencia",
] as const;
const OBJECTIVES = ["emagrecer", "manutencao", "ganhar_massa"] as const;

const userBaseProps = {
  name: { type: "string", minLength: 1 },
  age: { type: "number", minimum: 0 },
  weight: { type: "number", minimum: 0 },
  height: { type: "number", minimum: 0 },
  email: { type: "string", format: "email" },
  password: { type: "string", minLength: 6 },
  gender: { type: "string", enum: [...GENDERS] },
  level: { type: "string", enum: [...ACTIVITY_LEVELS] },
  objective: { type: "string", enum: [...OBJECTIVES] },
};

const createUserSchema = {
  body: {
    type: "object",
    properties: userBaseProps,
    required: [
      "name",
      "age",
      "weight",
      "height",
      "email",
      "password",
      "gender",
      "level",
      "objective",
    ],
    additionalProperties: false,
  },
};

const updateUserSchema = {
  params: {
    type: "object",
    properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
    required: ["id"],
  },
  body: {
    type: "object",
    properties: userBaseProps,
    additionalProperties: false,
    minProperties: 1,
  },
};

const idParamSchema = {
  params: {
    type: "object",
    properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
    required: ["id"],
  },
};

export async function userRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // LISTAR TODOS
  app.get("/users", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await UserModel.find({}).lean();
      return reply.status(200).send(users);
    } catch (error: any) {
      return reply
        .status(500)
        .send(`Erro ao buscar usuários: ${error.message}`);
    }
  });

  // BUSCAR POR ID
  app.get<{ Params: { id: string } }>(
    "/users/:id",
    { schema: idParamSchema },
    async (req, reply) => {
      try {
        const { id } = req.params;
        if (!isObjectId(id)) return reply.status(400).send("ID inválido");

        const user = await UserModel.findById(id);
        if (!user) return reply.status(404).send("Usuário não encontrado");

        return reply.status(200).send(user);
      } catch (error: any) {
        return reply
          .status(500)
          .send(`Erro ao buscar usuário: ${error.message}`);
      }
    }
  );

  // LOGIN (não cria usuário; só autentica)
  app.post(
    "/users/login",
    { schema: loginSchema },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password } = req.body as {
          email: string;
          password: string;
        };

        // password tem select:false no model → forçar a seleção
        const user: any = await UserModel.findOne({ email }).select(
          "+password"
        );
        if (!user)
          return reply.status(401).send({ message: "Credenciais inválidas" });

        const isHashed =
          typeof user.password === "string" && user.password.startsWith("$2");
        const ok = isHashed
          ? await bcrypt.compare(password, user.password)
          : password === user.password;

        if (!ok)
          return reply.status(401).send({ message: "Credenciais inválidas" });

        const { password: _p, ...safe } = user.toObject();
        return reply.status(200).send({ user: safe });
      } catch (error: any) {
        return reply
          .status(500)
          .send({ message: `Erro no login: ${error.message}` });
      }
    }
  );

  // CRIAR (cadastro)
  app.post(
    "/users",
    { schema: createUserSchema },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await UserModel.create(req.body);
        return reply.status(201).send(user);
      } catch (error: any) {
        if (error?.code === 11000) {
          return reply.status(409).send({ message: "Email já cadastrado" });
        }
        return reply
          .status(500)
          .send({ message: `Erro ao cadastrar usuário: ${error.message}` });
      }
    }
  );

  // ATUALIZAR
  app.patch<{ Params: { id: string } }>(
    "/users/:id",
    { schema: updateUserSchema },
    async (req, reply) => {
      try {
        const { id } = req.params;
        if (!isObjectId(id)) return reply.status(400).send("ID inválido");

        const user = await UserModel.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });

        if (!user) return reply.status(404).send("Usuário não encontrado");
        return reply.status(200).send(user);
      } catch (error: any) {
        return reply
          .status(500)
          .send(`Erro ao atualizar usuário: ${error.message}`);
      }
    }
  );

  // DELETAR
  app.delete<{ Params: { id: string } }>(
    "/users/:id",
    { schema: idParamSchema },
    async (req, reply) => {
      try {
        const { id } = req.params;
        if (!isObjectId(id)) return reply.status(400).send("ID inválido");

        const deleted = await UserModel.findByIdAndDelete(id);
        if (!deleted) return reply.status(404).send("Usuário não encontrado");

        return reply.status(200).send("Usuário deletado com sucesso");
      } catch (error: any) {
        return reply
          .status(500)
          .send(`Erro ao deletar usuário: ${error.message}`);
      }
    }
  );
}

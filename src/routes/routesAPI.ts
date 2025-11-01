// src/routes/routesAPI.ts
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserModel } from "../models/user.model.js";

function isObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------- JWT ----------
const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev-secret";
function signToken(payload: object, options?: SignOptions): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d", ...(options ?? {}) });
}

// ---------- Utils ----------
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- Schemas ----------
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
} as const;

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
} as const;

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
} as const;

const idParamSchema = {
  params: {
    type: "object",
    properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
    required: ["id"],
  },
} as const;

// ---------- Rotas ----------
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
      return reply.status(500).send(`Erro ao buscar usuários: ${error.message}`);
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
        return reply.status(500).send(`Erro ao buscar usuário: ${error.message}`);
      }
    }
  );

  // LOGIN — tenta em todas as contas iguais (case-insensitive), sem risco de senha dupla-hash
  app.post(
    "/users/login",
    { schema: loginSchema },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const raw = req.body as { email: string; password: string };
        const email = String(raw.email ?? "").trim().toLowerCase();
        const password = String(raw.password ?? "");

        if (!email || !password) {
          return reply
            .status(400)
            .send({ message: "Email e senha são obrigatórios" });
        }

        const rx = new RegExp(`^${escapeRegExp(email)}$`, "i");
        const candidates: any[] = await UserModel.find({ email: rx })
          .select("+password createdAt")
          .sort({ createdAt: -1 })
          .lean(false);

        if (!candidates.length) {
          req.log.warn({ email }, "login: usuário não encontrado");
          return reply.status(401).send({ message: "Credenciais inválidas" });
        }

        let matched: any = null;
        for (const u of candidates) {
          const stored = String(u.password ?? "");
          const isHashed = stored.startsWith("$2");
          const ok = isHashed
            ? await bcrypt.compare(password, stored)
            : password === stored;

          if (ok) {
            matched = u;

            // migração opcional: se estava em texto puro, rehash agora
            if (!isHashed) {
              try {
                const salt = await bcrypt.genSalt(10);
                u.password = await bcrypt.hash(password, salt);
                await u.save();
                req.log.info({ uid: u._id }, "login: senha migrada para hash");
              } catch (e) {
                req.log.warn({ uid: u._id }, "login: falha ao migrar senha");
              }
            }
            break;
          }
        }

        if (!matched) {
          req.log.warn(
            { email, count: candidates.length },
            "login: senha incorreta (nenhum candidato bateu)"
          );
          return reply.status(401).send({ message: "Credenciais inválidas" });
        }

        const token = signToken({
          sub: matched._id.toString(),
          email: matched.email,
        });
        const { password: _p, ...safe } = matched.toObject();

        req.log.info({ uid: matched._id }, "login: sucesso");
        return reply.status(200).send({ token, user: safe });
      } catch (error: any) {
        req.log.error(error, "login: erro inesperado");
        return reply
          .status(500)
          .send({ message: `Erro no login: ${error.message}` });
      }
    }
  );

  // CADASTRO — **sem hashing na rota** (deixe o model fazer, se existir hook)
  app.post(
    "/users",
    { schema: createUserSchema },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = req.body as any;

        // normaliza email
        payload.email = String(payload.email ?? "").trim().toLowerCase();

        // NÃO fazer hash aqui: evita duplo-hash se o model também hashear
        const user = await UserModel.create(payload);
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

  // ATUALIZAR — **sem hashing na rota**
  app.patch<{ Params: { id: string } }>(
    "/users/:id",
    { schema: updateUserSchema },
    async (req, reply) => {
      try {
        const { id } = req.params;
        if (!isObjectId(id)) return reply.status(400).send("ID inválido");

        const body = req.body as Partial<typeof UserModel.schema.obj>;
        if ((body as any).email)
          (body as any).email = String((body as any).email).trim().toLowerCase();

        const user = await UserModel.findByIdAndUpdate(id, body, {
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

  // ---------- (opcional) endpoint de debug temporário ----------
  // Lista quantos candidatos existem para um email (sem expor senha)
  app.get(
    "/_dbg/users-by-email",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const email = String((req.query as any)?.email ?? "").trim().toLowerCase();
      if (!email) return reply.send({ email, count: 0, items: [] });

      const rx = new RegExp(`^${escapeRegExp(email)}$`, "i");
      const items = await UserModel.find({ email: rx })
        .select("email createdAt updatedAt")
        .sort({ createdAt: -1 })
        .lean();

      return reply.send({ email, count: items.length, items });
    }
  );
}

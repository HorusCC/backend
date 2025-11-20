import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

const UserModel = require(".././models/user.model.js");

function isObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

const resetPasswordSchema = {
  body: {
    type: "object",
    properties: {
      token: { type: "string", minLength: 10 },
      password: { type: "string", minLength: 6 },
    },
    required: ["token", "password"],
    additionalProperties: false,
  },
};

const forgotSchema = {
  body: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
      },
    },
    required: ["email"],
    additionalProperties: false,
  },
};

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

  // 🔹 Esqueci a senha (envio do email)
  app.post(
    "/users/forgot-password",
    { schema: forgotSchema },
    async (req, reply) => {
      try {
        const { email } = req.body as { email: string };
        const emailClean = email.trim().toLowerCase();

        const user = await UserModel.findOne({ email: emailClean });

        if (!user) {
          return reply.status(200).send({
            message:
              "Se o email existir em nossa base, enviamos um link de redefinição.",
          });
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.resetToken = token;
        user.resetTokenExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const baseUrl =
          process.env.FRONTEND_URL ?? "https://backendtcc-iikl.onrender.com";

        const resetLink = `${baseUrl}/api/reset-password?token=${token}`;

        await transporter.sendMail({
          from: '"Horus Nutrition" <no-reply@horus.com>',
          to: emailClean,
          subject: "Redefinição de senha - Horus Nutrition",
          html: `
          <h2>Redefinição de Senha</h2>
          <p>Você solicitou redefinir sua senha. Clique no link abaixo para criar uma nova:</p>
          <a href="${resetLink}">Redefinir Senha</a>
          <p>Esse link expira em 1 hora.</p>
        `,
        });

        return reply.status(200).send({
          message:
            "Se o email existir em nossa base, enviamos um link de redefinição.",
        });
      } catch (error: any) {
        console.error("Erro no forgot-password:", error);
        return reply.status(500).send({
          message: `Erro ao solicitar recuperação de senha: ${error.message}`,
        });
      }
    }
  );

  // 🔹 Página HTML de redefinição de senha (aberta pelo link do email)
  app.get("/reset-password", async (req, reply) => {
    const { token } = req.query as { token?: string };

    if (!token) {
      reply.header("content-type", "text/html; charset=utf-8");
      return reply.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Token inválido</title>
        </head>
        <body style="font-family: sans-serif; background:#111; color:#fff; text-align:center; padding:40px;">
          <h1>Link inválido</h1>
          <p>O link de redefinição é inválido ou está faltando o token.</p>
        </body>
      </html>
    `);
    }

    reply.header("content-type", "text/html; charset=utf-8");
    return reply.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Redefinir senha - Horus</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #00060E;
            color: #fff;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: #111827;
            padding: 24px;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          }
          h1 {
            font-size: 22px;
            margin-bottom: 16px;
            text-align: center;
          }
          label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
          }
          input {
            width: 95%;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #4B5563;
            margin-bottom: 12px;
            font-size: 16px;
          }
          button {
            width: 100%;
            padding: 10px 16px;
            border-radius: 8px;
            border: none;
            background: #0057C9;
            color: #fff;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
          }
          button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .message {
            margin-top: 12px;
            font-size: 14px;
            text-align: center;
          }
          .app-link {
            margin-top: 16px;
            text-align: center;
          }
          .app-link a {
            color: #60A5FA;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Redefinir senha</h1>
          <p style="font-size:14px;margin-bottom:16px;">Digite sua nova senha abaixo.</p>
          <label for="password">Nova senha</label>
          <input id="password" type="password" placeholder="Nova senha" />
          <label for="confirm">Confirmar senha</label>
          <input id="confirm" type="password" placeholder="Confirmar senha" />
          <button id="btn">Salvar nova senha</button>
          <div class="message" id="msg"></div>

          <!-- Link opcional para voltar para o app -->
          <div class="app-link" id="appLink" style="display:none;">
            <a href="#">Voltar para o app</a>
          </div>
        </div>

        <script>
          const params = new URLSearchParams(window.location.search);
          const token = params.get("token");
          const btn = document.getElementById("btn");
          const msg = document.getElementById("msg");
          const appLink = document.getElementById("appLink");

          if (!token) {
            msg.textContent = "Token inválido.";
            msg.style.color = "#F87171";
            btn.disabled = true;
          }

          btn.addEventListener("click", async () => {
            const pass = (document.getElementById("password")).value;
            const confirm = (document.getElementById("confirm")).value;

            if (!pass || !confirm) {
              msg.textContent = "Preencha todos os campos.";
              msg.style.color = "#FBBF24";
              return;
            }
            if (pass !== confirm) {
              msg.textContent = "As senhas não conferem.";
              msg.style.color = "#F87171";
              return;
            }
            if (pass.length < 6) {
              msg.textContent = "A senha deve ter pelo menos 6 caracteres.";
              msg.style.color = "#FBBF24";
              return;
            }

            btn.disabled = true;
            msg.textContent = "Enviando...";
            msg.style.color = "#9CA3AF";

            try {
              const resp = await fetch("/api/users/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: pass })
              });

              const data = await resp.json();

              if (!resp.ok) {
                msg.textContent = data.message || "Erro ao redefinir senha.";
                msg.style.color = "#F87171";
                btn.disabled = false;
                return;
              }

              msg.textContent = data.message || "Senha redefinida com sucesso!";
              msg.style.color = "#10B981";

              // só mostra o link se ele existir
              if (appLink) {
                appLink.style.display = "block";
              }
            } catch (e) {
              msg.textContent = "Erro de conexão. Tente novamente.";
              msg.style.color = "#F87171";
              btn.disabled = false;
            }
          });
        </script>
      </body>
    </html>
  `);
  });

  // 🔹 Rota que realmente troca a senha
  app.post(
    "/users/reset-password",
    { schema: resetPasswordSchema },
    async (req, reply) => {
      try {
        const { token, password } = req.body as {
          token: string;
          password: string;
        };

        const user: any = await UserModel.findOne({
          resetToken: token,
          resetTokenExpires: { $gt: Date.now() },
        });

        if (!user) {
          return reply
            .status(400)
            .send({ message: "Token inválido ou expirado" });
        }

        // aqui você pode usar bcrypt se quiser hashear a senha
        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;

        await user.save();

        return reply
          .status(200)
          .send({ message: "Senha redefinida com sucesso!" });
      } catch (error: any) {
        console.error("Erro no reset-password:", error);
        return reply.status(500).send({
          message: `Erro ao redefinir senha: ${error.message}`,
        });
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

import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

import { routes as routesIA } from "./routes/routesIA";

import { userRoutes } from "./routes/routesAPI";

const app = Fastify({ logger: true });
dotenv.config();

app.setErrorHandler((error, request, reply) => {
  reply.code(400).send({ message: error.message });
});

const start = async () => {
  app.register(cors);

  app.register(routesIA, { prefix: "/ai" });
  app.register(userRoutes, { prefix: "/api" });

  try {
    await app.listen({ port: 3333, host: "0.0.0.0" });
    console.log(`✅ Servidor rodando em: http://localhost:3333`);
    console.log(`🤖 Rotas Gemini: http://localhost:3333/ai`);
    console.log(`📡 Rotas API: http://localhost:3333/api`);
  } catch (err) {
    console.log(err);
  }
};

start();

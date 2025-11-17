// src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

const connectDB = require("./database/connect");

import { routes as routesIA } from "./routes/routesIA";
import { userRoutes } from "./routes/routesAPI";

const app = Fastify({ logger: true });

dotenv.config();

app.setErrorHandler((error, _req, reply) => {
  reply.code(400).send({ message: error.message });
});

const start = async () => {
  await connectDB();

  app.register(cors);

  // IA
  app.register(routesIA, { prefix: "/ai" });

  // Suas rotas antigas de API
  app.register(userRoutes, { prefix: "/api" });

  const PORT = Number(process.env.PORT) || 8080;

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
};

start();

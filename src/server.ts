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

  app.register(routesIA, { prefix: "/ai" });
  app.register(userRoutes, { prefix: "/api" });

  await app.listen({ port: 8080, host: "0.0.0.0" });
  console.log("🚀 http://localhost:8080");
};

start();

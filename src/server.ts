import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { routes as routesIA } from "./routes/routesIA.js";
import { userRoutes } from "./routes/routesAPI.js";
import { bearerAuth } from "./middleware/auth.js";
import { metricsRoutes } from "./routes/metrics.js";

dotenv.config();

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MONGODB_URI = process.env.MONGODB_URI;

// saúde
app.get("/health", async () => ({ ok: true }));

/**
 * Auth global — libera OPTIONS, /health, login e cadastro.
 * Normaliza URL (remove query e barra final) pra evitar falsos bloqueios.
 */
app.addHook("onRequest", async (req, reply) => {
  if (req.method === "OPTIONS") return;
  if (req.url === "/health") return;

  const url = req.url.split("?")[0].replace(/\/+$/, "");

  // libera login e cadastro SEM token
  if (req.method === "POST" && (url === "/api/users/login" || url === "/api/users")) {
    return;
  }

  return bearerAuth(req, reply);
});

async function start() {
  try {
    await app.register(cors, {
      origin: CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });

    if (!MONGODB_URI) {
      app.log.warn("⚠️  MONGODB_URI não definido. Continuando sem MongoDB.");
    } else {
      await mongoose.connect(MONGODB_URI);
      app.log.info("[mongo] connected");
    }

    await app.register(routesIA, { prefix: "/ai" });
    await app.register(userRoutes, { prefix: "/api" });
    await app.register(metricsRoutes, { prefix: "/metrics" });

    await app.listen({ port: PORT, host: HOST });

    const base = `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`;
    app.log.info(`✅ Servidor:  ${base}`);
    app.log.info(`🤖 Rotas IA:  ${base}/ai`);
    app.log.info(`📡 Rotas API: ${base}/api`);
    app.log.info(`🔥 Métricas:  ${base}/metrics/daily`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

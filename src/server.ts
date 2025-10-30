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
 * Auth global — mas liberando:
 * - OPTIONS (preflight CORS)
 * - /health
 * - POST /api/users/login (não tem token ainda)
 */
app.addHook("onRequest", async (req, reply) => {
  if (req.method === "OPTIONS") return;
  if (req.url === "/health") return;
  if (req.method === "POST" && req.url === "/api/users/login") return;
  return bearerAuth(req, reply);
});

async function start() {
  try {
    // CORS
    await app.register(cors, {
      origin: CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });

    // Mongo
    if (!MONGODB_URI) {
      app.log.warn("⚠️  MONGODB_URI não definido. Continuando sem MongoDB.");
    } else {
      await mongoose.connect(MONGODB_URI);
      app.log.info("[mongo] connected");
    }

    // Rotas
    await app.register(routesIA, { prefix: "/ai" });
    await app.register(userRoutes, { prefix: "/api" });
    await app.register(metricsRoutes, { prefix: "/metrics" });

    // Start
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

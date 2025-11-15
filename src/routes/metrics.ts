import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Schema, model } from "mongoose";

interface DailyMetricDoc {
  date: string; // YYYY-MM-DD
  calories: number; // kcal gastas
}

const DailyMetricSchema = new Schema<DailyMetricDoc>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    calories: { type: Number, required: true, min: 0, default: 0 },
  },
  { collection: "daily_metrics", timestamps: true }
);

const DailyMetric = model<DailyMetricDoc>("DailyMetric", DailyMetricSchema);

async function getDaily(date: string) {
  const found = await DailyMetric.findOne({ date }).lean();
  return { date, calories: found?.calories ?? 0 };
}

async function upsertDaily(date: string, calories: number) {
  const updated = await DailyMetric.findOneAndUpdate(
    { date },
    { $set: { date, calories } },
    { upsert: true, new: true }
  ).lean();
  return { date: updated.date, calories: updated.calories };
}

type GetDailyReq = FastifyRequest<{ Querystring: { date: string } }>;
type UpsertDailyReq = FastifyRequest<{
  Body: { date: string; calories: number };
}>;

export async function metricsRoutes(app: FastifyInstance) {
  app.get("/daily", async (req: GetDailyReq, reply: FastifyReply) => {
    const date = String(req.query?.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.code(400).send({ error: "date must be YYYY-MM-DD" });
    }
    const data = await getDaily(date);
    return reply.send(data);
  });

  app.post("/daily", async (req: UpsertDailyReq, reply: FastifyReply) => {
    const { date, calories } = req.body ?? ({} as any);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return reply.code(400).send({ error: "date must be YYYY-MM-DD" });
    }
    const kcal = Number(calories);
    if (!Number.isFinite(kcal) || kcal < 0) {
      return reply
        .code(400)
        .send({ error: "calories must be a non-negative number" });
    }
    const data = await upsertDaily(String(date), kcal);
    return reply.send(data);
  });
}

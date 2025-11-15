import { DailyMetric } from "../models/DailyMetric.js";

export async function getDaily(date: string) {
  const found = await DailyMetric.findOne({ date }).lean();
  return { date, calories: found?.calories ?? 0 };
}

export async function upsertDaily(date: string, calories: number) {
  const updated = await DailyMetric.findOneAndUpdate(
    { date },
    { $set: { date, calories } },
    { upsert: true, new: true }
  ).lean();
  return { date: updated.date, calories: updated.calories };
}

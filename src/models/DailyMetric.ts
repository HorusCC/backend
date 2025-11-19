import { Schema, model } from "mongoose";

export interface DailyMetricDoc {
  date: string; // YYYY-MM-DD
  calories: number; // kcal gastas
  steps: number; // passos do dia
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
    steps: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    collection: "daily_metrics",
    timestamps: true,
  }
);

export const DailyMetric = model<DailyMetricDoc>(
  "DailyMetric",
  DailyMetricSchema
);

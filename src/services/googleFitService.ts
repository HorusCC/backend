// src/services/googleFitService.ts
import axios from "axios";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_AGGREGATE_URL =
  "https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate";

export type GoogleFitMetrics = {
  steps: number;
  calories: number;
};

/**
 * Usa o REFRESH_TOKEN para obter um ACCESS_TOKEN novo
 */
async function getAccessTokenFromRefreshToken(): Promise<string> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } =
    process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Credenciais do Google Fit não configuradas no .env");
  }

  const response = await axios.post(GOOGLE_TOKEN_URL, {
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  return response.data.access_token as string;
}

/**
 * Lê passos e calorias do dia atual (00:00 até agora) no Google Fit
 */
export async function getTodayGoogleFitMetrics(): Promise<GoogleFitMetrics> {
  const accessToken = await getAccessTokenFromRefreshToken();

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const startTimeMillis = startOfDay.getTime();
  const endTimeMillis = now.getTime();

  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.calories.expended" },
    ],
    bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
    startTimeMillis,
    endTimeMillis,
  };

  const response = await axios.post(GOOGLE_FIT_AGGREGATE_URL, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const buckets = response.data.bucket ?? [];

  let totalSteps = 0;
  let totalCalories = 0;

  for (const bucket of buckets) {
    const datasets = bucket.dataset ?? [];
    for (const ds of datasets) {
      const dataSourceId: string = ds.dataSourceId || "";
      const points = ds.point ?? [];

      for (const p of points) {
        if (dataSourceId.includes("step_count")) {
          const val = p.value?.[0]?.intVal ?? 0;
          totalSteps += val;
        } else if (dataSourceId.includes("calories.expended")) {
          const val = p.value?.[0]?.fpVal ?? 0;
          totalCalories += val;
        }
      }
    }
  }

  return {
    steps: Math.round(totalSteps),
    calories: Math.round(totalCalories),
  };
}

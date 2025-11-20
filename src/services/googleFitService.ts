// src/services/googleFitService.ts
import axios from "axios";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_AGGREGATE_URL =
  "https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate";

export type GoogleFitMetrics = {
  steps: number;
  calories: number; // TOTAL = ativa + BMR (quando disponível)
  caloriesActive: number; // só calorias de atividade
  caloriesBmr: number; // só BMR (pode ser 0 se não existir)
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
 * Monta o body da requisição de aggregate.
 * Se includeBmr = true, tenta trazer também o BMR usando o dataSourceId "merged".
 */
function buildAggregateBody(
  startTimeMillis: number,
  endTimeMillis: number,
  includeBmr: boolean
) {
  const aggregateBy: any[] = [
    { dataTypeName: "com.google.step_count.delta" },
    { dataTypeName: "com.google.calories.expended" },
  ];

  if (includeBmr) {
    // Tenta usar o dataSourceId padrão do BMR "merged"
    aggregateBy.push({
      dataSourceId:
        "derived:com.google.calories.bmr:com.google.android.gms:merged",
    });
  }

  return {
    aggregateBy,
    bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
    startTimeMillis,
    endTimeMillis,
  };
}

/**
 * Faz a chamada de aggregate, com opção de incluir ou não BMR.
 */
async function fetchAggregateData(accessToken: string, body: any) {
  const response = await axios.post(GOOGLE_FIT_AGGREGATE_URL, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

/**
 * Lê passos e calorias (ativas + BMR quando disponível) do dia atual.
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

  let data: any;

  // 1ª tentativa: com BMR
  try {
    const bodyWithBmr = buildAggregateBody(
      startTimeMillis,
      endTimeMillis,
      true
    );
    data = await fetchAggregateData(accessToken, bodyWithBmr);
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || "";
    console.error("[GoogleFit] Erro ao buscar com BMR:", msg);

    // Se o problema foi especificamente o BMR, tenta de novo sem ele.
    if (msg.includes("com.google.calories.bmr")) {
      const bodyWithoutBmr = buildAggregateBody(
        startTimeMillis,
        endTimeMillis,
        false
      );
      data = await fetchAggregateData(accessToken, bodyWithoutBmr);
    } else {
      // Erro diferente → repassa pra rota tratar
      throw err;
    }
  }

  const buckets = data?.bucket ?? [];

  let totalSteps = 0;
  let caloriesActive = 0;
  let caloriesBmr = 0;

  for (const bucket of buckets) {
    const datasets = bucket.dataset ?? [];

    for (const ds of datasets) {
      const dataSourceId: string = ds.dataSourceId || "";
      const points = ds.point ?? [];

      for (const p of points) {
        const val = p.value?.[0];
        if (!val) continue;

        if (dataSourceId.includes("step_count")) {
          totalSteps += val.intVal ?? 0;
        } else if (dataSourceId.includes("calories.expended")) {
          caloriesActive += val.fpVal ?? 0;
        } else if (dataSourceId.includes("calories.bmr")) {
          caloriesBmr += val.fpVal ?? 0;
        }
      }
    }
  }

  const dayMillis = 24 * 60 * 60 * 1000;
  const elapsedMillis = endTimeMillis - startTimeMillis;
  const dayFraction = Math.min(1, Math.max(0, elapsedMillis / dayMillis));

  const bmrUntilNow = caloriesBmr * dayFraction;

  const caloriesTotal = caloriesActive + bmrUntilNow;

  return {
    steps: Math.round(totalSteps),
    calories: Math.round(caloriesTotal),
    caloriesActive: Math.round(caloriesActive),
    caloriesBmr: Math.round(bmrUntilNow),
  };
}

import 'dotenv/config';

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  PORT: Number(process.env.PORT || 8080),
  API_TOKEN: required('API_TOKEN', process.env.API_TOKEN),
  MONGODB_URI: required('MONGODB_URI', process.env.MONGODB_URI),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

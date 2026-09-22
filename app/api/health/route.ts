import { kvEnabled, needsSharedStore } from "@/lib/kv";
import { sessionCount } from "@/lib/store";

/** Nombres de variables que suelen inyectar los distintos servicios de Redis. */
const KNOWN = [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "KV_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "REDIS_URL",
  "STORAGE_URL",
];

/**
 * Diagnóstico de la instalación. Dice si hay almacén compartido y qué variables
 * de entorno relacionadas existen, pero **solo sus nombres**: ningún valor ni
 * token sale de aquí.
 */
export async function GET() {
  return Response.json({
    ok: true,
    almacenCompartido: kvEnabled(),
    avisaEnPantalla: needsSharedStore(),
    serverless: Boolean(process.env.VERCEL ?? process.env.AWS_LAMBDA_FUNCTION_NAME),
    variablesDetectadas: KNOWN.filter((name) => Boolean(process.env[name])),
    salasEnMemoria: sessionCount(),
  });
}

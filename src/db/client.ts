import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

type DbEnvSource = {
  ZERO_UPSTREAM_DB?: string;
};

const DEFAULT_ZERO_UPSTREAM_DB =
  "postgres://postgres:postgres@127.0.0.1:5432/postgres";

const poolCache = new Map<string, Pool>();
const dbCache = new Map<string, ReturnType<typeof drizzle<typeof schema>>>();

function getConnectionString(env: DbEnvSource, allowDefaults: boolean): string {
  if (env.ZERO_UPSTREAM_DB) {
    return env.ZERO_UPSTREAM_DB;
  }

  if (allowDefaults) {
    return DEFAULT_ZERO_UPSTREAM_DB;
  }

  throw new Error("required env var ZERO_UPSTREAM_DB");
}

export function getPool(env: DbEnvSource, allowDefaults = false): Pool {
  const connectionString = getConnectionString(env, allowDefaults);
  const cached = poolCache.get(connectionString);
  if (cached) {
    return cached;
  }

  const pool = new Pool({
    connectionString,
    max: 5,
  });
  poolCache.set(connectionString, pool);
  return pool;
}

export function getDb(env: DbEnvSource, allowDefaults = false) {
  const connectionString = getConnectionString(env, allowDefaults);
  const cached = dbCache.get(connectionString);
  if (cached) {
    return cached;
  }

  const db = drizzle(getPool(env, allowDefaults), { schema });
  dbCache.set(connectionString, db);
  return db;
}

export const pool = getPool(process.env as DbEnvSource, true);
export const db = getDb(process.env as DbEnvSource, true);

export type DB = ReturnType<typeof getDb>;

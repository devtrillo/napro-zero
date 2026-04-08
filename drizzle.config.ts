import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.ZERO_UPSTREAM_DB ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: connectionString,
  },
});

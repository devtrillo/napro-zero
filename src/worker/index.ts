import { Hono } from "hono";
import { handleGetQueries } from "./get-queries.js";
import { handleMutate } from "./mutate.js";
import { getAppSession } from "./app-user.js";
import { createAuth } from "./auth.js";

const app = new Hono<{ Bindings: Env }>();

app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

app.get("/api/session", async (c) => {
  return c.json(await getAppSession(c));
});

app.post("/api/get-queries", async (c) => {
  const appSession = await getAppSession(c);
  if (!appSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json(await handleGetQueries(c, appSession.user.id));
});

app.post("/api/mutate", async (c) => {
  const appSession = await getAppSession(c);
  if (!appSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json(await handleMutate(c, appSession.user.id));
});

// Durable Object endpoint - trigger DO to start watching
app.get("/api/do/init", async (c) => {
  // Get or create a DO instance with a fixed ID
  const id = c.env.ZERO_DO.idFromName("/");
  const stub = c.env.ZERO_DO.get(id);

  // Call init to trigger the DO to start watching messages
  const doUrl = new URL(c.req.url);
  doUrl.pathname = "/init";

  return await stub.fetch(doUrl);
});

export default app;

// Export the Durable Object class
export { ZeroDO } from "./zero-do.js";

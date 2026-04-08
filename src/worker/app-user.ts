import type { Context as HonoContext } from "hono";
import type { AuthSession } from "./auth.js";
import { createAuth, getAuthDatabase } from "./auth.js";

export type AppUser = {
  id: string;
  name: string;
  partner: boolean;
};

export type AppSession = {
  appUser: AppUser;
  session: AuthSession["session"];
  user: AuthSession["user"];
};

function rowToAppUser(row: {
  id: string;
  name: string;
  partner: boolean;
}): AppUser {
  return {
    id: row.id,
    name: row.name,
    partner: row.partner,
  };
}

async function findOrCreateAppUser(env: Env, session: AuthSession): Promise<AppUser> {
  const pool = getAuthDatabase(env);
  const existing = await pool.query<{
    id: string;
    name: string;
    partner: boolean;
  }>(
    'SELECT id, name, partner FROM "user" WHERE auth_user_id = $1 LIMIT 1',
    [session.user.id]
  );

  if (existing.rowCount && existing.rows[0]) {
    const appUser = rowToAppUser(existing.rows[0]);
    if (appUser.name !== session.user.name) {
      await pool.query('UPDATE "user" SET name = $1 WHERE id = $2', [
        session.user.name,
        appUser.id,
      ]);
      appUser.name = session.user.name;
    }
    return appUser;
  }

  const created = await pool.query<{
    id: string;
    name: string;
    partner: boolean;
  }>(
    'INSERT INTO "user" (id, auth_user_id, name, partner) VALUES ($1, $2, $3, $4) RETURNING id, name, partner',
    [crypto.randomUUID(), session.user.id, session.user.name, false]
  );

  return rowToAppUser(created.rows[0]);
}

export async function getAppSession(c: HonoContext<{ Bindings: Env }>): Promise<AppSession | null> {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return null;
  }

  const appUser = await findOrCreateAppUser(c.env, session);
  return {
    appUser,
    session: session.session,
    user: session.user,
  };
}

import type { Context as HonoContext } from "hono";
import type { AppSession } from "../shared/auth.js";
import { createAuth } from "./auth.js";

export async function getAppSession(
	c: HonoContext<{ Bindings: Env }>,
): Promise<AppSession | null> {
	const auth = createAuth(c.env);
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		return null;
	}

	return {
		session: session.session,
		user: session.user,
	};
}

import { handleMutateRequest } from "@rocicorp/zero/server";
import { zeroDrizzle } from "@rocicorp/zero/server/adapters/drizzle";
import type { DrizzleDatabase } from "@rocicorp/zero/server/adapters/drizzle";
import type { Context } from "hono";
import { getDb } from "../db/client.js";
import { schema } from "../shared/schema.js";
import { mutators } from "../shared/mutators.js";
import { mustGetMutator } from "@rocicorp/zero";

export async function handleMutate(c: Context, userID: string) {
	const dbProvider = zeroDrizzle(
		schema,
		getDb(c.env) as unknown as DrizzleDatabase,
	);

	const ctx = { userID };

	return await handleMutateRequest(
		dbProvider,
		async (transact) => {
			return await transact(async (tx, name, args) => {
				const mutator = mustGetMutator(mutators, name);
				return await mutator.fn({ tx, ctx, args });
			});
		},
		c.req.raw,
	);
}

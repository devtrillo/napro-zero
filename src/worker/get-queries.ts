import { handleQueryRequest } from "@rocicorp/zero/server";
import { mustGetQuery } from "@rocicorp/zero";
import { queries } from "../shared/queries.js";
import { schema } from "../shared/schema.js";
import { Context } from "hono";

// Main handler for get-queries request
export async function handleGetQueries(c: Context, userID: string) {
	const ctx = { userID };

	return await handleQueryRequest(
		(name, args) => {
			const query = mustGetQuery(queries, name);
			return query.fn({ args, ctx });
		},
		schema,
		c.req.raw,
	);
}

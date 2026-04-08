import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const message = pgTable("message", {
	id: text("id").primaryKey(),
	senderId: text("sender_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	body: text("body").notNull(),
	timestamp: integer("timestamp").notNull(),
});

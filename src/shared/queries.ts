import { escapeLike, defineQueries, defineQuery } from "@rocicorp/zero";
import * as v from "valibot";
import { zql } from "./schema.js";

export const queries = defineQueries({
  users: defineQuery(() => {
    return zql.user;
  }),
  messages: defineQuery(() => {
    return zql.message.related("sender").orderBy("timestamp", "desc");
  }),
  filteredMessages: defineQuery(
    v.object({
      senderID: v.string(),
      body: v.string(),
    }),
    ({ args: { senderID, body } }) => {
      let query = zql.message.related("sender");

      if (senderID) {
        query = query.where("senderID", senderID);
      }

      if (body) {
        query = query.where("body", "LIKE", `%${escapeLike(body)}%`);
      }

      return query.orderBy("timestamp", "desc");
    }
  ),
});

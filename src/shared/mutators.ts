import { defineMutator, defineMutators } from "@rocicorp/zero";
import { must } from "./must";
import * as v from "valibot";

export const mutators = defineMutators({
  message: {
    create: defineMutator(
      v.object({
        id: v.string(),
        senderID: v.string(),
        body: v.string(),
        timestamp: v.number(),
      }),
      async ({ tx, args }) => {
        await tx.mutate.message.insert(args);
      }
    ),
    delete: defineMutator(
      v.object({
        id: v.string(),
      }),
      async ({ tx, args }) => {
        await tx.mutate.message.delete(args);
      }
    ),
    update: defineMutator(
      v.object({
        id: v.string(),
        body: v.string(),
      }),
      async ({ tx, args, ctx }) => {
        must(ctx?.userID, "Must be logged in");
        await tx.mutate.message.update(args);
      }
    ),
  },
});
